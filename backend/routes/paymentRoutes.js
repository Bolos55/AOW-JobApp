// backend/routes/paymentRoutes.js
import express from "express";
import crypto from "crypto";
import Payment from "../models/Payment.js";
import Job from "../models/Job.js";
import { authMiddleware } from "../middleware/auth.js";
import { auditLogMiddleware } from "../middleware/auditLog.js";
import { 
  generateQRCode, 
  verifyServiceFeePayment,
  verifyWebhookSignature,
  generateWebhookSignature
} from "../utils/paymentUtils.js";
import { calculateJobPricing, getCurrentTaxConfig, validateServiceFee } from "../utils/pricingUtils.js";

const router = express.Router();

// Helper function to get user ID
function getUserId(req) {
  return req.userId || (req.user && (req.user._id || req.user.id)) || null;
}

/**
 * POST /api/payments/create
 * สร้างการชำระค่าบริการแพลตฟอร์มสำหรับงาน
 */
router.post("/create", 
  authMiddleware, 
  auditLogMiddleware("SERVICE_FEE_CREATE", "PAYMENT"),
  async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "ไม่พบข้อมูลผู้ใช้" });
    }

    const { 
      jobId, 
      packageType = "standard", 
      boostFeatures = [],
      paymentMethod = "promptpay" 
    } = req.body;

    // ตรวจสอบว่างานมีอยู่จริงและเป็นของ user คนนี้
    const job = await Job.findOne({ _id: jobId, createdBy: userId });
    if (!job) {
      return res.status(404).json({ message: "ไม่พบงานหรือคุณไม่มีสิทธิ์" });
    }

    // ตรวจสอบว่างานยังไม่ได้ชำระค่าบริการ
    const existingPayment = await Payment.findOne({ 
      jobId, 
      status: { $in: ["pending", "paid"] } 
    });
    
    if (existingPayment) {
      return res.status(400).json({ 
        message: "งานนี้มีการชำระค่าบริการอยู่แล้ว",
        paymentId: existingPayment.paymentId,
        status: existingPayment.status
      });
    }

    // คำนวณค่าบริการด้วยระบบใหม่
    const taxConfig = getCurrentTaxConfig();
    const serviceFeeResult = calculateJobPricing(packageType, boostFeatures, {
      vatEnabled: taxConfig.vatEnabled,
      vatNumber: taxConfig.vatNumber
    });
    
    // Validate service fee calculation
    const validation = validateServiceFee(serviceFeeResult.feeBreakdown);
    if (!validation.isValid) {
      return res.status(400).json({ 
        message: "การคำนวณค่าบริการไม่ถูกต้อง",
        errors: validation.errors
      });
    }
    
    // สร้าง Payment record
    const paymentId = Payment.generatePaymentId();
    
    const payment = new Payment({
      paymentId,
      jobId,
      employerId: userId,
      serviceFee: serviceFeeResult.serviceFee, // ค่าบริการที่ต้องจ่าย
      paymentMethod,
      
      // Service Package Details
      servicePackage: {
        type: packageType,
        name: serviceFeeResult.servicePackage.name,
        duration: serviceFeeResult.servicePackage.duration,
        features: serviceFeeResult.servicePackage.features
      },
      
      // Additional Services
      additionalServices: serviceFeeResult.additionalServices.map(service => ({
        serviceId: service.id,
        serviceName: service.name,
        serviceFee: service.serviceFee,
        duration: service.duration,
        description: service.description
      })),
      
      // Service Fee Breakdown
      feeBreakdown: serviceFeeResult.feeBreakdown,
      
      // Legacy fields (เพื่อ backward compatibility)
      basePrice: serviceFeeResult.basePrice,
      boostPrice: serviceFeeResult.boostPrice,
      totalPrice: serviceFeeResult.totalPrice,
      packageType,
      boostFeatures,
      packageDuration: serviceFeeResult.duration,
      
      createdBy: userId,
      metadata: {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
        source: 'web',
        taxConfig: taxConfig, // เก็บ config ที่ใช้ตอนสร้าง
        platformVersion: '1.0'
      }
    });

    await payment.save();

    // สร้าง QR Code สำหรับ PromptPay
    if (paymentMethod === 'promptpay') {
      await payment.generateQRCode();
    }

    res.status(201).json({
      message: "สร้างการชำระค่าบริการเรียบร้อย",
      payment: {
        paymentId: payment.paymentId,
        serviceFee: payment.serviceFee,
        currency: payment.currency,
        paymentMethod: payment.paymentMethod,
        status: payment.status,
        expiresAt: payment.expiresAt,
        paymentUrl: payment.paymentUrl,
        qrCodeData: payment.qrCodeData,
        servicePackage: payment.servicePackage,
        additionalServices: payment.additionalServices,
        feeBreakdown: payment.feeBreakdown,
        serviceTerms: payment.serviceTerms
      }
    });

  } catch (err) {
    console.error("Service fee creation error:", err);
    res.status(500).json({ 
      message: "เกิดข้อผิดพลาดในการสร้างการชำระค่าบริการ",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

/**
 * GET /api/payments/:paymentId/status
 * ตรวจสอบสถานะการชำระค่าบริการ
 */
router.get("/:paymentId/status", 
  authMiddleware, 
  auditLogMiddleware("PAYMENT_STATUS_CHECK", "PAYMENT"),
  async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userId = getUserId(req);

    const payment = await Payment.findOne({ 
      paymentId, 
      employerId: userId 
    }).populate('jobId', 'title company');

    if (!payment) {
      return res.status(404).json({ message: "ไม่พบการชำระเงิน" });
    }

    // ถ้ายังไม่ได้ชำระและยังไม่หมดเวลา ให้ตรวจสอบอัตโนมัติ
    if (payment.status === "pending" && payment.expiresAt > new Date()) {
      try {
        const verificationResult = await verifyServiceFeePayment(payment);
        if (verificationResult.isPaid) {
          await payment.markAsPaid(verificationResult.gatewayData);
          
          // เปิดใช้งานงานทันที
          await Job.findByIdAndUpdate(payment.jobId, {
            isActive: true,
            isPaid: true,
            paidAt: new Date(),
            paymentId: payment.paymentId
          });
        }
      } catch (verifyError) {
        console.error("Payment verification error:", verifyError);
      }
    }

    res.json({
      paymentId: payment.paymentId,
      status: payment.status,
      amount: payment.amount,
      paidAt: payment.paidAt,
      expiresAt: payment.expiresAt,
      isAutoVerified: payment.isAutoVerified,
      job: {
        id: payment.jobId._id,
        title: payment.jobId.title,
        company: payment.jobId.company
      }
    });

  } catch (err) {
    console.error("Get payment status error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการตรวจสอบสถานะ" });
  }
});

/**
 * POST /api/payments/webhook
 * รับ webhook จาก payment gateway
 */
router.post("/webhook", async (req, res) => {
  try {
    const signature = req.headers['x-webhook-signature'];
    const rawBody = req.rawBody || JSON.stringify(req.body);
    const payload = req.body;

    // ✅ ตรวจสอบ webhook signature อย่างปลอดภัย
    const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('❌ PAYMENT_WEBHOOK_SECRET not configured');
      return res.status(500).json({ message: "Webhook secret not configured" });
    }

    if (!signature) {
      console.warn('❌ Missing webhook signature');
      return res.status(401).json({ message: "Missing webhook signature" });
    }

    // ✅ ใช้ secure verification function
    if (!verifyWebhookSignature(signature, rawBody, webhookSecret)) {
      console.warn('❌ Invalid webhook signature:', { signature, payloadLength: rawBody.length });
      return res.status(401).json({ message: "Invalid webhook signature" });
    }

    const { paymentId, status, amount, transactionId, gatewayData } = payload;

    const payment = await Payment.findOne({ paymentId });
    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    if (status === "paid" || status === "success") {
      // ชำระเงินสำเร็จ
      await payment.markAsPaid({
        transactionId,
        gatewayStatus: status,
        gatewayMessage: "Payment successful",
        rawResponse: gatewayData
      });

      // เปิดใช้งานงานทันที
      await Job.findByIdAndUpdate(payment.jobId, {
        isActive: true,
        isPaid: true,
        paidAt: new Date(),
        paymentId: payment.paymentId,
        packageType: payment.packageType,
        boostFeatures: payment.boostFeatures,
        expiresAt: new Date(Date.now() + payment.packageDuration * 24 * 60 * 60 * 1000)
      });

      console.log(`✅ Payment verified via webhook: ${paymentId}`);
      
    } else if (status === "failed" || status === "error") {
      // ชำระเงินไม่สำเร็จ
      await payment.markAsFailed(gatewayData?.message || "Payment failed");
      
      console.log(`❌ Payment failed via webhook: ${paymentId}`);
    }

    res.json({ message: "Webhook processed successfully" });

  } catch (err) {
    console.error("Webhook processing error:", err);
    res.status(500).json({ message: "Webhook processing failed" });
  }
});

/**
 * POST /api/payments/:paymentId/cancel
 * ยกเลิกการชำระเงิน
 */
router.post("/:paymentId/cancel", 
  authMiddleware, 
  auditLogMiddleware("PAYMENT_CANCEL", "PAYMENT"),
  async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userId = getUserId(req);
    const { reason = "ผู้ใช้ยกเลิกการชำระเงิน" } = req.body;

    const payment = await Payment.findOne({ 
      paymentId, 
      employerId: userId 
    }).populate('jobId', 'title company');

    if (!payment) {
      return res.status(404).json({ message: "ไม่พบการชำระเงิน" });
    }

    // ตรวจสอบว่าสามารถยกเลิกได้หรือไม่
    if (payment.status === "paid") {
      return res.status(400).json({ 
        message: "ไม่สามารถยกเลิกการชำระเงินที่ชำระแล้ว" 
      });
    }

    if (payment.status === "cancelled") {
      return res.status(400).json({ 
        message: "การชำระเงินนี้ถูกยกเลิกแล้ว" 
      });
    }

    // อัปเดตสถานะเป็น cancelled
    payment.status = "cancelled";
    payment.cancelledAt = new Date();
    payment.cancelReason = reason;
    payment.cancelledBy = userId;
    
    await payment.save();

    // ลบงานที่ยังไม่ได้ชำระเงิน (ถ้ามี)
    if (payment.jobId) {
      await Job.findByIdAndUpdate(payment.jobId, {
        isActive: false,
        isPaid: false,
        status: 'draft' // เปลี่ยนกลับเป็น draft
      });
    }

    console.log(`🚫 Payment cancelled: ${paymentId} by user ${userId}`);

    res.json({
      message: "ยกเลิกการชำระเงินเรียบร้อย",
      payment: {
        paymentId: payment.paymentId,
        status: payment.status,
        cancelledAt: payment.cancelledAt,
        cancelReason: payment.cancelReason,
        job: {
          id: payment.jobId._id,
          title: payment.jobId.title,
          company: payment.jobId.company
        }
      }
    });

  } catch (err) {
    console.error("Cancel payment error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการยกเลิกการชำระเงิน" });
  }
});

/**
 * GET /api/payments/my-payments
 * ดูประวัติการชำระเงินของตัวเอง
 */
router.get("/my-payments", authMiddleware, async (req, res) => {
  try {
    console.log("🔍 GET /api/payments/my-payments - Start");
    
    const userId = getUserId(req);
    console.log("🔍 User ID:", userId);
    
    const { page = 1, limit = 10, status } = req.query;
    console.log("🔍 Query params:", { page, limit, status });

    const filter = { employerId: userId };
    if (status) {
      filter.status = status;
    }
    console.log("🔍 Filter:", filter);

    const payments = await Payment.find(filter)
      .populate('jobId', 'title company')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    console.log("🔍 Found payments:", payments.length);

    const total = await Payment.countDocuments(filter);
    console.log("🔍 Total payments:", total);

    const response = {
      payments: payments.map(p => ({
        paymentId: p.paymentId,
        amount: p.amount,
        status: p.status,
        paymentMethod: p.paymentMethod,
        packageType: p.packageType,
        boostFeatures: p.boostFeatures,
        paidAt: p.paidAt,
        createdAt: p.createdAt,
        job: p.jobId ? {
          id: p.jobId._id,
          title: p.jobId.title,
          company: p.jobId.company
        } : null
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };

    console.log("🔍 Response:", JSON.stringify(response, null, 2));
    res.json(response);

  } catch (err) {
    console.error("❌ Get my payments error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงประวัติการชำระเงิน" });
  }
});

// ✅ REMOVED INSECURE HELPER FUNCTIONS
// Use secure implementations from paymentUtils.js instead

export default router;

/**
 * GET /api/payments/admin/all-payments
 * แอดมินดูรายการชำระเงินทั้งหมด
 */
router.get("/admin/all-payments", authMiddleware, async (req, res) => {
  try {
    console.log("🔍 GET /api/payments/admin/all-payments - Start");
    
    const userId = getUserId(req);
    const user = await import("../models/User.js").then(m => m.default.findById(userId));
    
    // ตรวจสอบว่าเป็น admin
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "ไม่มีสิทธิ์เข้าถึง - เฉพาะแอดมินเท่านั้น" });
    }
    
    const { page = 1, limit = 20, status, search } = req.query;
    console.log("🔍 Query params:", { page, limit, status, search });

    const filter = {};
    if (status && status !== "all") {
      // ถ้าเป็น failed ให้รวม failed, expired, cancelled
      if (status === "failed") {
        filter.status = { $in: ["failed", "expired", "cancelled"] };
      } else {
        filter.status = status;
      }
    }
    
    // ค้นหาจาก paymentId หรือ jobId
    if (search) {
      filter.$or = [
        { paymentId: { $regex: search, $options: "i" } }
      ];
    }
    
    console.log("🔍 Filter:", filter);

    const payments = await Payment.find(filter)
      .populate('jobId', 'title company jobCode')
      .populate('employerId', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    console.log("🔍 Found payments:", payments.length);

    const total = await Payment.countDocuments(filter);
    console.log("🔍 Total payments:", total);

    // สถิติ
    const stats = {
      total: await Payment.countDocuments(),
      pending: await Payment.countDocuments({ status: "pending" }),
      paid: await Payment.countDocuments({ status: "paid" }),
      failed: await Payment.countDocuments({ status: { $in: ["failed", "expired", "cancelled"] } }),
      totalRevenue: await Payment.aggregate([
        { $match: { status: "paid" } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]).then(result => result[0]?.total || 0)
    };

    const response = {
      payments: payments.map(p => ({
        _id: p._id,
        paymentId: p.paymentId,
        amount: p.amount,
        status: p.status,
        paymentMethod: p.paymentMethod,
        packageType: p.packageType,
        boostFeatures: p.boostFeatures,
        paidAt: p.paidAt,
        createdAt: p.createdAt,
        expiresAt: p.expiresAt,
        job: p.jobId ? {
          id: p.jobId._id,
          title: p.jobId.title,
          company: p.jobId.company,
          jobCode: p.jobId.jobCode
        } : null,
        employer: p.employerId ? {
          id: p.employerId._id,
          name: p.employerId.name,
          email: p.employerId.email
        } : null
      })),
      stats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };

    console.log("🔍 Response stats:", stats);
    res.json(response);

  } catch (err) {
    console.error("❌ Get all payments error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงรายการชำระเงิน" });
  }
});

/**
 * PATCH /api/payments/admin/:paymentId/status
 * แอดมินอัปเดตสถานะการชำระเงิน
 */
router.patch("/admin/:paymentId/status", authMiddleware, auditLogMiddleware("PAYMENT_STATUS_UPDATE", "PAYMENT"), async (req, res) => {
  try {
    const userId = getUserId(req);
    const user = await import("../models/User.js").then(m => m.default.findById(userId));
    
    // ตรวจสอบว่าเป็น admin
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "ไม่มีสิทธิ์เข้าถึง - เฉพาะแอดมินเท่านั้น" });
    }
    
    const { paymentId } = req.params;
    const { status, note } = req.body;
    
    if (!["pending", "paid", "failed", "expired", "cancelled"].includes(status)) {
      return res.status(400).json({ message: "สถานะไม่ถูกต้อง" });
    }
    
    const payment = await Payment.findOne({ paymentId });
    if (!payment) {
      return res.status(404).json({ message: "ไม่พบรายการชำระเงิน" });
    }
    
    const oldStatus = payment.status;
    payment.status = status;
    
    if (status === "paid" && !payment.paidAt) {
      payment.paidAt = new Date();
      
      // อัปเดตงานให้เป็น paid
      if (payment.jobId) {
        await Job.findByIdAndUpdate(payment.jobId, {
          isPaid: true,
          packageType: payment.packageType,
          boostFeatures: payment.boostFeatures
        });
      }
    }
    
    // เพิ่ม note ถ้ามี
    if (note) {
      if (!payment.adminNotes) payment.adminNotes = [];
      payment.adminNotes.push({
        note,
        by: userId,
        at: new Date()
      });
    }
    
    await payment.save();
    
    console.log(`✅ Admin updated payment ${paymentId} from ${oldStatus} to ${status}`);
    
    res.json({
      message: "อัปเดตสถานะสำเร็จ",
      payment: {
        paymentId: payment.paymentId,
        status: payment.status,
        paidAt: payment.paidAt
      }
    });
    
  } catch (err) {
    console.error("❌ Update payment status error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการอัปเดตสถานะ" });
  }
});

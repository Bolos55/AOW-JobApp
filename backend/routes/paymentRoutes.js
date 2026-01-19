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
    const userId = getUserId(req);
    const { page = 1, limit = 10, status } = req.query;

    const filter = { employerId: userId };
    if (status) {
      filter.status = status;
    }

    const payments = await Payment.find(filter)
      .populate('jobId', 'title company')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Payment.countDocuments(filter);

    res.json({
      payments: payments.map(p => ({
        paymentId: p.paymentId,
        amount: p.amount,
        status: p.status,
        paymentMethod: p.paymentMethod,
        packageType: p.packageType,
        boostFeatures: p.boostFeatures,
        paidAt: p.paidAt,
        createdAt: p.createdAt,
        job: {
          id: p.jobId._id,
          title: p.jobId.title,
          company: p.jobId.company
        }
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (err) {
    console.error("Get my payments error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงประวัติการชำระเงิน" });
  }
});

// ✅ REMOVED INSECURE HELPER FUNCTIONS
// Use secure implementations from paymentUtils.js instead

export default router;
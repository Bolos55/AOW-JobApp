// backend/models/Payment.js
import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
  // Payment Reference
  paymentId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Job Information
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Job",
    required: true
  },
  
  // Employer Information (ผู้จ้างงานที่จ่ายค่าบริการแพลตฟอร์ม)
  employerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  
  // ✅ Platform Service Fee Details
  serviceFee: {
    type: Number,
    required: true,
    description: "ค่าบริการแพลตฟอร์ม (Platform Service Fee)"
  },
  
  currency: {
    type: String,
    default: "THB"
  },
  
  // Payment Method (วิธีชำระค่าบริการแพลตฟอร์ม)
  paymentMethod: {
    type: String,
    enum: ["promptpay", "bank_transfer", "credit_card"],
    required: true
  },
  
  // Payment Status
  status: {
    type: String,
    enum: ["pending", "paid", "failed", "expired", "cancelled"],
    default: "pending"
  },
  
  // Auto Verification
  isAutoVerified: {
    type: Boolean,
    default: false
  },
  
  verificationMethod: {
    type: String,
    enum: ["webhook", "api_check", "manual"],
    default: "webhook"
  },
  
  // Payment Gateway Response
  gatewayResponse: {
    transactionId: String,
    gatewayStatus: String,
    gatewayMessage: String,
    rawResponse: mongoose.Schema.Types.Mixed
  },
  
  // Timing
  paidAt: Date,
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
  },
  
  // QR Code Data (สำหรับชำระค่าบริการ)
  qrCodeData: String,
  qrCodeImage: String,
  
  // Reference Numbers
  bankReference: String,
  promptpayReference: String,
  
  // ✅ Platform Service Package Details
  servicePackage: {
    type: {
      type: String,
      enum: ["standard", "premium", "featured", "urgent"],
      default: "standard"
    },
    name: {
      type: String,
      required: true,
      description: "ชื่อแพ็กเกจบริการ"
    },
    duration: {
      type: Number,
      default: 30,
      description: "ระยะเวลาให้บริการ (วัน)"
    },
    features: [{
      type: String,
      description: "คุณสมบัติของบริการ"
    }]
  },
  
  // ✅ Additional Service Features (Boost)
  additionalServices: [{
    serviceId: {
      type: String,
      enum: ["featured", "urgent", "highlighted", "extended"],
      required: true
    },
    serviceName: {
      type: String,
      required: true
    },
    serviceFee: {
      type: Number,
      required: true
    },
    duration: {
      type: Number,
      required: true
    },
    description: String
  }],
  
  // ✅ Service Fee Breakdown (แทน pricing)
  feeBreakdown: {
    // Base amounts (ก่อน VAT)
    subtotal: { type: Number, required: true }, // รวมค่าบริการก่อน VAT
    
    // Tax information
    taxRate: { type: Number, default: 0 }, // Phase 0-1: 0%, อนาคต: 7%
    taxAmount: { type: Number, default: 0 }, // จำนวนภาษี
    
    // Final amounts
    totalBeforeTax: { type: Number, required: true }, // รวมก่อนภาษี
    totalServiceFee: { type: Number, required: true }, // ค่าบริการรวมที่ต้องจ่าย
    
    // VAT Configuration
    vatEnabled: { type: Boolean, default: false }, // Phase 0-1: false
    vatNumber: String, // เลขประจำตัวผู้เสียภาษี (เมื่อจด VAT แล้ว)
    
    // Service breakdown for transparency
    services: [{
      serviceId: String, // "standard_package", "featured_boost", etc.
      serviceName: String, // "แพ็กเกจงานปกติ", "บูสต์แสดงในหน้าแรก"
      quantity: { type: Number, default: 1 },
      unitFee: Number, // ค่าบริการต่อหน่วย (ก่อน VAT)
      totalFee: Number // รวม (ก่อน VAT)
    }],
    
    // Currency and locale
    currency: { type: String, default: "THB" },
    locale: { type: String, default: "th-TH" }
  },
  
  // ✅ Platform Service Terms
  serviceTerms: {
    type: String,
    default: "ค่าบริการแพลตฟอร์มสำหรับการโพสต์งานและบริการเสริม ไม่สามารถขอคืนได้เมื่อเริ่มให้บริการแล้ว",
    description: "เงื่อนไขการให้บริการ"
  },
  
  // Cancellation Information
  cancelledAt: Date,
  cancelReason: String,
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  
  // Audit Trail
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  
  // Metadata
  metadata: {
    userAgent: String,
    ipAddress: String,
    source: String,
    platformVersion: String
  }
  
}, {
  timestamps: true
});

// Indexes for performance
paymentSchema.index({ employerId: 1, createdAt: -1 });
paymentSchema.index({ status: 1, expiresAt: 1 });
paymentSchema.index({ paymentMethod: 1, status: 1 });

// Auto-expire pending payments
paymentSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual for payment URL
paymentSchema.virtual('paymentUrl').get(function() {
  return `${process.env.FRONTEND_URL}/payment/${this.paymentId}`;
});

// ✅ Legacy compatibility (เพื่อไม่ให้โค้ดเก่าพัง)
paymentSchema.virtual('amount').get(function() {
  return this.serviceFee;
});

paymentSchema.virtual('totalPrice').get(function() {
  return this.feeBreakdown?.totalServiceFee || this.serviceFee;
});

// Methods
paymentSchema.methods.markAsPaid = function(gatewayData = {}) {
  this.status = 'paid';
  this.paidAt = new Date();
  this.isAutoVerified = true;
  this.gatewayResponse = gatewayData;
  return this.save();
};

paymentSchema.methods.markAsFailed = function(reason = '') {
  this.status = 'failed';
  this.gatewayResponse = { gatewayMessage: reason };
  return this.save();
};

paymentSchema.methods.markAsCancelled = function(reason = '', userId = null) {
  this.status = 'cancelled';
  this.cancelledAt = new Date();
  this.cancelReason = reason;
  this.cancelledBy = userId;
  return this.save();
};

paymentSchema.methods.generateQRCode = async function() {
  try {
    // Import PromptPay QR generator
    const { generatePromptPayQR } = await import('../utils/paymentUtils.js');
    
    // ใช้เบอร์โทรศัพท์หรือเลขบัตรประชาชนจาก environment variable
    const promptpayId = process.env.PAYMENT_PROMPTPAY_NUMBER || process.env.PAYMENT_PROMPTPAY_ID;
    
    if (!promptpayId) {
      console.error('❌ PAYMENT_PROMPTPAY_NUMBER or PAYMENT_PROMPTPAY_ID not configured');
      throw new Error('PromptPay ID not configured');
    }
    
    // สร้าง PromptPay QR Code (Data URL format)
    const qrCodeDataURL = await generatePromptPayQR(promptpayId, this.serviceFee);
    
    // เก็บ QR Code Data URL
    this.qrCodeImage = qrCodeDataURL;
    this.qrCodeData = qrCodeDataURL; // เก็บทั้ง 2 field เพื่อ backward compatibility
    
    console.log(`✅ Generated PromptPay QR Code for payment ${this.paymentId}`);
    
    return this.save();
  } catch (err) {
    console.error('❌ QR Code generation error:', err);
    throw err;
  }
};

// Static methods
paymentSchema.statics.findPendingPayments = function() {
  return this.find({ 
    status: 'pending',
    expiresAt: { $gt: new Date() }
  });
};

paymentSchema.statics.generatePaymentId = function() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `SVC_${timestamp}_${random}`.toUpperCase(); // SVC = Service Fee
};

export default mongoose.model("Payment", paymentSchema);
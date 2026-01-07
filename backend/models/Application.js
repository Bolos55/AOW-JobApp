// backend/models/Application.js
import mongoose from "mongoose";

const applicationSchema = new mongoose.Schema(
  {
    job: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
    jobTitle: String,
    jobCode: String,

    applicant: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    applicantName: String,
    applicantEmail: String,
    message: String,

    personalProfile: String,

    // ✅ ไฟล์เรซูเม่
    resumePath: String,

    // ✅ รูปบัตรประชาชน (เก็บ path)
    idCardPath: String,

    // ✅ สถานะยืนยันสิทธิ์โดยแอดมิน
    idVerified: { type: Boolean, default: false },
    
    // ✅ ข้อมูลการตรวจสอบแบบละเอียด
    verificationResult: {
      type: String,
      enum: ["approved", "rejected", ""],
      default: "",
    },
    verificationNotes: String,
    verifiedAt: Date,
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    
    // ✅ ข้อมูลจากบัตรประชาชน (เก็บเฉพาะเมื่ออนุมัติ)
    idCardData: {
      idNumber: String,
      fullName: String,
      birthDate: String,
      address: String,
      issueDate: String,
      expiryDate: String,
    },

    // ✅ รหัสใบสมัครที่ไม่ซ้ำ
    applicationId: {
      type: String,
      unique: true,
      sparse: true
    },

    // ✅ ข้อมูล metadata การส่งใบสมัคร
    submissionMetadata: {
      submittedAt: Date,
      ipAddress: String,
      userAgent: String,
      screenResolution: String,
      timezone: String,
      language: String,
    },

    // ✅ สถานะเดิม (deprecated - ใช้ idVerified แทน)
    verifyStatus: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
    },

    status: {
      type: String,
      enum: ["pending", "hired", "rejected"],
      default: "pending",
    },
    hiredAt: Date,
  },
  { timestamps: true }
);

// ✅ เพิ่ม index สำหรับการค้นหา
applicationSchema.index({ applicationId: 1 });
applicationSchema.index({ applicant: 1, job: 1 }, { unique: true }); // ป้องกันสมัครซ้ำ
applicationSchema.index({ job: 1, createdAt: -1 });

export default (
  mongoose.models.Application ||
  mongoose.model("Application", applicationSchema)
);

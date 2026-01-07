// backend/models/User.js
import mongoose from "mongoose";

const { Schema } = mongoose;

const profileSchema = new Schema(
  {
    // JobSeeker fields
    fullName: { type: String, trim: true },
    headline: { type: String, trim: true },
    location: { type: String, trim: true },
    phone: { type: String, trim: true },
    skillsText: { type: String, trim: true },
    experience: { type: String, trim: true },
    resumeUrl: { type: String, trim: true },
    photoUrl: { type: String, trim: true },
    
    // Employer fields
    companyName: { type: String, trim: true },
    businessType: { type: String, trim: true },
    description: { type: String, trim: true },
    address: { type: String, trim: true },
    website: { type: String, trim: true },
    employeeCount: { type: String, trim: true },
    logoUrl: { type: String, trim: true },
  },
  { _id: false }
);

const userSchema = new Schema(
  {
    // ชื่อผู้ใช้
    name: {
      type: String,
      required: true,
      trim: true,
    },

    // อีเมล (ห้ามซ้ำ / ต้องมีค่า)
    email: {
      type: String,
      unique: true,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    // รหัสผ่าน (เก็บเป็น hash)
    password: {
      type: String,
      required: true,
    },

    // บทบาทของผู้ใช้ ใช้กับระบบงาน / แชท / แอดมิน
    role: {
      type: String,
      enum: ["jobseeker", "employer", "admin"],
      default: "jobseeker",
    },

    // ใช้คู่กับ contact-admin (จะหาแอดมินที่ active ก่อน)
    isActive: {
      type: Boolean,
      default: true,
    },

    // ✅ โปรไฟล์ผู้ใช้ (ไว้ให้ผู้สมัครกรอก + แอดมิน/นายจ้างดู)
    profile: {
      type: profileSchema,
      default: {},
    },

    // ✅ Social Login Fields
    socialProvider: {
      type: String,
      enum: ["google", "facebook", "firebase-google", "github", null],
      default: null,
    },
    socialId: {
      type: String,
      default: null,
    },
    avatar: {
      type: String, // URL ของรูปโปรไฟล์จาก social provider
      default: null,
    },

    promotedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    promotedAt: {
      type: Date,
      default: null,
    },

    resetPasswordToken: String,
    resetPasswordExpire: Date,

    // ✅ Email verification fields
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: String,
    emailVerificationExpire: Date,

    // ✅ Security and tracking fields
    registrationMetadata: {
      type: Object,
      default: {},
    },
    registrationIP: String,
    lastLoginAt: Date,
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: Date,

    // ✅ Email validation and security fields
    emailValidation: {
      isDisposable: { type: Boolean, default: false },
      isSuspicious: { type: Boolean, default: false },
      domain: { type: String, trim: true },
      validationScore: { type: Number, default: 0 }, // 0-100
      validationNotes: [String],
    },
    
    // ✅ Account status for suspicious activity
    isSuspended: { type: Boolean, default: false },
    suspensionReason: String,
    suspendedAt: Date,
    suspendedBy: { type: Schema.Types.ObjectId, ref: "User" },
    
    // ✅ Admin review flags
    requiresReview: { type: Boolean, default: false },
    reviewNotes: [String],
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: Date,
  },
  {
    timestamps: true,
  }
);

// ป้องกัน error "Cannot overwrite `User` model" เวลา reload code
const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;

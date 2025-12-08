// backend/models/User.js
import mongoose from "mongoose";

const { Schema } = mongoose;

const profileSchema = new Schema(
  {
    fullName: { type: String, trim: true },
    headline: { type: String, trim: true },
    location: { type: String, trim: true },
    phone: { type: String, trim: true },
    skillsText: { type: String, trim: true },
    experience: { type: String, trim: true },
    resumeUrl: { type: String, trim: true },
    photoUrl: { type: String, trim: true },   // ⭐ เพิ่ม field สำหรับเก็บรูปโปรไฟล์
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
  },
  {
    timestamps: true,
  }
);

// ป้องกัน error "Cannot overwrite `User` model" เวลา reload code
const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;

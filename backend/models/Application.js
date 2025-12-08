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

export default (
  mongoose.models.Application ||
  mongoose.model("Application", applicationSchema)
);

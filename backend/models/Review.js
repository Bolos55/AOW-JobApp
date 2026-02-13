import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
  job: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  userName: String,
  rating: { type: Number, min: 1, max: 5, default: 5 },
  comment: String,
  // ✅ การตอบกลับจากผู้ว่าจ้าง
  employerReply: {
    text: String,
    repliedAt: Date,
    repliedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  }
}, { timestamps: true });

export default mongoose.models.Review || mongoose.model("Review", reviewSchema);
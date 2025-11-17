import mongoose from "mongoose";

const applicationSchema = new mongoose.Schema({
  job: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
  jobTitle: String,
  jobCode: String,

  applicant: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  applicantName: String,
  applicantEmail: String,
  message: String,

  personalProfile: String,
  resumePath: String,

  status: { type: String, enum: ["pending", "hired", "rejected"], default: "pending" },
  hiredAt: Date,
}, { timestamps: true });

export default mongoose.models.Application || mongoose.model("Application", applicationSchema);
// backend/models/Job.js
import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    company: { type: String, required: true },
    salary: String,
    location: String,
    type: String,
    category: String,
    jobCode: { type: String, required: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ✅ สถานะงานปิดหรือยัง
    isCompleted: {
      type: Boolean,
      default: false,
    },
    completedAt: Date,

    // ✅ Payment Information
    isPaid: {
      type: Boolean,
      default: false,
    },
    paidAt: Date,
    paymentId: String,
    
    // ✅ Package Information
    packageType: {
      type: String,
      enum: ["standard", "premium", "featured"],
      default: "standard"
    },
    
    boostFeatures: [{
      type: String,
      enum: ["featured", "urgent", "highlighted", "extended"]
    }],
    
    // ✅ Job Visibility
    isActive: {
      type: Boolean,
      default: false, // ต้องชำระเงินก่อนถึงจะ active
    },
    
    expiresAt: Date, // วันหมดอายุของงาน

    description: String,
    skills: [String],
    workMode: String,
    mapLink: String,
    workingHours: String,
    dayOff: String,
    benefits: String,
    contactEmail: String,
    contactPhone: String,
    contactWebsite: String,
    deadline: String,
    
    // ✅ Workplace Photos (1-3 images)
    workplacePhotos: [{
      type: String, // Cloudinary URL
    }],
  },
  { timestamps: true }
);

export default mongoose.models.Job || mongoose.model("Job", jobSchema);
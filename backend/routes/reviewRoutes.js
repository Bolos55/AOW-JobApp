// backend/routes/reviewRoutes.js
import express from "express";
import Job from "../models/Job.js";
import Application from "../models/Application.js";
import Review from "../models/Review.js";
import User from "../models/User.js";
import auth from "../middleware/auth.js";

const router = express.Router();

// ดูรีวิวของงาน
router.get("/:id/reviews", auth, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: "ไม่พบงานนี้" });

    if (!job.completedAt) {
      return res
        .status(403)
        .json({ message: "งานนี้ยังไม่ปิด จึงยังไม่สามารถดูรีวิวได้" });
    }

    const reviews = await Review.find({ job: req.params.id })
      .sort({ createdAt: -1 })
      .lean();

    res.json(reviews);
  } catch (err) {
    console.log("get reviews error:", err);
    res.status(500).json({ message: "ดึงรีวิวไม่สำเร็จ" });
  }
});

// เพิ่มรีวิว
router.post("/:id/reviews", auth, async (req, res) => {
  try {
    const { rating = 5, comment = "" } = req.body || {};
    const jobId = req.params.id;

    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ message: "ไม่พบงานนี้" });

    if (!job.completedAt) {
      return res.status(400).json({ message: "ยังรีวิวไม่ได้ งานยังไม่ปิด" });
    }

    const hired = await Application.findOne({
      job: jobId,
      applicant: req.user.id,
      status: "hired",
    });
    if (!hired) {
      return res
        .status(403)
        .json({ message: "รีวิวได้เฉพาะคนที่ถูกจ้างในงานนี้เท่านั้น" });
    }

    const diffMs = Date.now() - job.completedAt.getTime();
    if (diffMs > 7 * 24 * 60 * 60 * 1000) {
      return res
        .status(400)
        .json({ message: "เลยเวลา 7 วันหลังปิดงานแล้ว จึงรีวิวไม่ได้" });
    }

    const user = await User.findById(req.user.id);

    const review = await Review.create({
      job: jobId,
      user: req.user.id,
      userName: user?.name || user?.email || "ผู้ใช้",
      rating,
      comment,
    });

    res.status(201).json(review);
  } catch (err) {
    console.log("create review error:", err);
    res.status(500).json({ message: "เพิ่มรีวิวไม่สำเร็จ" });
  }
});

// แก้รีวิว
router.put("/:jobId/reviews/:reviewId", auth, async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) return res.status(404).json({ message: "ไม่พบงานนี้" });

    const review = await Review.findById(req.params.reviewId);
    if (!review) return res.status(404).json({ message: "ไม่พบรีวิวนี้" });

    if (review.user.toString() !== req.user.id) {
      return res.status(403).json({ message: "แก้ไขได้เฉพาะรีวิวของตัวเอง" });
    }

    if (!job.completedAt) {
      return res.status(400).json({ message: "ยังแก้ไม่ได้ งานยังไม่ปิด" });
    }

    const diffMs = Date.now() - job.completedAt.getTime();
    if (diffMs > 7 * 24 * 60 * 60 * 1000) {
      return res.status(400).json({ message: "เลยเวลาแก้ไขแล้ว (7 วันหลังปิดงาน)" });
    }

    review.rating = req.body.rating ?? review.rating;
    review.comment = req.body.comment ?? review.comment;
    await review.save();

    res.json(review);
  } catch (err) {
    console.log("update review error:", err);
    res.status(500).json({ message: "แก้ไขรีวิวไม่สำเร็จ" });
  }
});

export default router;
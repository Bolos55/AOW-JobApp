// backend/routes/reviewRoutes.js
import express from "express";
import auth from "../middleware/auth.js";
import Review from "../models/Review.js";
import Job from "../models/Job.js";
import Application from "../models/Application.js";

const router = express.Router();

// helper เอา userId ให้ชัวร์
function getUserId(req) {
  return (
    req.userId ||
    (req.user && (req.user._id || req.user.id)) ||
    null
  );
}

/**
 * GET /api/reviews/job/:jobId
 * ดึงรีวิวทั้งหมดของงานนี้ (public)
 */
router.get("/job/:jobId", async (req, res) => {
  try {
    const { jobId } = req.params;
    const reviews = await Review.find({ job: jobId })
      .populate("user", "name")
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (err) {
    console.error("GET /reviews/job error:", err);
    res.status(500).json({ message: "ไม่สามารถโหลดรีวิวได้" });
  }
});

/**
 * GET /api/reviews/can-review/:jobId
 * ใช้เช็คว่าผู้ใช้คนนี้ “มีสิทธิ์รีวิวงานนี้ไหม”
 * เงื่อนไข:
 *   - job.isCompleted === true (นายจ้างปิดงานแล้ว)
 *   - มี Application ที่เป็นของ user นี้
 *     และ status === "hired"
 *   - ยังไม่เคยเขียนรีวิวงานนี้มาก่อน
 */
router.get("/can-review/:jobId", auth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "ยังไม่ได้เข้าสู่ระบบ" });
    }

    const { jobId } = req.params;

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: "ไม่พบนงานนี้" });
    }

    // ❗ ต้องปิดงานแล้วเท่านั้น
    if (!job.isCompleted) {
      return res.json({
        canReview: false,
        reason: "job_not_completed",
        message: "งานนี้ยังไม่ปิด จึงยังรีวิวไม่ได้",
      });
    }

    // หาใบสมัครของ user คนนี้ที่ job นี้ และถูก “รับเข้าทำงาน” แล้ว
    const app = await Application.findOne({
      job: jobId,
      applicant: userId,
      status: "hired",
    });

    if (!app) {
      return res.json({
        canReview: false,
        reason: "not_hired",
        message:
          "สามารถรีวิวได้เฉพาะผู้ที่เคยถูกรับเข้าทำงานในตำแหน่งนี้",
      });
    }

    // เช็คว่าคนนี้เคยรีวิวไปแล้วหรือยัง
    const existed = await Review.findOne({
      job: jobId,
      user: userId,
    });

    if (existed) {
      return res.json({
        canReview: false,
        reason: "already_reviewed",
        message: "คุณได้รีวิวงานนี้ไปแล้ว",
      });
    }

    return res.json({ canReview: true });
  } catch (err) {
    console.error("GET /reviews/can-review error:", err);
    res.status(500).json({ message: "ตรวจสอบสิทธิ์รีวิวไม่สำเร็จ" });
  }
});

/**
 * POST /api/reviews
 * body: { jobId, rating, comment }
 */
router.post("/", auth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "ยังไม่ได้เข้าสู่ระบบ" });
    }

    const { jobId, rating, comment } = req.body;

    if (!jobId || !rating) {
      return res
        .status(400)
        .json({ message: "กรุณาระบุ jobId และ rating" });
    }

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: "ไม่พบนงานนี้" });
    }

    // ต้องปิดงานแล้ว
    if (!job.isCompleted) {
      return res
        .status(400)
        .json({ message: "งานนี้ยังไม่ปิด จึงยังรีวิวไม่ได้" });
    }

    // ต้องเคยถูกจ้างงานในตำแหน่งนี้
    const app = await Application.findOne({
      job: jobId,
      applicant: userId,
      status: "hired",
    });

    if (!app) {
      return res.status(403).json({
        message:
          "คุณไม่มีสิทธิ์รีวิวงานนี้ (ต้องเป็นผู้ที่เข้าทำงานในตำแหน่งนี้เท่านั้น)",
      });
    }

    // ห้ามรีวิวซ้ำ
    const existed = await Review.findOne({ job: jobId, user: userId });
    if (existed) {
      return res.status(400).json({ message: "คุณได้รีวิวงานนี้ไปแล้ว" });
    }

    const review = await Review.create({
      job: jobId,
      user: userId,
      rating,
      comment: comment || "",
    });

    const populated = await Review.findById(review._id).populate(
      "user",
      "name"
    );

    res.status(201).json(populated);
  } catch (err) {
    console.error("POST /reviews error:", err);
    res.status(500).json({ message: "ไม่สามารถบันทึกรีวิวได้" });
  }
});

export default router;

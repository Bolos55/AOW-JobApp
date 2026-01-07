// backend/routes/employerRoutes.js
import express from "express";
import Job from "../models/Job.js";
import Application from "../models/Application.js";
import auth from "../middleware/auth.js";

const router = express.Router();

/* ===== helper เอามาจาก jobRoutes.js ให้เหมือนกันเลย ===== */
function getUserId(req) {
  return (
    req.userId ||
    (req.user && (req.user._id || req.user.id)) ||
    null
  );
}

/**
 * GET /api/employer/my-jobs
 * ดึง "งานที่ฉันโพสต์" ตาม user ที่ล็อกอิน
 * + ใส่ applicantCount (จำนวนผู้สมัครแต่ละงาน)
 */
router.get("/my-jobs", auth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "ไม่พบข้อมูลผู้ใช้" });
    }

    // ใช้ createdBy แทน employer ให้ตรงกับ jobRoutes.js
    const jobs = await Job.find({ createdBy: userId })
      .sort({ createdAt: -1 })
      .lean();

    // ถ้ายังไม่มีงานเลย ก็ส่ง [] กลับไป
    if (!jobs.length) {
      return res.json([]);
    }

    const jobIds = jobs.map((j) => j._id);

    // นับจำนวนใบสมัครของแต่ละ job
    const appsByJob = await Application.aggregate([
      { $match: { job: { $in: jobIds } } },
      {
        $group: {
          _id: "$job",
          count: { $sum: 1 },
        },
      },
    ]);

    const countMap = {};
    appsByJob.forEach((g) => {
      countMap[g._id.toString()] = g.count;
    });

    const jobsWithCount = jobs.map((job) => ({
      ...job,
      applicantCount: countMap[job._id.toString()] || 0,
    }));

    res.json(jobsWithCount);
  } catch (err) {
    console.error("GET /api/employer/my-jobs error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * GET /api/employer/my-applications-received
 * ดึง "ผู้สมัครทั้งหมด" ของงานที่เป็นของนายจ้างคนนี้
 */
router.get("/my-applications-received", auth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "ไม่พบข้อมูลผู้ใช้" });
    }

    // หา job ที่ user นี้เป็นคนโพสต์
    const jobs = await Job.find({ createdBy: userId }).select("_id");
    const jobIds = jobs.map((j) => j._id);

    if (!jobIds.length) {
      return res.json([]);
    }

    // ✅ เพิ่มข้อมูลการยืนยันบัตรประชาชน (idVerified, idCardPath)
    const apps = await Application.find({ job: { $in: jobIds } })
      .populate("job", "title company location salary")
      .populate({
        path: "applicant", 
        select: "name email phone profile avatar",
        populate: {
          path: "profile",
          select: "fullName headline location skillsText experience photoUrl resumeUrl"
        }
      })
      .select("job applicant status createdAt message resumePath idCardPath idVerified verificationResult verificationNotes verifiedAt hiredAt")
      .sort({ createdAt: -1 });

    res.json(apps);
  } catch (err) {
    console.error("GET /api/employer/my-applications-received error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * PATCH /api/employer/applications/:id/status
 * body: { status: "pending" | "hired" | "rejected" }
 * ใช้กับปุ่ม "รับเข้าทำงาน" / "ปฏิเสธ" ใน EmployerView
 */
router.patch("/applications/:id/status", auth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "ไม่พบข้อมูลผู้ใช้" });
    }

    const { id } = req.params;
    const { status } = req.body;

    const allowed = ["pending", "hired", "rejected"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    // หา application + job เพื่อเช็คว่า job นี้เป็นของ user คนนี้ไหม
    const app = await Application.findById(id).populate("job");
    if (!app) {
      return res.status(404).json({ message: "Application not found" });
    }

    if (!app.job || app.job.createdBy.toString() !== String(userId)) {
      return res
        .status(403)
        .json({ message: "คุณไม่ใช่เจ้าของงานนี้ จึงเปลี่ยนสถานะไม่ได้" });
    }

    // ✅ เช็คว่าถ้าจะรับเข้าทำงาน ต้องมีการยืนยันบัตรประชาชนจาก admin ก่อน
    if (status === "hired") {
      if (!app.idVerified) {
        return res.status(400).json({ 
          message: "ไม่สามารถรับเข้าทำงานได้ เนื่องจากแอดมินยังไม่ได้ตรวจสอบและอนุมัติบัตรประชาชนของผู้สมัครคนนี้",
          requiresIdVerification: true
        });
      }
    }

    app.status = status;
    if (status === "hired") {
      app.hiredAt = new Date();
    }
    await app.save();

    // populate ให้สวย ๆ ก่อนส่งกลับ
    const updated = await Application.findById(app._id)
      .populate("job", "title company location salary")
      .populate({
        path: "applicant", 
        select: "name email phone profile avatar",
        populate: {
          path: "profile",
          select: "fullName headline location skillsText experience photoUrl resumeUrl"
        }
      });

    res.json(updated);
  } catch (err) {
    console.error("PATCH /api/employer/applications/:id/status error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =======================
   ปิด / เปิดงาน (ให้ใช้กับปุ่ม "ปิดงานนี้")
   ======================= */

/**
 * handler กลาง: ตั้งค่า isCompleted / completedAt
 * ใช้ทั้ง /jobs/:id/complete และ /jobs/:id/close (alias)
 *
 * body: { isCompleted?: boolean }
 * - ถ้าไม่ส่ง isCompleted มา จะถือว่า "ปิดงาน" (true)
 */
async function handleToggleJobComplete(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "ไม่พบข้อมูลผู้ใช้" });
    }

    const { id } = req.params;
    const { isCompleted } = req.body; // optional

    const job = await Job.findById(id);
    if (!job) {
      return res.status(404).json({ message: "ไม่พบงานนี้" });
    }

    // เช็คว่าเป็นคนโพสต์งานนี้จริงไหม
    if (String(job.createdBy) !== String(userId)) {
      return res
        .status(403)
        .json({ message: "คุณไม่มีสิทธิ์เปลี่ยนสถานะงานนี้" });
    }

    // ถ้าไม่ส่ง isCompleted มา => ปิดงาน
    const finalStatus =
      typeof isCompleted === "boolean" ? isCompleted : true;

    job.isCompleted = finalStatus;
    job.completedAt = finalStatus ? job.completedAt || new Date() : null;

    await job.save();

    return res.json(job);
  } catch (err) {
    console.error("PATCH /api/employer/jobs/:id/complete error:", err);
    return res.status(500).json({ message: "ไม่สามารถเปลี่ยนสถานะงานได้" });
  }
}

/**
 * ✅ หลัก ๆ ให้ front เรียกอันนี้
 * PATCH /api/employer/jobs/:id/complete
 */
router.patch("/jobs/:id/complete", auth, handleToggleJobComplete);

/**
 * ✅ เผื่อ front ฝั่งเดิมที่เรียก /close อยู่แล้ว
 * PATCH /api/employer/jobs/:id/close
 */
router.patch("/jobs/:id/close", auth, handleToggleJobComplete);

export default router;

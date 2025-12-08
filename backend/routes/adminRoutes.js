// backend/routes/adminRoutes.js
import express from "express";
import { authMiddleware } from "../middleware/auth.js"; // 👈 เปลี่ยนเป็น named export
import User from "../models/User.js";
import Job from "../models/Job.js";
import Application from "../models/Application.js";

const router = express.Router();

// ใช้ฟังก์ชันเดียวกับไฟล์ chatRoutes
function getMyId(req) {
  return (
    req.userId ||
    (req.user && (req.user._id || req.user.id)) ||
    null
  );
}

// middleware ตรวจสอบว่าเป็น admin จริงไหม
async function requireAdmin(req, res, next) {
  try {
    const me = getMyId(req);
    if (!me) {
      return res
        .status(401)
        .json({ message: "ไม่ได้เข้าสู่ระบบ หรือไม่พบ userId ใน token" });
    }

    const user = await User.findById(me).select("role isActive name email");
    if (!user) {
      return res.status(401).json({ message: "ไม่พบผู้ใช้งานในระบบ" });
    }

    if (user.role !== "admin") {
      return res.status(403).json({ message: "อนุญาตเฉพาะแอดมินเท่านั้น" });
    }

    // เผื่ออยากใช้ข้อมูล admin ต่อใน handler ถัดไป
    req.admin = user;
    next();
  } catch (err) {
    console.error("requireAdmin error:", err);
    return res
      .status(500)
      .json({ message: "ระบบตรวจสอบสิทธิ์แอดมินมีปัญหา" });
  }
}

/**
 * GET /api/admin/stats
 * ใช้ในหน้า Dashboard บน AdminView.jsx
 */
router.get("/stats", authMiddleware, requireAdmin, async (_req, res) => {
  try {
    const [totalUsers, totalJobs, totalApplications, activeJobs] =
      await Promise.all([
        User.countDocuments(),
        Job.countDocuments(),
        Application.countDocuments(),
        Job.countDocuments({ isCompleted: { $ne: true } }), // isCompleted != true = ยังเปิดอยู่
      ]);

    return res.json({
      totalUsers,
      totalJobs,
      totalApplications,
      activeJobs,
    });
  } catch (err) {
    console.error("admin /stats error:", err);
    return res
      .status(500)
      .json({ message: "ดึงสถิติไม่สำเร็จ" });
  }
});

/**
 * GET /api/admin/users
 * ดึงรายชื่อผู้ใช้ทั้งหมด
 */
router.get("/users", authMiddleware, requireAdmin, async (_req, res) => {
  try {
    const users = await User.find({})
      .select("name email role isActive createdAt promotedBy promotedAt")
      .populate("promotedBy", "name email");

    return res.json(users);
  } catch (err) {
    console.error("admin /users error:", err);
    return res
      .status(500)
      .json({ message: "ดึงรายชื่อผู้ใช้ไม่สำเร็จ" });
  }
});

/**
 * PATCH /api/admin/users/:id/role
 * เปลี่ยน role ผู้ใช้ + บันทึกว่าใครเป็นคนตั้ง (promotedBy / promotedAt)
 */
router.patch("/users/:id/role", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const allowedRoles = ["jobseeker", "employer", "admin"];
    if (!role || !allowedRoles.includes(role)) {
      return res.status(400).json({
        message: "role ไม่ถูกต้อง (ต้องเป็น jobseeker / employer / admin)",
      });
    }

    const myId = getMyId(req);

    // กันแอดมินลดสิทธิ์ตัวเอง
    if (id === String(myId) && role !== "admin") {
      return res.status(400).json({
        message:
          "เพื่อความปลอดภัย ระบบไม่อนุญาตให้คุณลดสิทธิ์ตัวเองออกจาก admin ผ่าน API นี้",
      });
    }

    const update = {
      role,
      promotedBy: req.admin?._id || myId,
      promotedAt: new Date(),
    };

    const updatedUser = await User.findByIdAndUpdate(id, update, {
      new: true,
    })
      .select("name email role isActive createdAt promotedBy promotedAt")
      .populate("promotedBy", "name email");

    if (!updatedUser) {
      return res.status(404).json({ message: "ไม่พบผู้ใช้" });
    }

    return res.json(updatedUser);
  } catch (err) {
    console.error("admin PATCH /users/:id/role error:", err);
    return res
      .status(500)
      .json({ message: "เปลี่ยนสิทธิ์ผู้ใช้ไม่สำเร็จ" });
  }
});

/**
 * GET /api/admin/jobs
 * ดึงงานทั้งหมด (พร้อมคนโพสต์)
 */
router.get("/jobs", authMiddleware, requireAdmin, async (_req, res) => {
  try {
    const jobs = await Job.find({})
      .populate("createdBy", "name email role")
      .sort({ createdAt: -1 });

    return res.json(jobs);
  } catch (err) {
    console.error("admin /jobs error:", err);
    return res
      .status(500)
      .json({ message: "ดึงรายการงานไม่สำเร็จ" });
  }
});

/**
 * DELETE /api/admin/jobs/:jobId
 * ลบงาน + ลบใบสมัครที่เกี่ยวข้อง
 */
router.delete("/jobs/:jobId", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { jobId } = req.params;

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: "ไม่พบนงานนี้" });
    }

    // ลบใบสมัครที่เกี่ยวข้องกับงานนี้
    await Application.deleteMany({ job: jobId });

    // ลบตัวงาน
    await Job.findByIdAndDelete(jobId);

    return res.json({ message: "ลบงานเรียบร้อยแล้ว" });
  } catch (err) {
    console.error("admin DELETE /jobs error:", err);
    return res
      .status(500)
      .json({ message: "ลบงานไม่สำเร็จ" });
  }
});

/* ------------------------------------------------------------------
 *  ใบสมัครงาน & ยืนยันบัตรประชาชน (ใช้ใน AdminView.jsx)
 * -----------------------------------------------------------------*/

/**
 * GET /api/admin/applications
 * ดึงใบสมัครทั้งหมด (พร้อมข้อมูลผู้สมัคร + งาน)
 */
router.get("/applications", authMiddleware, requireAdmin, async (_req, res) => {
  try {
    const apps = await Application.find({})
      .populate("job", "title company jobCode")
      .populate("applicant", "name email")
      .sort({ createdAt: -1 });

    const mapped = apps.map((a) => {
      const obj = a.toObject();
      return {
        ...obj,
        applicantName: obj.applicantName || obj.applicant?.name || "",
        applicantEmail: obj.applicantEmail || obj.applicant?.email || "",
        jobTitle: obj.jobTitle || obj.job?.title || "",
        idCardPath: obj.idCardPath || "",
        idVerified: !!obj.idVerified,
      };
    });

    return res.json(mapped);
  } catch (err) {
    console.error("admin /applications error:", err);
    return res
      .status(500)
      .json({ message: "ดึงใบสมัครไม่สำเร็จ" });
  }
});

/**
 * PATCH /api/admin/applications/:id/verify
 * อัปเดตสถานะยืนยันบัตรประชาชน (idVerified)
 */
router.patch(
  "/applications/:id/verify",
  authMiddleware,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { verified } = req.body;

      if (typeof verified !== "boolean") {
        return res.status(400).json({
          message: "ค่าที่ส่งมาต้องเป็น verified: true/false",
        });
      }

      const app = await Application.findByIdAndUpdate(
        id,
        { idVerified: verified },
        { new: true }
      )
        .populate("job", "title company jobCode")
        .populate("applicant", "name email");

      if (!app) {
        return res.status(404).json({ message: "ไม่พบใบสมัคร" });
      }

      const obj = app.toObject();
      const result = {
        ...obj,
        applicantName: obj.applicantName || obj.applicant?.name || "",
        applicantEmail: obj.applicantEmail || obj.applicant?.email || "",
        jobTitle: obj.jobTitle || obj.job?.title || "",
        idCardPath: obj.idCardPath || "",
        idVerified: !!obj.idVerified,
      };

      return res.json(result);
    } catch (err) {
      console.error("admin PATCH /applications/:id/verify error:", err);
      return res
        .status(500)
        .json({ message: "อัปเดตการยืนยันไม่สำเร็จ" });
    }
  }
);

export default router;

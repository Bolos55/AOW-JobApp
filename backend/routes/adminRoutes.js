// backend/routes/adminRoutes.js
import express from "express";
import fs from "fs";
import { authMiddleware } from "../middleware/auth.js"; // 👈 เปลี่ยนเป็น named export
import User from "../models/User.js";
import Job from "../models/Job.js";
import Application from "../models/Application.js";
import { validateEmail, validateEmailBatch } from "../utils/emailValidator.js";

const router = express.Router();

// ✅ Debug log เพื่อตรวจสอบว่า adminRoutes ถูกโหลด
if (process.env.NODE_ENV === 'development') {
  console.log("📋 AdminRoutes module loaded");
}

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
 * GET /api/admin/dashboard
 * Dashboard data สำหรับ AdminView.jsx
 */
router.get("/dashboard", authMiddleware, requireAdmin, async (_req, res) => {
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
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error("admin /dashboard error:", err);
    return res
      .status(500)
      .json({ message: "ดึงข้อมูล dashboard ไม่สำเร็จ" });
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
 * DELETE /api/admin/users/:id
 * ลบผู้ใช้ + ลบข้อมูลที่เกี่ยวข้อง (งาน, ใบสมัคร)
 */
router.delete("/users/:id", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const myId = getMyId(req);

    // กันแอดมินลบตัวเอง
    if (id === String(myId)) {
      return res.status(400).json({
        message: "เพื่อความปลอดภัย ระบบไม่อนุญาตให้คุณลบบัญชีตัวเอง",
      });
    }

    const userToDelete = await User.findById(id);
    if (!userToDelete) {
      return res.status(404).json({ message: "ไม่พบผู้ใช้" });
    }

    // ลบงานที่ผู้ใช้โพสต์
    await Job.deleteMany({ createdBy: id });

    // ลบใบสมัครที่ผู้ใช้ส่ง
    await Application.deleteMany({ applicant: id });

    // ลบผู้ใช้
    await User.findByIdAndDelete(id);

    return res.json({ 
      message: `ลบผู้ใช้ ${userToDelete.name} (${userToDelete.email}) เรียบร้อยแล้ว` 
    });
  } catch (err) {
    console.error("admin DELETE /users/:id error:", err);
    return res.status(500).json({ message: "ลบผู้ใช้ไม่สำเร็จ" });
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
      .populate({
        path: "applicant", 
        select: "name email profile avatar",
        populate: {
          path: "profile",
          select: "fullName headline location skillsText experience photoUrl resumeUrl"
        }
      })
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
 * PATCH /api/admin/applications/:id/status
 * อัปเดตสถานะใบสมัคร (pending, hired, rejected)
 */
router.patch(
  "/applications/:id/status",
  authMiddleware,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const allowedStatuses = ["pending", "hired", "rejected"];
      if (!status || !allowedStatuses.includes(status)) {
        return res.status(400).json({
          message: "สถานะไม่ถูกต้อง (ต้องเป็น pending / hired / rejected)",
        });
      }

      const updateData = {
        status,
      };

      // ถ้าเป็นการรับเข้าทำงาน ให้บันทึกวันที่
      if (status === "hired") {
        updateData.hiredAt = new Date();
      }

      const app = await Application.findByIdAndUpdate(id, updateData, { new: true })
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
      console.error("admin PATCH /applications/:id/status error:", err);
      return res
        .status(500)
        .json({ message: "อัปเดตสถานะใบสมัครไม่สำเร็จ" });
    }
  }
);

/**
 * PATCH /api/admin/applications/:id/status
 * อัปเดตสถานะใบสมัคร (pending, hired, rejected) โดย admin
 */
router.patch(
  "/applications/:id/status",
  authMiddleware,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const allowedStatuses = ["pending", "hired", "rejected"];
      if (!status || !allowedStatuses.includes(status)) {
        return res.status(400).json({
          message: "สถานะไม่ถูกต้อง (ต้องเป็น pending / hired / rejected)",
        });
      }

      const updateData = {
        status,
      };

      // ถ้าเป็นการรับเข้าทำงาน ให้บันทึกวันที่
      if (status === "hired") {
        updateData.hiredAt = new Date();
      }

      const app = await Application.findByIdAndUpdate(id, updateData, { new: true })
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
      console.error("admin PATCH /applications/:id/status error:", err);
      return res
        .status(500)
        .json({ message: "อัปเดตสถานะใบสมัครไม่สำเร็จ" });
    }
  }
);

/**
 * PATCH /api/admin/applications/:id/verify-detailed
 * อัปเดตสถานะยืนยันบัตรประชาชนแบบละเอียด (รวมข้อมูลจากบัตร)
 */
router.patch(
  "/applications/:id/verify-detailed",
  authMiddleware,
  async (req, res) => {
    try {
      if (req.user.role !== "admin") {
        return res.status(403).json({ message: "เฉพาะแอดมินเท่านั้น" });
      }

      const { id } = req.params;
      const { verified, idCardData, verificationNotes, verificationResult } = req.body;

      if (typeof verified !== "boolean") {
        return res.status(400).json({
          message: "ค่าที่ส่งมาต้องเป็น verified: true/false",
        });
      }

      if (!verificationNotes || !verificationNotes.trim()) {
        return res.status(400).json({
          message: "กรุณากรอกหมายเหตุการตรวจสอบ",
        });
      }

      // ถ้าอนุมัติ ต้องมีข้อมูลจากบัตร
      if (verified && (!idCardData || !idCardData.idNumber || !idCardData.fullName)) {
        return res.status(400).json({
          message: "กรุณากรอกข้อมูลจากบัตรประชาชนให้ครบถ้วน",
        });
      }

      const updateData = {
        idVerified: verified,
        verificationNotes: verificationNotes.trim(),
        verificationResult: verificationResult || (verified ? "approved" : "rejected"),
        verifiedAt: new Date(),
        verifiedBy: req.user.id,
      };

      // เพิ่มข้อมูลจากบัตรถ้าอนุมัติ
      if (verified && idCardData) {
        updateData.idCardData = {
          idNumber: idCardData.idNumber?.trim() || "",
          fullName: idCardData.fullName?.trim() || "",
          birthDate: idCardData.birthDate || "",
          address: idCardData.address?.trim() || "",
          issueDate: idCardData.issueDate || "",
          expiryDate: idCardData.expiryDate || "",
        };
      }

      const app = await Application.findByIdAndUpdate(id, updateData, { new: true })
        .populate("job", "title company jobCode")
        .populate("applicant", "name email")
        .populate("verifiedBy", "name email");

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
        verifierName: obj.verifiedBy?.name || "",
        verifierEmail: obj.verifiedBy?.email || "",
      };

      return res.json(result);
    } catch (err) {
      console.error("admin PATCH /applications/:id/verify-detailed error:", err);
      return res
        .status(500)
        .json({ message: "อัปเดตการยืนยันไม่สำเร็จ" });
    }
  }
);

/**
 * PATCH /api/admin/applications/:id/reject-verification
 * ปฏิเสธการยืนยันบัตรประชาชนพร้อมส่งอีเมลแจ้งเตือน
 */
router.patch(
  "/applications/:id/reject-verification",
  authMiddleware,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { reason, rejectedBy } = req.body;

      if (!reason || !reason.trim()) {
        return res.status(400).json({
          message: "กรุณาระบุเหตุผลในการปฏิเสธ",
        });
      }

      const app = await Application.findById(id)
        .populate("job", "title company jobCode")
        .populate("applicant", "name email");

      if (!app) {
        return res.status(404).json({ message: "ไม่พบใบสมัคร" });
      }

      // อัปเดตสถานะ
      const updateData = {
        idVerified: false,
        verificationStatus: "rejected",
        rejectionReason: reason.trim(),
        rejectedBy: rejectedBy || "Admin",
        rejectedAt: new Date(),
      };

      const updatedApp = await Application.findByIdAndUpdate(id, updateData, { new: true })
        .populate("job", "title company jobCode")
        .populate("applicant", "name email");

      // ส่งอีเมลแจ้งเตือน (ถ้ามี email service)
      try {
        // TODO: ส่งอีเมลแจ้งเตือนผู้สมัคร
        const emailContent = `
เรียน คุณ${app.applicantName || app.applicant?.name}

เราขออภัยที่ต้องแจ้งให้ทราบว่า การตรวจสอบบัตรประชาชนสำหรับใบสมัครงานตำแหน่ง "${app.jobTitle || app.job?.title}" ไม่ผ่านการอนุมัติ

เหตุผล: ${reason.trim()}

กรุณาอัปโหลดรูปบัตรประชาชนใหม่ที่มีความชัดเจนและข้อมูลครบถ้วน

ขอบคุณครับ
ทีมงาน AOW Job App
        `;
        
        console.log(`📧 Email notification for ${app.applicantEmail}:`, emailContent);
        
        // ในอนาคตสามารถเพิ่ม email service ได้ที่นี่
        // await sendEmail(app.applicantEmail, "การตรวจสอบบัตรประชาชนไม่ผ่าน", emailContent);
        
      } catch (emailError) {
        console.error("Send email error:", emailError);
        // ไม่ให้ email error ทำให้ API fail
      }

      const obj = updatedApp.toObject();
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
      console.error("admin PATCH /applications/:id/reject-verification error:", err);
      return res
        .status(500)
        .json({ message: "ปฏิเสธการยืนยันไม่สำเร็จ" });
    }
  }
);

/**
 * PATCH /api/admin/applications/:id/reset-verification
 * รีเซ็ตสถานะการยืนยันบัตรประชาชนกลับเป็น pending
 */
router.patch(
  "/applications/:id/reset-verification",
  authMiddleware,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { resetBy } = req.body;

      const app = await Application.findById(id);
      if (!app) {
        return res.status(404).json({ message: "ไม่พบใบสมัคร" });
      }

      // รีเซ็ตสถานะ
      const updateData = {
        idVerified: false,
        verificationStatus: "pending",
        rejectionReason: "",
        rejectedBy: "",
        rejectedAt: null,
        resetBy: resetBy || "Admin",
        resetAt: new Date(),
      };

      const updatedApp = await Application.findByIdAndUpdate(id, updateData, { new: true })
        .populate("job", "title company jobCode")
        .populate("applicant", "name email");

      const obj = updatedApp.toObject();
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
      console.error("admin PATCH /applications/:id/reset-verification error:", err);
      return res
        .status(500)
        .json({ message: "รีเซ็ตสถานะไม่สำเร็จ" });
    }
  }
);

/**
 * PATCH /api/admin/applications/:id/verify
 * อัปเดตสถานะยืนยันบัตรประชาชน (idVerified) - แบบเดิม
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

/**
 * DELETE /api/admin/applications/:id
 * ลบใบสมัครงาน (เฉพาะที่ตรวจสอบแล้ว)
 */
router.delete("/applications/:id", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "เฉพาะแอดมินเท่านั้น" });
    }

    const { id } = req.params;

    // ตรวจสอบว่าใบสมัครมีอยู่จริง
    const application = await Application.findById(id);
    if (!application) {
      return res.status(404).json({ message: "ไม่พบใบสมัครนี้" });
    }

    // ตรวจสอบว่าใบสมัครได้รับการยืนยันแล้วหรือไม่ (เพื่อความปลอดภัย)
    if (!application.idVerified) {
      return res.status(400).json({ 
        message: "สามารถลบได้เฉพาะใบสมัครที่ตรวจสอบแล้วเท่านั้น" 
      });
    }

    // ลบใบสมัคร
    await Application.findByIdAndDelete(id);

    // บันทึก log การลบ
    console.log(`🗑️ Admin ${req.user.name} (${req.user.email}) deleted application ${id} - Applicant: ${application.applicantName}`);

    return res.json({ 
      message: "ลบใบสมัครเรียบร้อยแล้ว",
      deletedApplication: {
        id: application._id,
        applicantName: application.applicantName,
        jobTitle: application.jobTitle
      }
    });
  } catch (err) {
    console.error("admin DELETE /applications/:id error:", err);
    return res
      .status(500)
      .json({ message: "ลบใบสมัครไม่สำเร็จ" });
  }
});

/**
 * GET /api/admin/verification-history
 * ดูประวัติการตรวจสอบบัตรประชาชนทั้งหมด
 */
router.get("/verification-history", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "เฉพาะแอดมินเท่านั้น" });
    }

    const applications = await Application.find({
      idCardPath: { $exists: true, $ne: "" }
    })
      .populate("job", "title company jobCode")
      .populate("applicant", "name email")
      .populate("verifiedBy", "name email")
      .sort({ createdAt: -1 });

    const verifications = applications.map(app => {
      const obj = app.toObject();
      return {
        _id: obj._id,
        applicantName: obj.applicantName || obj.applicant?.name || "",
        applicantEmail: obj.applicantEmail || obj.applicant?.email || "",
        jobTitle: obj.jobTitle || obj.job?.title || "",
        idCardPath: obj.idCardPath || "",
        idVerified: !!obj.idVerified,
        verificationResult: obj.verificationResult || "",
        verificationNotes: obj.verificationNotes || "",
        verifiedAt: obj.verifiedAt,
        verifierName: obj.verifiedBy?.name || "",
        verifierEmail: obj.verifiedBy?.email || "",
        idCardData: obj.idCardData || null,
        createdAt: obj.createdAt,
      };
    });

    return res.json({ verifications });
  } catch (err) {
    console.error("admin GET /verification-history error:", err);
    return res.status(500).json({ message: "โหลดประวัติการตรวจสอบไม่สำเร็จ" });
  }
});

/**
 * GET /api/admin/cleanup-missing-files
 * ทำความสะอาดข้อมูลที่อ้างอิงไฟล์ที่ไม่มีอยู่จริง
 */
router.get("/cleanup-missing-files", authMiddleware, requireAdmin, async (_req, res) => {
  try {
    const applications = await Application.find({
      $or: [
        { idCardPath: { $exists: true, $ne: "" } },
        { resumePath: { $exists: true, $ne: "" } }
      ]
    });

    let cleanedCount = 0;
    const missingFiles = [];

    for (const app of applications) {
      let needsUpdate = false;
      const updates = {};

      // ตรวจสอบไฟล์บัตรประชาชน
      if (app.idCardPath) {
        const idCardFullPath = `uploads/${app.idCardPath}`;
        if (!fs.existsSync(idCardFullPath)) {
          updates.idCardPath = "";
          updates.idVerified = false;
          updates.verificationResult = "";
          updates.verificationNotes = "ไฟล์บัตรประชาชนหายไป - รีเซ็ตการยืนยัน";
          needsUpdate = true;
          missingFiles.push({ type: "idCard", path: app.idCardPath, appId: app._id });
        }
      }

      // ตรวจสอบไฟล์เรซูเม่
      if (app.resumePath) {
        const resumeFullPath = `uploads/${app.resumePath}`;
        if (!fs.existsSync(resumeFullPath)) {
          updates.resumePath = "";
          needsUpdate = true;
          missingFiles.push({ type: "resume", path: app.resumePath, appId: app._id });
        }
      }

      if (needsUpdate) {
        await Application.findByIdAndUpdate(app._id, updates);
        cleanedCount++;
      }
    }

    return res.json({
      message: `ทำความสะอาดเรียบร้อย`,
      cleanedApplications: cleanedCount,
      missingFiles: missingFiles,
      totalChecked: applications.length
    });
  } catch (err) {
    console.error("admin cleanup-missing-files error:", err);
    return res.status(500).json({ message: "ทำความสะอาดไม่สำเร็จ" });
  }
});

/* ------------------------------------------------------------------
 *  Email Validation Management (จัดการอีเมลปลอม/น่าสงสัย)
 * -----------------------------------------------------------------*/

/**
 * GET /api/admin/suspicious-users
 * ดึงรายชื่อผู้ใช้ที่มีอีเมลน่าสงสัยหรือต้องการตรวจสอบ
 */
router.get("/suspicious-users", authMiddleware, requireAdmin, async (req, res) => {
  console.log("🔍 DEBUG: suspicious-users endpoint called");
  try {
    const { status = 'all', sortBy = 'createdAt', order = 'desc' } = req.query;
    
    let filter = {};
    
    // กรองตามสถานะ
    if (status === 'suspicious') {
      filter = {
        $or: [
          { 'emailValidation.isSuspicious': true },
          { 'emailValidation.isDisposable': true },
          { 'emailValidation.validationScore': { $lt: 50 } }
        ]
      };
    } else if (status === 'review') {
      filter.requiresReview = true;
    } else if (status === 'suspended') {
      filter.isSuspended = true;
    }
    
    const sortOrder = order === 'desc' ? -1 : 1;
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder;
    
    const users = await User.find(filter)
      .select('name email role isActive createdAt emailValidation requiresReview isSuspended suspensionReason suspendedAt reviewNotes registrationIP')
      .populate('suspendedBy', 'name email')
      .populate('reviewedBy', 'name email')
      .sort(sortOptions)
      .limit(100); // จำกัดผลลัพธ์
    
    // คำนวณสถิติ
    const stats = {
      total: users.length,
      suspicious: users.filter(u => u.emailValidation?.isSuspicious || u.emailValidation?.isDisposable).length,
      needsReview: users.filter(u => u.requiresReview).length,
      suspended: users.filter(u => u.isSuspended).length,
      lowScore: users.filter(u => u.emailValidation?.validationScore < 50).length,
    };
    
    return res.json({ users, stats });
  } catch (err) {
    console.error("admin /suspicious-users error:", err);
    return res.status(500).json({ message: "ดึงรายชื่อผู้ใช้น่าสงสัยไม่สำเร็จ" });
  }
});

/**
 * POST /api/admin/validate-email
 * ตรวจสอบอีเมลด้วย email validator
 */
router.post("/validate-email", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: "กรุณาระบุอีเมลที่ต้องการตรวจสอบ" });
    }
    
    const validation = await validateEmail(email);
    
    return res.json({ validation });
  } catch (err) {
    console.error("admin /validate-email error:", err);
    return res.status(500).json({ message: "ตรวจสอบอีเมลไม่สำเร็จ" });
  }
});

/**
 * POST /api/admin/validate-users-batch
 * ตรวจสอบอีเมลผู้ใช้ทั้งหมดแบบ batch
 */
router.post("/validate-users-batch", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { limit = 50 } = req.body;
    
    // ดึงผู้ใช้ที่ยังไม่ได้ตรวจสอบ หรือตรวจสอบนานแล้ว
    const users = await User.find({
      $or: [
        { 'emailValidation.validationScore': { $exists: false } },
        { 'emailValidation.validatedAt': { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } // 30 วันที่แล้ว
      ]
    })
    .select('_id email emailValidation')
    .limit(limit);
    
    if (users.length === 0) {
      return res.json({ 
        message: "ไม่มีผู้ใช้ที่ต้องตรวจสอบ", 
        processed: 0,
        results: [] 
      });
    }
    
    const emails = users.map(u => u.email);
    const validations = await validateEmailBatch(emails);
    
    // อัปเดตข้อมูลในฐานข้อมูล
    const updatePromises = users.map(async (user, index) => {
      const validation = validations[index];
      if (validation && !validation.error) {
        const updateData = {
          emailValidation: {
            isDisposable: validation.isDisposable,
            isSuspicious: validation.isSuspicious,
            domain: validation.domain,
            validationScore: validation.score,
            validationNotes: validation.notes,
            validatedAt: new Date(),
          },
          requiresReview: validation.requiresReview,
        };
        
        // ถ้าคะแนนต่ำมาก ให้ suspend
        if (validation.score < 30) {
          updateData.isSuspended = true;
          updateData.suspensionReason = 'Automatic suspension due to suspicious email pattern';
          updateData.suspendedAt = new Date();
        }
        
        return User.findByIdAndUpdate(user._id, updateData);
      }
    });
    
    await Promise.all(updatePromises);
    
    return res.json({
      message: `ตรวจสอบอีเมลเรียบร้อย`,
      processed: users.length,
      results: validations,
      suspicious: validations.filter(v => v.status === 'suspicious' || v.status === 'disposable').length,
      needsReview: validations.filter(v => v.requiresReview).length,
    });
  } catch (err) {
    console.error("admin /validate-users-batch error:", err);
    return res.status(500).json({ message: "ตรวจสอบอีเมลแบบ batch ไม่สำเร็จ" });
  }
});

/**
 * PATCH /api/admin/users/:id/suspend
 * ระงับบัญชีผู้ใช้
 */
router.patch("/users/:id/suspend", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, permanent = false } = req.body;
    
    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: "กรุณาระบุเหตุผลในการระงับบัญชี" });
    }
    
    const myId = getMyId(req);
    
    // กันแอดมินระงับตัวเอง
    if (id === String(myId)) {
      return res.status(400).json({
        message: "เพื่อความปลอดภัย ระบบไม่อนุญาตให้คุณระงับบัญชีตัวเอง",
      });
    }
    
    const updateData = {
      isSuspended: true,
      suspensionReason: reason.trim(),
      suspendedAt: new Date(),
      suspendedBy: myId,
      isActive: false, // ปิดการใช้งานด้วย
    };
    
    if (permanent) {
      updateData.suspensionType = 'permanent';
    }
    
    const user = await User.findByIdAndUpdate(id, updateData, { new: true })
      .select('name email role isActive isSuspended suspensionReason suspendedAt emailValidation')
      .populate('suspendedBy', 'name email');
    
    if (!user) {
      return res.status(404).json({ message: "ไม่พบผู้ใช้" });
    }
    
    console.log(`🚫 User suspended: ${user.email} by admin ${req.admin.email} - Reason: ${reason}`);
    
    return res.json({
      message: `ระงับบัญชี ${user.name} (${user.email}) เรียบร้อยแล้ว`,
      user
    });
  } catch (err) {
    console.error("admin PATCH /users/:id/suspend error:", err);
    return res.status(500).json({ message: "ระงับบัญชีไม่สำเร็จ" });
  }
});

/**
 * PATCH /api/admin/users/:id/unsuspend
 * ยกเลิกการระงับบัญชีผู้ใช้
 */
router.patch("/users/:id/unsuspend", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    
    const updateData = {
      isSuspended: false,
      suspensionReason: '',
      suspendedAt: null,
      suspendedBy: null,
      isActive: true, // เปิดการใช้งานกลับ
      unsuspendedAt: new Date(),
      unsuspendedBy: getMyId(req),
    };
    
    if (notes) {
      updateData.reviewNotes = updateData.reviewNotes || [];
      updateData.reviewNotes.push(`Unsuspended: ${notes.trim()}`);
    }
    
    const user = await User.findByIdAndUpdate(id, updateData, { new: true })
      .select('name email role isActive isSuspended emailValidation')
      .populate('unsuspendedBy', 'name email');
    
    if (!user) {
      return res.status(404).json({ message: "ไม่พบผู้ใช้" });
    }
    
    console.log(`✅ User unsuspended: ${user.email} by admin ${req.admin.email}`);
    
    return res.json({
      message: `ยกเลิกการระงับบัญชี ${user.name} (${user.email}) เรียบร้อยแล้ว`,
      user
    });
  } catch (err) {
    console.error("admin PATCH /users/:id/unsuspend error:", err);
    return res.status(500).json({ message: "ยกเลิกการระงับบัญชีไม่สำเร็จ" });
  }
});

/**
 * PATCH /api/admin/users/:id/review
 * ทำการตรวจสอบและให้คะแนนผู้ใช้
 */
router.patch("/users/:id/review", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { approved, notes, newScore } = req.body;
    
    if (typeof approved !== 'boolean') {
      return res.status(400).json({ message: "กรุณาระบุผลการตรวจสอบ (approved: true/false)" });
    }
    
    if (!notes || !notes.trim()) {
      return res.status(400).json({ message: "กรุณากรอกหมายเหตุการตรวจสอบ" });
    }
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "ไม่พบผู้ใช้" });
    }
    
    const updateData = {
      requiresReview: false,
      reviewedAt: new Date(),
      reviewedBy: getMyId(req),
      reviewNotes: user.reviewNotes || [],
    };
    
    updateData.reviewNotes.push(`${new Date().toISOString()}: ${notes.trim()}`);
    
    // อัปเดตคะแนนถ้ามี
    if (typeof newScore === 'number' && newScore >= 0 && newScore <= 100) {
      updateData['emailValidation.validationScore'] = newScore;
      updateData.reviewNotes.push(`Score updated to: ${newScore}`);
    }
    
    // ถ้าไม่อนุมัติ ให้ระงับบัญชี
    if (!approved) {
      updateData.isSuspended = true;
      updateData.suspensionReason = `Manual review rejection: ${notes.trim()}`;
      updateData.suspendedAt = new Date();
      updateData.suspendedBy = getMyId(req);
      updateData.isActive = false;
    } else {
      // ถ้าอนุมัติ ให้ยกเลิกการระงับ (ถ้ามี)
      updateData.isSuspended = false;
      updateData.suspensionReason = '';
      updateData.suspendedAt = null;
      updateData.suspendedBy = null;
      updateData.isActive = true;
    }
    
    const updatedUser = await User.findByIdAndUpdate(id, updateData, { new: true })
      .select('name email role isActive isSuspended requiresReview emailValidation reviewNotes')
      .populate('reviewedBy', 'name email');
    
    console.log(`🔍 User reviewed: ${updatedUser.email} by admin ${req.admin.email} - Approved: ${approved}`);
    
    return res.json({
      message: `ตรวจสอบผู้ใช้ ${updatedUser.name} (${updatedUser.email}) เรียบร้อยแล้ว`,
      user: updatedUser,
      approved
    });
  } catch (err) {
    console.error("admin PATCH /users/:id/review error:", err);
    return res.status(500).json({ message: "ตรวจสอบผู้ใช้ไม่สำเร็จ" });
  }
});

/**
 * GET /api/admin/email-stats
 * สถิติการตรวจสอบอีเมล
 */
router.get("/email-stats", authMiddleware, requireAdmin, async (req, res) => {
  console.log("🔍 DEBUG: email-stats endpoint called");
  try {
    const [
      totalUsers,
      disposableEmails,
      suspiciousEmails,
      lowScoreEmails,
      needsReview,
      suspended,
      trustedEmails,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ 'emailValidation.isDisposable': true }),
      User.countDocuments({ 'emailValidation.isSuspicious': true }),
      User.countDocuments({ 'emailValidation.validationScore': { $lt: 50 } }),
      User.countDocuments({ requiresReview: true }),
      User.countDocuments({ isSuspended: true }),
      User.countDocuments({ 'emailValidation.validationScore': { $gte: 70 } }),
    ]);
    
    // สถิติ domain ที่พบบ่อย
    const domainStats = await User.aggregate([
      { $match: { 'emailValidation.domain': { $exists: true } } },
      { $group: { _id: '$emailValidation.domain', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    // สถิติการสมัครรายวัน (7 วันล่าสุด)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const dailyRegistrations = await User.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          total: { $sum: 1 },
          suspicious: {
            $sum: {
              $cond: [
                { $or: [
                  { $eq: ['$emailValidation.isDisposable', true] },
                  { $eq: ['$emailValidation.isSuspicious', true] },
                  { $lt: ['$emailValidation.validationScore', 50] }
                ]},
                1,
                0
              ]
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    return res.json({
      overview: {
        totalUsers,
        disposableEmails,
        suspiciousEmails,
        lowScoreEmails,
        needsReview,
        suspended,
        trustedEmails,
        validationCoverage: Math.round((totalUsers - (totalUsers - disposableEmails - suspiciousEmails - trustedEmails)) / totalUsers * 100)
      },
      topDomains: domainStats,
      dailyRegistrations,
      generatedAt: new Date()
    });
  } catch (err) {
    console.error("admin /email-stats error:", err);
    return res.status(500).json({ message: "ดึงสถิติอีเมลไม่สำเร็จ" });
  }
});

export default router;

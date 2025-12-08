// backend/routes/profileRoutes.js
import express from "express";
import multer from "multer";
import path from "path";
import { authMiddleware } from "../middleware/auth.js";
import User from "../models/User.js";

const router = express.Router();

/* ========= MULTER สำหรับอัปโหลดเรซูเม่ ========= */

const resumeStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads"); // ใช้โฟลเดอร์เดียวกับที่ server.js ตั้ง static ไว้
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    const safeExt = ext || ".pdf";
    cb(null, `resume_${req.user.id}_${Date.now()}${safeExt}`);
  },
});

const uploadResume = multer({
  storage: resumeStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

/* ========= MULTER สำหรับอัปโหลดรูปโปรไฟล์ ========= */
// แนะนำให้สร้างโฟลเดอร์ uploads/profile ไว้ล่วงหน้า
const photoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads");           // ✅ เปลี่ยนจาก uploads/profile → uploads
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    const safeExt = ext || ".jpg";
    cb(null, `photo_${req.user.id}_${Date.now()}${safeExt}`);
  },
});
const uploadPhoto = multer({
  storage: photoStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("ไฟล์ต้องเป็นรูปภาพเท่านั้น"));
    }
    cb(null, true);
  },
});

/* ========= GET /api/profile/me ========= */
// ใช้ให้ผู้ใช้ดูโปรไฟล์ตัวเอง (JobSeekerView / modal โปรไฟล์)

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "name email role profile"
    );
    if (!user) {
      return res.status(404).json({ message: "ไม่พบผู้ใช้" });
    }

    const p = user.profile || {};

    return res.json({
      fullName: p.fullName || user.name || "",
      headline: p.headline || "",
      location: p.location || "",
      phone: p.phone || "",
      skillsText: p.skillsText || "",
      experience: p.experience || "",
      resumeUrl: p.resumeUrl || "",
      photoUrl: p.photoUrl || "", // ✅ ส่งลิงก์รูปโปรไฟล์ไปให้ frontend
    });
  } catch (e) {
    console.error("GET /api/profile/me error:", e);
    return res.status(500).json({ message: "เกิดข้อผิดพลาดภายในระบบ" });
  }
});

/* ========= PUT /api/profile/me ========= */
// บันทึก/แก้ไขโปรไฟล์ของตัวเอง

router.put("/me", authMiddleware, async (req, res) => {
  try {
    const {
      fullName = "",
      headline = "",
      location = "",
      phone = "",
      skillsText = "",
      experience = "",
      resumeUrl,
      photoUrl, // ✅ รับค่าจาก body ด้วย (กรณีใช้ลิงก์รูปเอง)
    } = req.body || {};

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "ไม่พบผู้ใช้" });
    }

    const current = user.profile || {};

    user.profile = {
      ...current,
      fullName,
      headline,
      location,
      phone,
      skillsText,
      experience,
      ...(typeof resumeUrl === "string" && resumeUrl.trim()
        ? { resumeUrl }
        : {}),
      ...(typeof photoUrl === "string" && photoUrl.trim()
        ? { photoUrl }
        : {}),
    };

        await user.save();

        return res.json({
          message: "บันทึกโปรไฟล์เรียบร้อยแล้ว",
          profile: user.profile,
          photoUrl: user.profile?.photoUrl || "",
        });

  } catch (e) {
    console.error("PUT /api/profile/me error:", e);
    return res.status(500).json({ message: "บันทึกโปรไฟล์ไม่สำเร็จ" });
  }
});

/* ========= POST /api/profile/me/resume ========= */
// อัปโหลดไฟล์เรซูเม่ + อัพเดต profile.resumeUrl

router.post(
  "/me/resume",
  authMiddleware,
  uploadResume.single("resume"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "ไม่พบไฟล์เรซูเม่" });
      }

      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "ไม่พบผู้ใช้" });
      }

      const resumePath = (req.file.path || "").replace(/\\/g, "/");

      user.profile = {
        ...(user.profile || {}),
        resumeUrl: resumePath,
      };

      await user.save();

      return res.json({
        message: "อัปโหลดเรซูเม่เรียบร้อยแล้ว",
        resumeUrl: resumePath,
      });
    } catch (e) {
      console.error("POST /api/profile/me/resume error:", e);
      return res
        .status(500)
        .json({ message: "อัปโหลดเรซูเม่ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" });
    }
  }
);

/* ========= POST /api/profile/me/photo ========= */
// อัปโหลดรูปโปรไฟล์ + อัพเดต profile.photoUrl

router.post(
  "/me/photo",
  authMiddleware,
  uploadPhoto.single("photo"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "ไม่พบไฟล์รูปโปรไฟล์" });
      }

      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "ไม่พบผู้ใช้" });
      }

      // path ที่จะให้ frontend ใช้โหลด (server.js ต้องมี app.use("/uploads", express.static("uploads")))
      const photoPath = (req.file.path || "").replace(/\\/g, "/");

      user.profile = {
        ...(user.profile || {}),
        photoUrl: photoPath,
      };

      await user.save();

      return res.json({
        message: "อัปโหลดรูปโปรไฟล์เรียบร้อยแล้ว",
        photoUrl: photoPath,
      });
    } catch (e) {
      console.error("POST /api/profile/me/photo error:", e);
      return res
        .status(500)
        .json({ message: "อัปโหลดรูปโปรไฟล์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" });
    }
  }
);

/* ========= GET /api/profile/:userId (เฉพาะ admin + employer) ========= */
// ให้ admin / employer เปิดดูโปรไฟล์ของคนอื่นได้ (รวมรูปด้วย)

router.get("/:userId", authMiddleware, async (req, res) => {
  try {
    if (!["admin", "employer"].includes(req.user.role)) {
      return res.status(403).json({ message: "ไม่มีสิทธิ์ดูโปรไฟล์นี้" });
    }

    const user = await User.findById(req.params.userId).select(
      "name email role profile"
    );
    if (!user) {
      return res.status(404).json({ message: "ไม่พบผู้ใช้" });
    }

    return res.json({
      name: user.name,
      email: user.email,
      role: user.role,
      profile: user.profile || {},
    });
  } catch (e) {
    console.error("GET /api/profile/:userId error:", e);
    return res.status(500).json({ message: "เกิดข้อผิดพลาดภายในระบบ" });
  }
});

export default router;

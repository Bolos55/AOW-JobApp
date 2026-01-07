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
    cb(null, "uploads");           // ✅ ใช้ uploads เหมือนเดิม
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
    fileSize: 10 * 1024 * 1024, // เพิ่มเป็น 10MB
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
    console.log("📥 GET /api/profile/me - User ID:", req.user.id, "Role:", req.user.role);
    
    const user = await User.findById(req.user.id).select(
      "name email role profile"
    );
    if (!user) {
      console.log("❌ User not found:", req.user.id);
      return res.status(404).json({ message: "ไม่พบผู้ใช้" });
    }

    const p = user.profile || {};
    console.log("📥 Profile from database:", p);

    // ส่งข้อมูลตาม role
    if (user.role === "employer") {
      // Employer profile
      const response = {
        companyName: p.companyName || user.name || "",
        businessType: p.businessType || "",
        description: p.description || "",
        address: p.address || "",
        phone: p.phone || "",
        website: p.website || "",
        employeeCount: p.employeeCount || "",
        logoUrl: p.logoUrl || "",
      };
      
      console.log("📥 Employer response to frontend:", response);
      return res.json(response);
    } else {
      // JobSeeker profile (เดิม)
      const response = {
        fullName: p.fullName || user.name || "",
        headline: p.headline || "",
        location: p.location || "",
        phone: p.phone || "",
        skillsText: p.skillsText || "",
        experience: p.experience || "",
        resumeUrl: p.resumeUrl || "",
        photoUrl: p.photoUrl || "",
      };
      
      console.log("📥 JobSeeker response to frontend:", response);
      return res.json(response);
    }
  } catch (e) {
    console.error("❌ GET /api/profile/me error:", e);
    return res.status(500).json({ message: "เกิดข้อผิดพลาดภายในระบบ" });
  }
});

/* ========= PUT /api/profile/me ========= */
// บันทึก/แก้ไขโปรไฟล์ของตัวเอง

router.put("/me", authMiddleware, async (req, res) => {
  try {
    console.log("📤 PUT /api/profile/me - User ID:", req.user.id, "Role:", req.user.role);
    console.log("📤 PUT /api/profile/me - Payload:", req.body);

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "ไม่พบผู้ใช้" });
    }

    console.log("📤 Current profile before update:", user.profile);

    const current = user.profile || {};

    if (user.role === "employer") {
      // Employer profile update
      const {
        companyName = "",
        businessType = "",
        description = "",
        address = "",
        phone = "",
        website = "",
        employeeCount = "",
        logoUrl,
      } = req.body || {};

      const newProfile = {
        companyName: companyName || current.companyName || "",
        businessType: businessType || current.businessType || "",
        description: description || current.description || "",
        address: address || current.address || "",
        phone: phone || current.phone || "",
        website: website || current.website || "",
        employeeCount: employeeCount || current.employeeCount || "",
        logoUrl: (typeof logoUrl === "string" && logoUrl.trim()) ? logoUrl : (current.logoUrl || ""),
      };

      user.profile = newProfile;
    } else {
      // JobSeeker profile update (เดิม)
      const {
        fullName = "",
        headline = "",
        location = "",
        phone = "",
        skillsText = "",
        experience = "",
        resumeUrl,
        photoUrl,
      } = req.body || {};

      const newProfile = {
        fullName: fullName || current.fullName || "",
        headline: headline || current.headline || "",
        location: location || current.location || "",
        phone: phone || current.phone || "",
        skillsText: skillsText || current.skillsText || "",
        experience: experience || current.experience || "",
        resumeUrl: (typeof resumeUrl === "string" && resumeUrl.trim()) ? resumeUrl : (current.resumeUrl || ""),
        photoUrl: (typeof photoUrl === "string" && photoUrl.trim()) ? photoUrl : (current.photoUrl || ""),
      };

      user.profile = newProfile;
    }

    console.log("📤 New profile to save:", user.profile);

        try {
          await user.save();
          console.log("✅ Profile saved successfully");
          
          // ตรวจสอบว่าบันทึกจริงหรือไม่
          const savedUser = await User.findById(req.user.id);
          console.log("📤 Profile after save:", savedUser.profile);
          
        } catch (saveError) {
          console.error("❌ Error saving user profile:", saveError);
          return res.status(500).json({ 
            message: "เกิดข้อผิดพลาดในการบันทึกโปรไฟล์", 
            error: saveError.message 
          });
        }

        return res.json({
          message: user.role === "employer" ? "บันทึกข้อมูลบริษัทเรียบร้อยแล้ว" : "บันทึกโปรไฟล์เรียบร้อยแล้ว",
          profile: user.profile,
          photoUrl: user.profile?.photoUrl || user.profile?.logoUrl || "",
        });

  } catch (e) {
    console.error("❌ PUT /api/profile/me error:", e);
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
      console.log("📄 POST /api/profile/me/resume - User ID:", req.user.id);
      console.log("📄 Uploaded file:", req.file);
      
      if (!req.file) {
        console.log("❌ No resume file found in request");
        return res.status(400).json({ message: "ไม่พบไฟล์เรซูเม่" });
      }

      const user = await User.findById(req.user.id);
      if (!user) {
        console.log("❌ User not found:", req.user.id);
        return res.status(404).json({ message: "ไม่พบผู้ใช้" });
      }

      const resumePath = (req.file.path || "").replace(/\\/g, "/");
      console.log("📄 Resume path to save:", resumePath);

      user.profile = {
        ...(user.profile || {}),
        resumeUrl: resumePath,
      };

      console.log("📄 Profile before save:", user.profile);
      await user.save();
      console.log("✅ Resume profile saved successfully");

      return res.json({
        message: "อัปโหลดเรซูเม่เรียบร้อยแล้ว",
        resumeUrl: resumePath,
      });
    } catch (e) {
      console.error("❌ POST /api/profile/me/resume error:", e);
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
  (req, res, next) => {
    uploadPhoto.single("photo")(req, res, (err) => {
      if (err) {
        console.log("❌ Multer error:", err);
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: "ไฟล์รูปใหญ่เกินไป (สูงสุด 10MB)" });
        }
        return res.status(400).json({ message: err.message || "อัปโหลดรูปไม่สำเร็จ" });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      console.log("📸 POST /api/profile/me/photo - User ID:", req.user.id);
      console.log("📸 Uploaded file:", req.file);
      
      if (!req.file) {
        console.log("❌ No file found in request");
        return res.status(400).json({ message: "ไม่พบไฟล์รูปโปรไฟล์" });
      }

      const user = await User.findById(req.user.id);
      if (!user) {
        console.log("❌ User not found:", req.user.id);
        return res.status(404).json({ message: "ไม่พบผู้ใช้" });
      }

      // path ที่จะให้ frontend ใช้โหลด (server.js ต้องมี app.use("/uploads", express.static("uploads")))
      const photoPath = (req.file.path || "").replace(/\\/g, "/");
      console.log("📸 Photo path to save:", photoPath);

      user.profile = {
        ...(user.profile || {}),
        photoUrl: photoPath,
      };

      console.log("📸 Profile before save:", user.profile);
      await user.save();
      console.log("✅ Photo profile saved successfully");

      return res.json({
        message: "อัปโหลดรูปโปรไฟล์เรียบร้อยแล้ว",
        photoUrl: photoPath,
      });
    } catch (e) {
      console.error("❌ POST /api/profile/me/photo error:", e);
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
    console.log("👁️ GET /api/profile/:userId - Viewer:", req.user.id, "Target:", req.params.userId);
    
    if (!["admin", "employer"].includes(req.user.role)) {
      console.log("❌ Access denied - Role:", req.user.role);
      return res.status(403).json({ message: "ไม่มีสิทธิ์ดูโปรไฟล์นี้" });
    }

    const user = await User.findById(req.params.userId).select(
      "name email role profile"
    );
    if (!user) {
      console.log("❌ User not found:", req.params.userId);
      return res.status(404).json({ message: "ไม่พบผู้ใช้" });
    }

    console.log("👁️ Profile data:", {
      name: user.name,
      email: user.email,
      role: user.role,
      profile: user.profile
    });

    return res.json({
      name: user.name,
      email: user.email,
      role: user.role,
      profile: user.profile || {},
    });
  } catch (e) {
    console.error("❌ GET /api/profile/:userId error:", e);
    return res.status(500).json({ message: "เกิดข้อผิดพลาดภายในระบบ" });
  }
});

export default router;

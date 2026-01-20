// backend/routes/profileRoutes.js
import express from "express";
import { authMiddleware } from "../middleware/auth.js";
import User from "../models/User.js";

// Import rate limiting
import { uploadRateLimit } from "../middleware/security.js";

// ✅ Import Cloudinary upload configurations
import { uploadPhoto, uploadResume, isCloudinaryConfigured } from "../config/cloudinary.js";

const router = express.Router();

/* ========= GET /api/profile/me ========= */
// ใช้ให้ผู้ใช้ดูโปรไฟล์ตัวเอง (JobSeekerView / modal โปรไฟล์)

router.get("/me", authMiddleware, async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log("📥 GET /api/profile/me - User ID:", req.user.id, "Role:", req.user.role);
    }
    
    const user = await User.findById(req.user.id).select(
      "name email role profile"
    );
    if (!user) {
      if (process.env.NODE_ENV === 'development') {
        console.log("❌ User not found:", req.user.id);
      }
      return res.status(404).json({ message: "ไม่พบผู้ใช้" });
    }

    const p = user.profile || {};
    if (process.env.NODE_ENV === 'development') {
      console.log("📥 Profile from database:", p);
    }

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
      
      if (process.env.NODE_ENV === 'development') {
        console.log("📥 Employer response to frontend:", response);
      }
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
      
      if (process.env.NODE_ENV === 'development') {
        console.log("📥 JobSeeker response to frontend:", response);
      }
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
    if (process.env.NODE_ENV === 'development') {
      console.log("📤 PUT /api/profile/me - User ID:", req.user.id, "Role:", req.user.role);
      console.log("📤 PUT /api/profile/me - Payload:", req.body);
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "ไม่พบผู้ใช้" });
    }

    if (process.env.NODE_ENV === 'development') {
      console.log("📤 Current profile before update:", user.profile);
    }

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

    if (process.env.NODE_ENV === 'development') {
      console.log("📤 New profile to save:", user.profile);
    }

        try {
          await user.save();
          if (process.env.NODE_ENV === 'development') {
            console.log("✅ Profile saved successfully");
          }
          
          // ตรวจสอบว่าบันทึกจริงหรือไม่
          if (process.env.NODE_ENV === 'development') {
            const savedUser = await User.findById(req.user.id);
            console.log("📤 Profile after save:", savedUser.profile);
          }
          
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
      if (process.env.NODE_ENV === 'development') {
        console.log("📄 POST /api/profile/me/resume - User ID:", req.user.id);
        console.log("📄 Uploaded file:", req.file);
      }
      
      if (!req.file) {
        if (process.env.NODE_ENV === 'development') {
          console.log("❌ No resume file found in request");
        }
        return res.status(400).json({ message: "ไม่พบไฟล์เรซูเม่" });
      }

      const user = await User.findById(req.user.id);
      if (!user) {
        if (process.env.NODE_ENV === 'development') {
          console.log("❌ User not found:", req.user.id);
        }
        return res.status(404).json({ message: "ไม่พบผู้ใช้" });
      }

      // ✅ Generate full URL for both Cloudinary and local storage
      let resumeUrl;
      if (isCloudinaryConfigured) {
        // Cloudinary returns full URL
        resumeUrl = req.file.path;
      } else {
        // Local storage - generate full URL
        const API_BASE = process.env.NODE_ENV === 'production' 
          ? 'https://aow-jobapp-backend.onrender.com'
          : 'http://localhost:5000';
        resumeUrl = `${API_BASE}/uploads/${req.file.filename}`;
      }
      if (process.env.NODE_ENV === 'development') {
        console.log("📄 Resume URL from Cloudinary:", resumeUrl);
      }

      user.profile = {
        ...(user.profile || {}),
        resumeUrl: resumeUrl,
      };

      if (process.env.NODE_ENV === 'development') {
        console.log("📄 Profile before save:", user.profile);
      }
      await user.save();
      if (process.env.NODE_ENV === 'development') {
        console.log("✅ Resume profile saved successfully");
      }

      return res.json({
        message: "อัปโหลดเรซูเม่เรียบร้อยแล้ว",
        resumeUrl: resumeUrl,
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

router.post("/me/photo", authMiddleware, (req, res) => {
  console.log("🔥 HIT /me/photo - Starting upload");
  console.log("🔥 User ID:", req.user.id);
  console.log("🔥 Cloudinary configured:", isCloudinaryConfigured);
  
  // ✅ Proper multer error handling
  uploadPhoto.single("photo")(req, res, async (uploadError) => {
    // ✅ Handle multer/upload errors first
    if (uploadError) {
      console.error("❌ Multer/Upload error:", uploadError);
      console.error("❌ Error type:", uploadError.code);
      console.error("❌ Error message:", uploadError.message);
      console.error("❌ Error stack:", uploadError.stack);
      
      // ✅ Return proper error response (prevents 502)
      return res.status(400).json({
        message: uploadError.message || "อัปโหลดรูปไม่สำเร็จ",
        error: uploadError.code || "UPLOAD_ERROR",
        details: process.env.NODE_ENV === 'development' ? uploadError.stack : undefined
      });
    }

    try {
      console.log("📸 Upload successful, processing...");
      console.log("📸 File received:", req.file ? "✅ Yes" : "❌ No");
      
      if (!req.file) {
        console.log("❌ No file in request");
        return res.status(400).json({ message: "ไม่พบไฟล์รูปโปรไฟล์" });
      }

      console.log("📸 File details:", {
        filename: req.file.filename || req.file.originalname,
        path: req.file.path,
        size: req.file.size,
        mimetype: req.file.mimetype
      });

      // ✅ Find user
      const user = await User.findById(req.user.id);
      if (!user) {
        console.log("❌ User not found:", req.user.id);
        return res.status(404).json({ message: "ไม่พบผู้ใช้" });
      }

      // ✅ Generate photoUrl
      let photoUrl;
      if (isCloudinaryConfigured) {
        photoUrl = req.file.path; // Cloudinary URL
        console.log("📸 Cloudinary URL:", photoUrl);
      } else {
        const API_BASE = process.env.NODE_ENV === 'production' 
          ? 'https://aow-jobapp-backend.onrender.com'
          : 'http://localhost:5000';
        photoUrl = `${API_BASE}/uploads/photos/${req.file.filename}`;
        console.log("📸 Local URL:", photoUrl);
      }

      // ✅ Save to database
      user.profile = {
        ...(user.profile || {}),
        photoUrl: photoUrl,
      };

      await user.save();
      console.log("✅ Photo saved successfully");

      // ✅ Return success response
      return res.status(200).json({
        photoUrl: photoUrl,
        message: "อัปโหลดรูปโปรไฟล์เรียบร้อยแล้ว",
        success: true
      });

    } catch (dbError) {
      console.error("❌ Database error:", dbError);
      console.error("❌ DB Error stack:", dbError.stack);
      
      return res.status(500).json({
        message: "เกิดข้อผิดพลาดในการบันทึกข้อมูล",
        error: "DATABASE_ERROR",
        details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
      });
    }
  });
});

/* ========= DELETE /api/profile/me/photo ========= */
// ลบรูปโปรไฟล์ + อัพเดต profile.photoUrl เป็นค่าว่าง

router.delete("/me/photo", authMiddleware, async (req, res) => {
  try {
    console.log("🗑️ DELETE /api/profile/me/photo - User ID:", req.user.id);
    
    const user = await User.findById(req.user.id);
    if (!user) {
      console.log("❌ User not found:", req.user.id);
      return res.status(404).json({ message: "ไม่พบผู้ใช้" });
    }

    // ✅ Clear photoUrl from database
    user.profile = {
      ...(user.profile || {}),
      photoUrl: "",
    };

    await user.save();
    console.log("✅ Photo deleted from profile successfully");

    return res.status(200).json({
      message: "ลบรูปโปรไฟล์เรียบร้อยแล้ว",
      photoUrl: "",
      success: true
    });

  } catch (dbError) {
    console.error("❌ Database error:", dbError);
    
    return res.status(500).json({
      message: "เกิดข้อผิดพลาดในการลบรูปโปรไฟล์",
      error: "DATABASE_ERROR",
      details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
    });
  }
});

/* ========= GET /api/profile/me/photo-status ========= */
// Check if user's photo is using Cloudinary or local storage
router.get("/me/photo-status", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("profile");
    if (!user) {
      return res.status(404).json({ message: "ไม่พบผู้ใช้" });
    }

    const photoUrl = user.profile?.photoUrl || "";
    const isCloudinary = photoUrl.startsWith("https://res.cloudinary.com/");
    const isLocal = photoUrl.includes("/uploads/") && !photoUrl.startsWith("http");
    
    return res.json({
      hasPhoto: !!photoUrl,
      photoUrl: photoUrl,
      isCloudinary: isCloudinary,
      isLocal: isLocal,
      needsReupload: isLocal,
      cloudinaryConfigured: isCloudinaryConfigured,
      message: isLocal ? "รูปโปรไฟล์ของคุณอยู่ในระบบเก่า กรุณาอัปโหลดใหม่เพื่อความเสถียร" : "รูปโปรไฟล์ของคุณอยู่ในระบบใหม่แล้ว"
    });
  } catch (e) {
    console.error("❌ GET /api/profile/me/photo-status error:", e);
    return res.status(500).json({ message: "เกิดข้อผิดพลาดภายในระบบ" });
  }
});
// ให้ admin / employer เปิดดูโปรไฟล์ของคนอื่นได้ (รวมรูปด้วย)

router.get("/:userId", authMiddleware, async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log("👁️ GET /api/profile/:userId - Viewer:", req.user.id, "Target:", req.params.userId);
    }
    
    if (!["admin", "employer"].includes(req.user.role)) {
      if (process.env.NODE_ENV === 'development') {
        console.log("❌ Access denied - Role:", req.user.role);
      }
      return res.status(403).json({ message: "ไม่มีสิทธิ์ดูโปรไฟล์นี้" });
    }

    const user = await User.findById(req.params.userId).select(
      "name email role profile"
    );
    if (!user) {
      if (process.env.NODE_ENV === 'development') {
        console.log("❌ User not found:", req.params.userId);
      }
      return res.status(404).json({ message: "ไม่พบผู้ใช้" });
    }

    if (process.env.NODE_ENV === 'development') {
      console.log("👁️ Profile data:", {
        name: user.name,
        email: user.email,
        role: user.role,
        profile: user.profile
      });
    }

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

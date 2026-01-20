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

router.post(
  "/me/photo",
  (req, res, next) => {
    console.log("🔥 HIT /me/photo - Request received");
    console.log("🔥 Headers:", req.headers);
    console.log("🔥 Cloudinary configured:", isCloudinaryConfigured);
    next();
  },
  authMiddleware,
  (req, res, next) => {
    // ✅ Wrap multer in try-catch to prevent crashes
    uploadPhoto.single("photo")(req, res, (err) => {
      if (err) {
        console.error("❌ Multer/Upload error:", err);
        console.error("❌ Error stack:", err.stack);
        
        // ✅ Send proper error response with CORS headers
        res.status(400).json({ 
          message: err.message || "อัปโหลดรูปไม่สำเร็จ",
          error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
        return;
      }
      next();
    });
  },
  async (req, res) => {
    try {
      console.log("📸 Processing photo upload...");
      console.log("📸 User ID:", req.user.id);
      console.log("📸 File received:", req.file ? "✅ Yes" : "❌ No");
      
      if (!req.file) {
        console.log("❌ No file found in request");
        return res.status(400).json({ message: "ไม่พบไฟล์รูปโปรไฟล์" });
      }

      console.log("📸 File details:", {
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size,
        mimetype: req.file.mimetype
      });

      const user = await User.findById(req.user.id);
      if (!user) {
        console.log("❌ User not found:", req.user.id);
        return res.status(404).json({ message: "ไม่พบผู้ใช้" });
      }

      // ✅ Generate full URL for both Cloudinary and local storage
      let photoUrl;
      try {
        if (isCloudinaryConfigured) {
          // Cloudinary returns full URL
          photoUrl = req.file.path;
          console.log("📸 Using Cloudinary URL:", photoUrl);
        } else {
          // Local storage - generate full URL
          const API_BASE = process.env.NODE_ENV === 'production' 
            ? 'https://aow-jobapp-backend.onrender.com'
            : 'http://localhost:5000';
          photoUrl = `${API_BASE}/uploads/photos/${req.file.filename}`;
          console.log("📸 Using local URL:", photoUrl);
        }
      } catch (urlError) {
        console.error("❌ Error generating photo URL:", urlError);
        throw new Error("ไม่สามารถสร้าง URL รูปภาพได้");
      }

      // ✅ Save to database
      user.profile = {
        ...(user.profile || {}),
        photoUrl: photoUrl,
      };

      console.log("📸 Saving profile with photoUrl:", photoUrl);
      await user.save();
      console.log("✅ Photo profile saved successfully");

      // ✅ Return proper response format
      return res.status(200).json({
        message: "อัปโหลดรูปโปรไฟล์เรียบร้อยแล้ว",
        photoUrl: photoUrl,
        success: true
      });
      
    } catch (e) {
      console.error("❌ POST /api/profile/me/photo error:", e);
      console.error("❌ Error stack:", e.stack);
      
      // ✅ Always return proper JSON response
      return res.status(500).json({ 
        message: "อัปโหลดรูปโปรไฟล์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
        error: process.env.NODE_ENV === 'development' ? e.message : undefined
      });
    }
  }
);

/* ========= GET /api/profile/:userId (เฉพาะ admin + employer) ========= */
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

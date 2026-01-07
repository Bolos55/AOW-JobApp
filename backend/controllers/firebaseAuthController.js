// backend/controllers/firebaseAuthController.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";

// ✅ สร้าง JWT token
const createToken = (user) =>
  jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role || "jobseeker",
    },
    process.env.JWT_SECRET || "dev-secret",
    { expiresIn: process.env.JWT_EXPIRE || "7d" }
  );

// ===================== FIREBASE GOOGLE LOGIN =====================
export const firebaseGoogleLogin = async (req, res) => {
  console.log("🔥 Firebase Google Login Controller Hit!");
  console.log("📋 Request body:", req.body);
  console.log("🌐 Request headers:", req.headers);
  
  try {
    const { uid, email, name, photoURL, emailVerified } = req.body;
    
    // ✅ Validate required fields
    if (!uid || !email) {
      console.log("❌ Missing required fields:", { uid: !!uid, email: !!email });
      return res.status(400).json({ 
        message: "ข้อมูล Firebase ไม่ครบถ้วน - ต้องมี uid และ email",
        received: { uid: !!uid, email: !!email, name: !!name }
      });
    }

    console.log("✅ Firebase data received:", { uid, email, name, emailVerified });

    // ✅ ตรวจสอบว่ามีผู้ใช้นี้ในระบบแล้วหรือไม่
    let user = await User.findOne({ email });
    console.log("🔍 User lookup result:", user ? `Found: ${user.email}` : "Not found");

    if (user) {
      // ✅ ผู้ใช้มีอยู่แล้ว - login ปกติ
      console.log(`🔄 Existing user Firebase login: ${email}`);
      
      // อัปเดตข้อมูล Firebase ถ้ายังไม่มี
      let updated = false;
      if (!user.socialProvider || user.socialProvider !== "firebase-google") {
        user.socialProvider = "firebase-google";
        user.socialId = uid;
        updated = true;
        console.log("📝 Updated socialProvider to firebase-google");
      }
      
      if (photoURL && !user.avatar) {
        user.avatar = photoURL;
        updated = true;
        console.log("📝 Updated avatar from Firebase");
      }
      
      if (emailVerified && !user.isEmailVerified) {
        user.isEmailVerified = true;
        user.isActive = true;
        updated = true;
        console.log("📝 Updated email verification status");
      }
      
      if (updated) {
        await user.save();
        console.log("✅ User updated and saved to database");
      }

      // ตรวจสอบว่าบัญชีถูกระงับหรือไม่
      if (user.isSuspended) {
        console.log(`🚫 User suspended: ${email}`);
        return res.status(403).json({ 
          message: `🚫 บัญชีถูกระงับการใช้งาน\n\nเหตุผล: ${user.suspensionReason}\n\nกรุณาติดต่อแอดมินเพื่อขอความช่วยเหลือ`,
          suspended: true,
          suspensionReason: user.suspensionReason
        });
      }

      // ✅ สร้าง JWT token
      const token = createToken(user);
      console.log("✅ JWT token created for existing user");

      const responseData = {
        message: "เข้าสู่ระบบด้วย Google สำเร็จ",
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          avatar: user.avatar,
          isEmailVerified: user.isEmailVerified,
          requiresReview: user.requiresReview,
          isSuspended: user.isSuspended,
          socialProvider: user.socialProvider
        },
        token,
      };

      console.log("📤 Sending response for existing user:", {
        userId: user._id,
        email: user.email,
        role: user.role,
        hasToken: !!token
      });

      return res.json(responseData);
      
    } else {
      // ✅ ผู้ใช้ใหม่ - ต้องเลือก role ก่อน
      console.log(`👤 New user from Firebase Google: ${email} - needs role selection`);
      
      const responseData = {
        message: "ผู้ใช้ใหม่ - ต้องเลือกประเภทการใช้งาน",
        newUser: true,
        needsRoleSelection: true,
        socialData: {
          uid,
          email,
          name,
          photoURL,
          emailVerified
        },
        provider: "google"
      };

      console.log("📤 Sending response for new user:", {
        email,
        needsRoleSelection: true
      });

      return res.json(responseData);
    }

  } catch (err) {
    console.error("❌ Firebase Google auth error:", err);
    console.error("❌ Error stack:", err.stack);
    
    res.status(500).json({ 
      message: "เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย Google",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
      timestamp: new Date().toISOString()
    });
  }
};
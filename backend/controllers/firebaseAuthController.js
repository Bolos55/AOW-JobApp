// backend/controllers/firebaseAuthController.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { verifyFirebaseToken } from "../config/firebase-admin.js";

// ✅ สร้าง JWT token
const createToken = (user) => {
  const JWT_SECRET = process.env.JWT_SECRET;
  const JWT_EXPIRE = process.env.JWT_EXPIRE || "7d";
  
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role || "jobseeker",
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRE }
  );
};

// ===================== SECURE FIREBASE GOOGLE LOGIN =====================
export const firebaseGoogleLogin = async (req, res) => {
  if (process.env.NODE_ENV === 'development') {
    console.log("🔥 Secure Firebase Google Login Controller Hit!");
  }
  
  try {
    const { idToken } = req.body;
    
    // ✅ Validate required fields
    if (!idToken) {
      return res.status(400).json({ 
        message: "ไม่พบ Firebase ID Token",
        error: "ID_TOKEN_REQUIRED"
      });
    }

    // ✅ Verify Firebase ID Token
    const verificationResult = await verifyFirebaseToken(idToken);
    
    if (!verificationResult.success) {
      console.warn('❌ Firebase token verification failed:', verificationResult.error);
      return res.status(401).json({
        message: "Firebase ID Token ไม่ถูกต้อง",
        error: verificationResult.error
      });
    }

    const { uid, email, name, picture, emailVerified } = verificationResult.user;

    if (process.env.NODE_ENV === 'development') {
      console.log("✅ Firebase token verified:", { uid, email, name, emailVerified });
    }

    // ✅ ตรวจสอบว่ามีผู้ใช้นี้ในระบบแล้วหรือไม่
    let user = await User.findOne({ email });
    
    if (process.env.NODE_ENV === 'development') {
      console.log("🔍 User lookup result:", user ? `Found: ${user.email}` : "Not found");
    }

    if (user) {
      // ✅ ผู้ใช้มีอยู่แล้ว - login ปกติ
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔄 Existing user Firebase login: ${email}`);
      }
      
      // อัปเดตข้อมูล Firebase ถ้ายังไม่มี
      let updated = false;
      if (!user.socialProvider || user.socialProvider !== "firebase-google") {
        user.socialProvider = "firebase-google";
        user.socialId = uid;
        updated = true;
      }
      
      if (picture && !user.avatar) {
        user.avatar = picture;
        updated = true;
      }
      
      if (emailVerified && !user.isEmailVerified) {
        user.isEmailVerified = true;
        user.isActive = true;
        updated = true;
      }
      
      if (updated) {
        await user.save();
        if (process.env.NODE_ENV === 'development') {
          console.log("✅ User updated and saved to database");
        }
      }

      // ตรวจสอบว่าบัญชีถูกระงับหรือไม่
      if (user.isSuspended) {
        return res.status(403).json({ 
          message: `🚫 บัญชีถูกระงับการใช้งาน\n\nเหตุผล: ${user.suspensionReason}\n\nกรุณาติดต่อแอดมินเพื่อขอความช่วยเหลือ`,
          suspended: true,
          suspensionReason: user.suspensionReason
        });
      }

      // ✅ สร้าง JWT token
      const token = createToken(user);

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

      return res.json(responseData);
      
    } else {
      // ✅ ผู้ใช้ใหม่ - ต้องเลือก role ก่อน
      if (process.env.NODE_ENV === 'development') {
        console.log(`👤 New user from Firebase Google: ${email} - needs role selection`);
      }
      
      const responseData = {
        message: "ผู้ใช้ใหม่ - ต้องเลือกประเภทการใช้งาน",
        newUser: true,
        needsRoleSelection: true,
        socialData: {
          uid,
          email,
          name,
          photoURL: picture,
          emailVerified
        },
        provider: "google"
      };

      return res.json(responseData);
    }

  } catch (err) {
    console.error("❌ Firebase Google auth error:", err);
    
    res.status(500).json({ 
      message: "เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย Google",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
      timestamp: new Date().toISOString()
    });
  }
};
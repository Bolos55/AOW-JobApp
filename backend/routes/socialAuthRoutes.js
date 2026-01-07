// backend/routes/socialAuthRoutes.js
import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { validateEmail } from "../utils/emailValidator.js";

const router = express.Router();

// ✅ สร้าง token: เก็บ id + email + role
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

// ===================== GOOGLE LOGIN =====================
router.post("/google", async (req, res) => {
  try {
    const { access_token } = req.body;
    
    if (!access_token) {
      return res.status(400).json({ message: "ไม่พบ access token" });
    }

    // ✅ ใช้ Google API เพื่อ verify token และดึงข้อมูลผู้ใช้
    const googleResponse = await fetch(
      `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${access_token}`
    );

    if (!googleResponse.ok) {
      return res.status(400).json({ message: "Google token ไม่ถูกต้อง" });
    }

    const googleUser = await googleResponse.json();
    
    if (!googleUser.email) {
      return res.status(400).json({ message: "ไม่สามารถดึงข้อมูลอีเมลจาก Google ได้" });
    }

    // ✅ ตรวจสอบว่ามีผู้ใช้นี้ในระบบแล้วหรือไม่
    let user = await User.findOne({ email: googleUser.email });

    if (!user) {
      // ✅ สร้างผู้ใช้ใหม่
      user = await User.create({
        name: googleUser.name || googleUser.email.split('@')[0],
        email: googleUser.email,
        password: "google-oauth", // placeholder password
        role: "jobseeker", // default role
        isActive: true,
        socialProvider: "google",
        socialId: googleUser.id,
        avatar: googleUser.picture
      });
    } else {
      // ✅ อัพเดตข้อมูล social provider ถ้ายังไม่มี
      if (!user.socialProvider) {
        user.socialProvider = "google";
        user.socialId = googleUser.id;
        if (googleUser.picture && !user.avatar) {
          user.avatar = googleUser.picture;
        }
        await user.save();
      }
    }

    const token = createToken(user);

    res.json({
      message: "เข้าสู่ระบบด้วย Google สำเร็จ",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        avatar: user.avatar
      },
      token,
    });

  } catch (err) {
    console.log("Google auth error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดที่เซิร์ฟเวอร์" });
  }
});

// ===================== FACEBOOK LOGIN =====================
router.post("/facebook", async (req, res) => {
  try {
    const { access_token, userID, userInfo } = req.body;
    
    if (!access_token || !userID) {
      return res.status(400).json({ message: "ไม่พบ access token หรือ userID" });
    }

    // ✅ ใช้ Facebook Graph API เพื่อ verify token และดึงข้อมูลผู้ใช้
    let facebookUser = userInfo;
    
    // ถ้าไม่มี userInfo มาจาก frontend ให้ดึงจาก Facebook API
    if (!facebookUser) {
      const facebookResponse = await fetch(
        `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${access_token}`
      );

      if (!facebookResponse.ok) {
        return res.status(400).json({ message: "Facebook token ไม่ถูกต้อง" });
      }

      facebookUser = await facebookResponse.json();
    }
    
    if (!facebookUser.email) {
      return res.status(400).json({ 
        message: "ไม่สามารถดึงข้อมูลอีเมลจาก Facebook ได้ กรุณาอนุญาตการเข้าถึงอีเมล" 
      });
    }

    // ✅ ตรวจสอบว่ามีผู้ใช้นี้ในระบบแล้วหรือไม่
    let user = await User.findOne({ email: facebookUser.email });

    if (!user) {
      // ✅ สร้างผู้ใช้ใหม่
      user = await User.create({
        name: facebookUser.name || facebookUser.email.split('@')[0],
        email: facebookUser.email,
        password: "facebook-oauth", // placeholder password
        role: "jobseeker", // default role
        isActive: true,
        socialProvider: "facebook",
        socialId: facebookUser.id,
        avatar: facebookUser.picture?.data?.url || facebookUser.picture
      });
    } else {
      // ✅ อัพเดตข้อมูล social provider ถ้ายังไม่มี
      if (!user.socialProvider) {
        user.socialProvider = "facebook";
        user.socialId = facebookUser.id;
        if ((facebookUser.picture?.data?.url || facebookUser.picture) && !user.avatar) {
          user.avatar = facebookUser.picture?.data?.url || facebookUser.picture;
        }
        await user.save();
      }
    }

    const token = createToken(user);

    res.json({
      message: "เข้าสู่ระบบด้วย Facebook สำเร็จ",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        avatar: user.avatar
      },
      token,
    });

  } catch (err) {
    console.log("Facebook auth error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดที่เซิร์ฟเวอร์" });
  }
});

// ===================== FIREBASE GOOGLE LOGIN =====================
router.post("/firebase-google", async (req, res) => {
  console.log("🔥 Firebase Google Login endpoint hit!");
  console.log("📋 Request body:", req.body);
  console.log("🌐 Request headers:", req.headers);
  
  try {
    const { uid, email, name, photoURL, emailVerified } = req.body;
    
    if (!uid || !email) {
      console.log("❌ Missing uid or email:", { uid, email });
      return res.status(400).json({ message: "ไม่พบข้อมูล Firebase UID หรือ email" });
    }

    console.log("✅ Firebase data received:", { uid, email, name, emailVerified });

    // ✅ ตรวจสอบว่ามีผู้ใช้นี้ในระบบแล้วหรือไม่
    let user = await User.findOne({ email });

    if (user) {
      // ✅ ผู้ใช้มีอยู่แล้ว - login ปกติ
      console.log(`🔄 Existing user social login: ${email} (Firebase Google)`);
      
      // อัปเดตข้อมูล social provider ถ้ายังไม่มี
      if (!user.socialProvider) {
        user.socialProvider = "firebase-google";
        user.socialId = uid;
        if (photoURL && !user.avatar) {
          user.avatar = photoURL;
        }
        if (emailVerified && !user.isEmailVerified) {
          user.isEmailVerified = true;
          user.isActive = true;
        }
        await user.save();
        console.log("✅ Updated user with Firebase data");
      }

      // ตรวจสอบว่าบัญชีถูกระงับหรือไม่
      if (user.isSuspended) {
        return res.status(403).json({ 
          message: `🚫 บัญชีถูกระงับการใช้งาน\n\nเหตุผล: ${user.suspensionReason}\n\nกรุณาติดต่อแอดมินเพื่อขอความช่วยเหลือ`,
          suspended: true,
          suspensionReason: user.suspensionReason
        });
      }

      const token = createToken(user);

      return res.json({
        message: "เข้าสู่ระบบด้วย Firebase Google สำเร็จ",
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
        },
        token,
      });
    } else {
      // ✅ ผู้ใช้ใหม่ - ต้องเลือก role ก่อน
      console.log(`👤 New user from Firebase Google: ${email} - needs role selection`);
      
      return res.json({
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
      });
    }

  } catch (err) {
    console.log("Firebase Google auth error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดที่เซิร์ฟเวอร์" });
  }
});

// ===================== GITHUB LOGIN =====================
router.post("/github", async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ message: "ไม่พบ authorization code" });
    }

    // ✅ แลก authorization code กับ access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code: code,
      }),
    });

    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      return res.status(400).json({ message: "ไม่สามารถดึง access token จาก GitHub ได้" });
    }

    // ✅ ใช้ access token ดึงข้อมูลผู้ใช้
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${tokenData.access_token}`,
        'User-Agent': 'JobApp',
      },
    });

    const githubUser = await userResponse.json();

    // ✅ ดึงอีเมลจาก GitHub (อีเมลอาจจะเป็น private)
    const emailResponse = await fetch('https://api.github.com/user/emails', {
      headers: {
        'Authorization': `token ${tokenData.access_token}`,
        'User-Agent': 'JobApp',
      },
    });

    const emails = await emailResponse.json();
    const primaryEmail = emails.find(email => email.primary)?.email || githubUser.email;

    if (!primaryEmail) {
      return res.status(400).json({ 
        message: "ไม่สามารถดึงข้อมูลอีเมลจาก GitHub ได้ กรุณาตั้งค่าอีเมลให้เป็น public" 
      });
    }

    // ✅ ตรวจสอบว่ามีผู้ใช้นี้ในระบบแล้วหรือไม่
    let user = await User.findOne({ email: primaryEmail });

    if (!user) {
      // ✅ สร้างผู้ใช้ใหม่
      user = await User.create({
        name: githubUser.name || githubUser.login || primaryEmail.split('@')[0],
        email: primaryEmail,
        password: "github-oauth", // placeholder password
        role: "jobseeker", // default role
        isActive: true,
        socialProvider: "github",
        socialId: githubUser.id.toString(),
        avatar: githubUser.avatar_url
      });
    } else {
      // ✅ อัพเดตข้อมูล social provider ถ้ายังไม่มี
      if (!user.socialProvider) {
        user.socialProvider = "github";
        user.socialId = githubUser.id.toString();
        if (githubUser.avatar_url && !user.avatar) {
          user.avatar = githubUser.avatar_url;
        }
        await user.save();
      }
    }

    const token = createToken(user);

    res.json({
      message: "เข้าสู่ระบบด้วย GitHub สำเร็จ",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        avatar: user.avatar
      },
      token,
    });

  } catch (err) {
    console.log("GitHub auth error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดที่เซิร์ฟเวอร์" });
  }
});

export default router;
// backend/routes/authRoutes.js
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/User.js";
import auth from "../middleware/auth.js";
import { validateEmail } from "../utils/emailValidator.js";
import { sendVerificationEmail, sendWelcomeEmail } from "../utils/emailService.js";

const router = express.Router();

// ✅ สร้าง token: เก็บ id + email + role (เผื่ออยากใช้ต่อ)
const createToken = (user) =>
  jwt.sign(
    {
      id: user._id,               // ให้ตรงกับ req.user.id ที่ใช้ใน /me
      email: user.email,
      role: user.role || "jobseeker",
    },
    process.env.JWT_SECRET || "dev-secret",
    { expiresIn: process.env.JWT_EXPIRE || "7d" }
  );

// ===================== REGISTER =====================
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role, registrationMetadata } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ message: "กรอกข้อมูลไม่ครบ" });
    }

    // ✅ ตรวจสอบความแข็งแกร่งของรหัสผ่าน
    if (password.length < 8) {
      return res.status(400).json({ message: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" });
    }

    const passwordRequirements = {
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    const strengthScore = Object.values(passwordRequirements).filter(Boolean).length;
    if (strengthScore < 3) {
      return res.status(400).json({ 
        message: "รหัสผ่านไม่ปลอดภัยเพียงพอ ต้องมีตัวพิมพ์ใหญ่ เล็ก ตัวเลข และอักขระพิเศษ" 
      });
    }

    // ✅ ตรวจสอบอีเมลที่มีอยู่แล้ว
    const existed = await User.findOne({ email });
    if (existed) {
      return res.status(400).json({ message: "อีเมลนี้ถูกใช้แล้ว" });
    }

    // ✅ ตรวจสอบชื่อที่เหมาะสม
    if (name.trim().length < 2) {
      return res.status(400).json({ message: "ชื่อผู้ใช้ต้องมีอย่างน้อย 2 ตัวอักษร" });
    }

    // ✅ ตรวจสอบความปลอดภัยของอีเมล
    console.log(`🔍 Validating email: ${email}`);
    const emailValidation = await validateEmail(email.toLowerCase().trim());
    console.log(`📊 Email validation result:`, {
      email: emailValidation.email,
      status: emailValidation.status,
      score: emailValidation.score,
      isDisposable: emailValidation.isDisposable,
      isSuspicious: emailValidation.isSuspicious,
      notes: emailValidation.notes
    });

    // ✅ บล็อกอีเมล disposable
    if (emailValidation.isDisposable) {
      console.log(`🚫 Blocked disposable email: ${email} (domain: ${emailValidation.domain})`);
      return res.status(400).json({ 
        message: `🚫 ไม่สามารถใช้อีเมลชั่วคราวได้\n\nDomain: ${emailValidation.domain}\n\nกรุณาใช้อีเมลจริงเพื่อความปลอดภัยและการติดต่อ`,
        emailValidation: {
          status: emailValidation.status,
          domain: emailValidation.domain,
          reason: 'disposable_email'
        }
      });
    }

    // ✅ เตือนอีเมลที่น่าสงสัย (แต่ยังให้สมัครได้)
    if (emailValidation.isSuspicious || emailValidation.score < 50) {
      console.log(`⚠️ Suspicious email detected: ${email} (score: ${emailValidation.score})`);
      
      // ถ้าคะแนนต่ำมาก ให้บล็อกเลย
      if (emailValidation.score < 30) {
        return res.status(400).json({ 
          message: `⚠️ รูปแบบอีเมลน่าสงสัย\n\nกรุณาใช้อีเมลจริงที่สามารถติดต่อได้\n\nหมายเหตุ: ${emailValidation.notes.join(', ')}`,
          emailValidation: {
            status: emailValidation.status,
            score: emailValidation.score,
            notes: emailValidation.notes,
            reason: 'suspicious_pattern'
          }
        });
      }
    }

    // ✅ ป้องกันคนสมัครเป็น admin ตรง ๆ
    const roleSafe = role === "employer" ? "employer" : "jobseeker";

    const hashed = await bcrypt.hash(password, 12); // เพิ่ม salt rounds

    // ✅ สร้าง email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString("hex");
    const emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 ชั่วโมง

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashed,
      role: roleSafe,
      emailVerificationToken,
      emailVerificationExpire,
      isEmailVerified: false, // ✅ ยังไม่ยืนยัน ไม่สามารถใช้งานได้
      isActive: false, // ✅ ปิดการใช้งานจนกว่าจะยืนยันอีเมล
      registrationMetadata: registrationMetadata || {},
      registrationIP: req.ip || req.connection.remoteAddress,
      
      // ✅ เก็บผลการตรวจสอบอีเมล
      emailValidation: {
        isDisposable: emailValidation.isDisposable,
        isSuspicious: emailValidation.isSuspicious,
        domain: emailValidation.domain,
        validationScore: emailValidation.score,
        validationNotes: emailValidation.notes,
      },
      
      // ✅ ตั้งค่าสถานะตามผลการตรวจสอบ
      requiresReview: emailValidation.requiresReview,
      isSuspended: emailValidation.score < 40, // suspend ถ้าคะแนนต่ำมาก
      suspensionReason: emailValidation.score < 40 ? 'Suspicious email pattern detected during registration' : undefined,
    });

    // ✅ ส่งอีเมลยืนยันแทนการสร้าง token ทันที
    console.log(`📧 Sending verification email to: ${email}`);
    const emailResult = await sendVerificationEmail(email, name.trim(), emailVerificationToken);
    
    if (!emailResult.success) {
      // ถ้าส่งอีเมลไม่ได้ ให้ลบ user ที่สร้างไว้
      await User.findByIdAndDelete(user._id);
      console.error(`❌ Failed to send verification email: ${emailResult.error}`);
      return res.status(500).json({ 
        message: "ไม่สามารถส่งอีเมลยืนยันได้ กรุณาตรวจสอบอีเมลและลองใหม่อีกครั้ง",
        error: "email_send_failed"
      });
    }

    // ✅ Log การสมัครสมาชิกเพื่อความปลอดภัย
    console.log(`📝 New registration: ${email} (${roleSafe}) from IP: ${req.ip}`);
    console.log(`📊 Email validation: ${emailValidation.status} (score: ${emailValidation.score})`);
    console.log(`📧 Verification email sent: ${emailResult.messageId}`);
    
    if (emailValidation.requiresReview) {
      console.log(`🔍 Account flagged for review: ${email}`);
    }

    // ✅ ส่งข้อมูลกลับโดยไม่มี token (ต้องยืนยันอีเมลก่อน)
    const response = {
      message: "📧 ส่งลิงก์ยืนยันอีเมลแล้ว!",
      details: "กรุณาตรวจสอบอีเมลของคุณและกดลิงก์ยืนยันเพื่อเปิดใช้งานบัญชี",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: false, // ยังไม่สามารถใช้งานได้
        isEmailVerified: false,
        requiresReview: user.requiresReview,
      },
      // ✅ ไม่ส่ง token กลับ เพราะต้องยืนยันอีเมลก่อน
      emailVerificationRequired: true,
      emailSent: true,
      expiresIn: "24 ชั่วโมง",
      // ✅ ถ้าเป็น mock mode ให้ส่ง link กลับเพื่อทดสอบ
      ...(emailResult.mockMode && {
        mockMode: true,
        verificationLink: emailResult.verificationLink,
        testInstructions: "เนื่องจากยังไม่ได้ตั้งค่าอีเมลจริง กรุณาคลิกลิงก์ด้านล่างเพื่อทดสอบ"
      })
    };

    // ✅ เพิ่มคำเตือนถ้าอีเมลน่าสงสัย
    if (emailValidation.requiresReview) {
      response.warning = {
        message: "บัญชีของคุณอยู่ระหว่างการตรวจสอบ",
        details: "เนื่องจากรูปแบบอีเมลมีความน่าสงสัย บัญชีจะถูกตรวจสอบโดยแอดมิน",
        emailValidation: {
          score: emailValidation.score,
          notes: emailValidation.notes,
          status: emailValidation.status
        }
      };
    }

    res.status(201).json(response);
  } catch (err) {
    console.log("register error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดที่เซิร์ฟเวอร์" });
  }
});

// ===================== LOGIN =====================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "กรุณากรอกอีเมลและรหัสผ่าน" });
    }

    // ✅ มี index ที่ email แล้ว → เร็วขึ้น
    const user = await User.findOne({ email }).select(
      "name email password role isActive isEmailVerified"
    );
    if (!user) {
      return res
        .status(400)
        .json({ message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
    }

    // ✅ ตรวจสอบว่ายืนยันอีเมลแล้วหรือยัง
    if (!user.isEmailVerified) {
      return res.status(403).json({ 
        message: "📧 กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ",
        details: "ตรวจสอบอีเมลของคุณและกดลิงก์ยืนยัน หากไม่พบอีเมล ให้ตรวจสอบในโฟลเดอร์ Spam",
        emailNotVerified: true,
        canResendVerification: true
      });
    }

    if (user.isActive === false) {
      return res
        .status(403)
        .json({ message: "บัญชีนี้ถูกปิดการใช้งาน" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
    }

    const token = createToken(user);
    res.json({
      message: "เข้าสู่ระบบสำเร็จ",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,      // ✅ ส่ง role ให้ frontend รู้ว่าเป็น admin/employer
        isActive: user.isActive,
        isEmailVerified: user.isEmailVerified,
      },
      token,
    });
  } catch (err) {
    console.log("login error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดที่เซิร์ฟเวอร์" });
  }
});

// ===================== ME (ดึงข้อมูลตัวเอง) =====================
router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "name email role isActive"
    );
    if (!user) return res.status(404).json({ message: "ไม่พบผู้ใช้" });

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    });
  } catch (err) {
    console.log("auth/me error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดที่เซิร์ฟเวอร์" });
  }
});

// ===================== FORGOT PASSWORD =====================
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ message: "กรุณากรอกอีเมล" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      // เพื่อความปลอดภัยตอบเหมือนกัน
      return res.json({
        message: "ถ้ามีอีเมลนี้ในระบบ เราได้สร้างลิงก์รีเซ็ตให้แล้ว",
      });
    }

    const resetToken = crypto.randomBytes(20).toString("hex");
    const resetTokenHashed = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetPasswordToken = resetTokenHashed;
    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000;
    await user.save();

    const resetLink = `http://localhost:3000/reset-password/${resetToken}`;
    console.log("📩 reset link:", resetLink);

    res.json({ message: "สร้างลิงก์รีเซ็ตแล้ว", resetLink });
  } catch (err) {
    console.log("forgot-password error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดที่เซิร์ฟเวอร์" });
  }
});

// ===================== RESET PASSWORD =====================
router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body || {};
    if (!token || !password) {
      return res.status(400).json({ message: "ข้อมูลไม่ครบ" });
    }

    const resetTokenHashed = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken: resetTokenHashed,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "โทเคนไม่ถูกต้อง หรือหมดอายุแล้ว" });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.json({ message: "รีเซ็ตรหัสผ่านเรียบร้อยแล้ว" });
  } catch (err) {
    console.log("reset-password error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดที่เซิร์ฟเวอร์" });
  }
});

// ===================== EMAIL VERIFICATION =====================
router.post("/verify-email", async (req, res) => {
  try {
    const { token } = req.body || {};
    if (!token) {
      return res.status(400).json({ message: "ไม่พบโทเคนยืนยัน" });
    }

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ 
        message: "โทเคนยืนยันอีเมลไม่ถูกต้องหรือหมดอายุแล้ว",
        expired: true
      });
    }

    // ✅ ยืนยันอีเมลสำเร็จ - เปิดใช้งานบัญชี
    user.isEmailVerified = true;
    user.isActive = true; // ✅ เปิดใช้งานบัญชี
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    await user.save();

    console.log(`✅ Email verified and account activated: ${user.email}`);

    // ✅ ส่งอีเมลต้อนรับ
    const welcomeResult = await sendWelcomeEmail(user.email, user.name, user.role);
    if (welcomeResult.success) {
      console.log(`📧 Welcome email sent: ${welcomeResult.messageId}`);
    }

    // ✅ สร้าง token สำหรับเข้าสู่ระบบทันที
    const authToken = createToken(user);

    res.json({ 
      message: "🎉 ยืนยันอีเมลสำเร็จ!",
      details: "บัญชีของคุณพร้อมใช้งานแล้ว เข้าสู่ระบบได้เลย",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        isActive: user.isActive,
      },
      token: authToken, // ✅ ให้ token เพื่อเข้าสู่ระบบทันที
      verified: true,
      canLogin: true
    });
  } catch (err) {
    console.log("verify-email error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดที่เซิร์ฟเวอร์" });
  }
});

// ===================== RESEND EMAIL VERIFICATION =====================
router.post("/resend-verification", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "ไม่พบผู้ใช้" });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ message: "อีเมลได้รับการยืนยันแล้ว" });
    }

    // สร้าง token ใหม่
    const emailVerificationToken = crypto.randomBytes(32).toString("hex");
    const emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000;

    user.emailVerificationToken = emailVerificationToken;
    user.emailVerificationExpire = emailVerificationExpire;
    await user.save();

    const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email/${emailVerificationToken}`;
    console.log("📧 Resend verification link:", verificationLink);

    res.json({ 
      message: "ส่งลิงก์ยืนยันอีเมลใหม่แล้ว",
      verificationLink 
    });
  } catch (err) {
    console.log("resend-verification error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดที่เซิร์ฟเวอร์" });
  }
});

// ===================== COMPLETE SOCIAL REGISTRATION =====================
router.post("/complete-social-registration", async (req, res) => {
  try {
    const { uid, email, name, photoURL, emailVerified, role, provider } = req.body;
    
    if (!uid || !email || !role) {
      return res.status(400).json({ message: "ข้อมูลไม่ครบถ้วน" });
    }

    // ✅ ตรวจสอบว่า role ถูกต้อง
    const validRoles = ["jobseeker", "employer"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: "ประเภทการใช้งานไม่ถูกต้อง" });
    }

    // ✅ ตรวจสอบความปลอดภัยของอีเมลสำหรับ social login
    console.log(`🔍 Validating social login email: ${email}`);
    const emailValidation = await validateEmail(email.toLowerCase().trim());
    console.log(`📊 Social email validation result:`, {
      email: emailValidation.email,
      status: emailValidation.status,
      score: emailValidation.score,
      isDisposable: emailValidation.isDisposable,
      isSuspicious: emailValidation.isSuspicious
    });

    // ✅ บล็อกอีเมล disposable แม้ใน social login
    if (emailValidation.isDisposable) {
      console.log(`🚫 Blocked disposable email in social login: ${email}`);
      return res.status(400).json({ 
        message: `🚫 ไม่สามารถใช้อีเมลชั่วคราวได้\n\nDomain: ${emailValidation.domain}\n\nกรุณาใช้อีเมลจริงจาก ${provider} Account หลักของคุณ`,
        emailValidation: {
          status: emailValidation.status,
          domain: emailValidation.domain,
          reason: 'disposable_email_social_login'
        }
      });
    }

    // ✅ ตรวจสอบว่ามีผู้ใช้นี้ในระบบแล้วหรือไม่
    let user = await User.findOne({ email });

    if (user) {
      // ✅ ผู้ใช้มีอยู่แล้ว - อัปเดต role และ social provider info
      user.role = role;
      user.socialProvider = provider === 'google' ? 'firebase-google' : provider;
      user.socialId = uid;
      if (photoURL && !user.avatar) {
        user.avatar = photoURL;
      }
      if (emailVerified && !user.isEmailVerified) {
        user.isEmailVerified = true;
        user.isActive = true;
      }
      await user.save();
      
      console.log(`🔄 Updated existing user: ${email} (${role})`);
    } else {
      // ✅ สร้างผู้ใช้ใหม่
      user = await User.create({
        name: name || email.split('@')[0],
        email: email.toLowerCase().trim(),
        password: "social-oauth", // placeholder password
        role: role,
        isActive: true,
        socialProvider: provider === 'google' ? 'firebase-google' : provider,
        socialId: uid,
        avatar: photoURL,
        isEmailVerified: emailVerified || true, // Social login ถือว่ายืนยันแล้ว
        
        // ✅ เก็บผลการตรวจสอบอีเมล
        emailValidation: {
          isDisposable: emailValidation.isDisposable,
          isSuspicious: emailValidation.isSuspicious,
          domain: emailValidation.domain,
          validationScore: emailValidation.score,
          validationNotes: emailValidation.notes,
        },
        
        // ✅ ตั้งค่าสถานะตามผลการตรวจสอบ (ผ่อนปรนสำหรับ social login)
        requiresReview: emailValidation.requiresReview && emailValidation.score < 60,
        isSuspended: emailValidation.score < 30, // suspend เฉพาะคะแนนต่ำมาก
        suspensionReason: emailValidation.score < 30 ? 'Suspicious email pattern detected in social login' : undefined,
        
        registrationIP: req.ip || req.connection.remoteAddress,
        registrationMetadata: {
          socialProvider: provider,
          emailVerified: emailVerified,
          userAgent: req.headers['user-agent'],
          timestamp: new Date().toISOString(),
        }
      });
      
      console.log(`📝 New social user created: ${email} (${role}) via ${provider} - Score: ${emailValidation.score}`);
    }

    // ✅ ตรวจสอบว่าบัญชีถูกระงับหรือไม่
    if (user.isSuspended) {
      return res.status(403).json({ 
        message: `🚫 บัญชีถูกระงับการใช้งาน\n\nเหตุผล: ${user.suspensionReason}\n\nกรุณาติดต่อแอดมินเพื่อขอความช่วยเหลือ`,
        suspended: true,
        suspensionReason: user.suspensionReason
      });
    }

    // ✅ ส่งอีเมลต้อนรับ
    const welcomeResult = await sendWelcomeEmail(user.email, user.name, user.role);
    if (welcomeResult.success) {
      console.log(`📧 Welcome email sent: ${welcomeResult.messageId}`);
    }

    const token = createToken(user);

    // ✅ ส่งข้อมูลกลับพร้อมสถานะการตรวจสอบ
    const response = {
      message: `เข้าสู่ระบบด้วย ${provider} สำเร็จ`,
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
    };

    // ✅ เพิ่มคำเตือนถ้าอีเมลน่าสงสัย
    if (user.requiresReview) {
      response.warning = {
        message: "บัญชีของคุณอยู่ระหว่างการตรวจสอบ",
        details: "เนื่องจากรูปแบบอีเมลมีความน่าสงสัย บัญชีจะถูกตรวจสอบโดยแอดมิน",
        emailValidation: {
          score: user.emailValidation?.validationScore || 0,
          status: emailValidation.status
        }
      };
    }

    res.json(response);

  } catch (err) {
    console.log("Complete social registration error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดที่เซิร์ฟเวอร์" });
  }
});

// ===================== FIREBASE GOOGLE LOGIN =====================
router.post("/firebase-google", async (req, res) => {
  console.log("🔥🔥🔥 Firebase Google Login endpoint HIT! 🔥🔥🔥");
  console.log("📋 Request method:", req.method);
  console.log("📋 Request path:", req.path);
  console.log("📋 Request originalUrl:", req.originalUrl);
  console.log("📋 Request body:", JSON.stringify(req.body, null, 2));
  console.log("📋 Request headers:", JSON.stringify(req.headers, null, 2));
  console.log("⏰ Timestamp:", new Date().toISOString());
  
  try {
    const { uid, email, name, photoURL, emailVerified } = req.body;
    
    console.log("🔍 Extracted data:", { uid, email, name, photoURL, emailVerified });
    
    // ✅ Validate required fields
    if (!uid || !email) {
      console.log("❌ Missing required fields:", { uid: !!uid, email: !!email });
      return res.status(400).json({ 
        message: "ข้อมูล Firebase ไม่ครบถ้วน - ต้องมี uid และ email",
        received: { uid: !!uid, email: !!email, name: !!name }
      });
    }

    console.log("✅ Firebase data validated successfully");

    // ✅ ตรวจสอบว่ามีผู้ใช้นี้ในระบบแล้วหรือไม่
    console.log("🔍 Looking up user in database:", email);
    let user = await User.findOne({ email });
    console.log("📊 User lookup result:", user ? `Found user: ${user._id}` : "User not found");

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
      console.log("🔐 Creating JWT token for user:", user._id);
      const token = createToken(user);
      console.log("✅ JWT token created successfully");

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

      console.log("📤 Sending success response for existing user");
      console.log("📊 Response data:", JSON.stringify({
        userId: user._id,
        email: user.email,
        role: user.role,
        hasToken: !!token
      }, null, 2));

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

      console.log("📤 Sending new user response");
      console.log("📊 Response data:", JSON.stringify(responseData, null, 2));

      return res.json(responseData);
    }

  } catch (err) {
    console.error("❌❌❌ Firebase Google auth ERROR:", err);
    console.error("❌ Error message:", err.message);
    console.error("❌ Error stack:", err.stack);
    
    const errorResponse = {
      message: "เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย Google",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
      timestamp: new Date().toISOString()
    };
    
    console.log("📤 Sending error response:", JSON.stringify(errorResponse, null, 2));
    res.status(500).json(errorResponse);
  }
});

// ✅ Test endpoint สำหรับตรวจสอบ
router.get("/test-firebase", (req, res) => {
  console.log("🧪 Test Firebase endpoint hit!");
  res.json({ 
    message: "Firebase endpoint is working!",
    timestamp: new Date().toISOString(),
    routes: [
      "POST /api/auth/firebase-google",
      "GET /api/auth/test-firebase"
    ]
  });
});

export default router;

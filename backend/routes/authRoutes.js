// backend/routes/authRoutes.js
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/User.js";
import auth from "../middleware/auth.js";
import { validateEmail } from "../utils/emailValidator.js";
import { sendVerificationEmail, sendWelcomeEmail, sendPasswordResetEmail } from "../utils/emailService.js";
import { validatePasswordStrength } from "../middleware/security.js";

const router = express.Router();

// ✅ Validate JWT_SECRET on startup
// ✅ สร้าง token: เก็บ id + email + role (เผื่ออยากใช้ต่อ)
const createToken = (user) => {
  const JWT_SECRET = process.env.JWT_SECRET;
  const JWT_EXPIRE = process.env.JWT_EXPIRE || "7d";
  
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  
  return jwt.sign(
    {
      id: user._id,               // ให้ตรงกับ req.user.id ที่ใช้ใน /me
      email: user.email,
      role: user.role || "jobseeker",
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRE }
  );
};

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
      hasUpper: /[A-Z]/.test(password),
      hasLower: /[a-z]/.test(password),
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

    // ✅ Generate cryptographically secure token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const JWT_SECRET = process.env.JWT_SECRET;
    const resetTokenHashed = crypto
      .createHash("sha256")
      .update(resetToken + JWT_SECRET) // ✅ Add salt
      .digest("hex");

    user.resetPasswordToken = resetTokenHashed;
    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 minutes
    await user.save();

    // ✅ Use environment variable for frontend URL
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const resetLink = `${frontendUrl}/reset-password/${resetToken}`;
    
    // ✅ Send password reset email
    try {
      const emailResult = await sendPasswordResetEmail(user.email, user.name, resetToken);
      
      if (emailResult.success) {
        console.log("✅ Password reset email sent successfully");
        res.json({ 
          message: "ถ้ามีอีเมลนี้ในระบบ เราได้ส่งลิงก์รีเซ็ตรหัสผ่านไปแล้ว กรุณาตรวจสอบอีเมลของคุณ" 
        });
      } else {
        console.error("❌ Failed to send password reset email:", emailResult.error);
        // ✅ ไม่เปิดเผยข้อมูลว่าอีเมลมีอยู่หรือไม่
        res.json({ 
          message: "ถ้ามีอีเมลนี้ในระบบ เราได้ส่งลิงก์รีเซ็ตรหัสผ่านไปแล้ว กรุณาตรวจสอบอีเมลของคุณ" 
        });
      }
    } catch (emailError) {
      console.error("❌ Email service error:", emailError);
      // ✅ ไม่เปิดเผยข้อมูลว่าอีเมลมีอยู่หรือไม่
      res.json({ 
        message: "ถ้ามีอีเมลนี้ในระบบ เราได้ส่งลิงก์รีเซ็ตรหัสผ่านไปแล้ว กรุณาตรวจสอบอีเมลของคุณ" 
      });
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log("📩 reset link:", resetLink);
    }
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.log("forgot-password error:", err);
    }
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

    // ✅ Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ 
        message: "รหัสผ่านไม่ปลอดภัย",
        errors: passwordValidation.errors
      });
    }

    // ✅ Hash token with same salt as forgot-password
    const JWT_SECRET = process.env.JWT_SECRET;
    const resetTokenHashed = crypto
      .createHash("sha256")
      .update(token + JWT_SECRET) // ✅ Use same salt
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

    // ✅ Use consistent bcrypt rounds (12)
    user.password = await bcrypt.hash(password, 12);
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

// ✅ REMOVED INSECURE FIREBASE ROUTE
// The insecure /firebase-google endpoint has been removed for security.
// Use the secure endpoint in firebaseAuthRoutes.js instead.

export default router;
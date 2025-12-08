// backend/routes/authRoutes.js
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/User.js";
import auth from "../middleware/auth.js";

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
    const { name, email, password, role } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ message: "กรอกข้อมูลไม่ครบ" });
    }

    const existed = await User.findOne({ email });
    if (existed) {
      return res.status(400).json({ message: "อีเมลนี้ถูกใช้แล้ว" });
    }

    // ✅ ป้องกันคนสมัครเป็น admin ตรง ๆ
    const roleSafe =
      role === "employer" ? "employer" : "jobseeker";

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashed,
      role: roleSafe,
    });

    const token = createToken(user);
    res.status(201).json({
      message: "สมัครสมาชิกสำเร็จ",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
      token,
    });
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
      "name email password role isActive"
    );
    if (!user) {
      return res
        .status(400)
        .json({ message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
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

export default router;

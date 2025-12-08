// backend/controllers/authController.js
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// 🔐 helper สร้าง JWT
function signToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role }, // ฝัง role ด้วย
    process.env.JWT_SECRET,            // ✅ ควรตั้งใน .env เท่านั้น
    { expiresIn: process.env.JWT_EXPIRE || "7d" }
  );
}

// ✅ REGISTER
export const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // ป้องกัน null/undefined
    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "กรุณากรอกชื่อ อีเมล และรหัสผ่านให้ครบ" });
    }

    // ตัดช่องว่าง
    const cleanName = String(name).trim();
    const cleanEmail = String(email).trim().toLowerCase();

    // ตรวจอีเมลซ้ำ
    const exist = await User.findOne({ email: cleanEmail });
    if (exist) {
      return res.status(400).json({ message: "อีเมลนี้ถูกใช้แล้ว" });
    }

    // เข้ารหัสรหัสผ่าน
    const hashed = await bcrypt.hash(password, 10);

    // อนุญาตแค่ role ที่เรากำหนด
    const allowedRoles = ["jobseeker", "employer"];
    const finalRole = allowedRoles.includes(role) ? role : "jobseeker";

    const user = await User.create({
      name: cleanName,
      email: cleanEmail,
      password: hashed,
      role: finalRole,
    });

    const token = signToken(user);

    return res.status(201).json({
      message: "สมัครสมาชิกสำเร็จ",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    return res
      .status(500)
      .json({ message: "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์ (register)" });
  }
};

// ✅ LOGIN
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "กรุณากรอกอีเมลและรหัสผ่านให้ครบ" });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(400).json({ message: "ไม่พบบัญชีผู้ใช้" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "รหัสผ่านไม่ถูกต้อง" });
    }

    const token = signToken(user);

    return res.json({
      message: "เข้าสู่ระบบสำเร็จ",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role, // 👈 React ใช้อันนี้ไปแยกหน้า jobseeker / employer / admin
      },
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return res
      .status(500)
      .json({ message: "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์ (login)" });
  }
};

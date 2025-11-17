// backend/middleware/auth.js
import jwt from "jsonwebtoken";

const auth = (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "ไม่พบ token" });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "dev-secret"
    );
    // เก็บข้อมูล user เอาไว้ใช้ใน route อื่น ๆ
    req.user = decoded; // { id, email }
    next();
  } catch (err) {
    return res.status(401).json({ message: "token ไม่ถูกต้อง" });
  }
};

export default auth;
// backend/middleware/auth.js
import jwt from "jsonwebtoken";

const auth = (req, res, next) => {
  console.log("🔐 Auth middleware - URL:", req.method, req.url);
  
  const header = req.headers.authorization || "";
  const token = header.split(" ")[1];

  if (!token) {
    console.log("❌ No token found");
    return res.status(401).json({ message: "ไม่พบ token" });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "dev-secret"
    );

    console.log("✅ Token decoded - User ID:", decoded.id);

    // ให้ route อื่นใช้ได้ทั้งแบบ req.user และ req.userId
    req.user = decoded;      // { id, email, role, ... }
    req.userId = decoded.id; // ใช้กับ getMyId(), getUserId()

    next();
  } catch (err) {
    console.error("❌ auth error:", err);
    return res.status(401).json({ message: "token ไม่ถูกต้อง" });
  }
};

export default auth;
export const authMiddleware = auth;   // ✅ เพื่อให้ใช้ชื่อ authMiddleware ได้

// backend/middleware/auth.js
import jwt from "jsonwebtoken";

const auth = (req, res, next) => {
  // ✅ Validate JWT_SECRET when middleware is used
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) {
    console.error('❌ JWT_SECRET environment variable is required');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  // ✅ Only log in development
  if (process.env.NODE_ENV === 'development') {
    console.log("🔐 Auth middleware - URL:", req.method, req.url);
  }
  
  const header = req.headers.authorization || "";
  const token = header.split(" ")[1];

  if (!token) {
    if (process.env.NODE_ENV === 'development') {
      console.log("❌ No token found");
    }
    return res.status(401).json({ message: "ไม่พบ token" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (process.env.NODE_ENV === 'development') {
      console.log("✅ Token decoded - User ID:", decoded.id);
    }

    // ให้ route อื่นใช้ได้ทั้งแบบ req.user และ req.userId
    req.user = decoded;      // { id, email, role, ... }
    req.userId = decoded.id; // ใช้กับ getMyId(), getUserId()

    next();
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.error("❌ auth error:", err);
    }
    return res.status(401).json({ message: "token ไม่ถูกต้อง" });
  }
};

export default auth;
export const authMiddleware = auth;   // ✅ เพื่อให้ใช้ชื่อ authMiddleware ได้

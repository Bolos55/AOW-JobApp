// backend/server.js
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";

// ✅ Security Middleware
import { 
  securityHeaders, 
  corsOptions, 
  sanitizeInput, 
  apiRateLimit, 
  authRateLimit,
  securityLogger 
} from "./middleware/security.js";
import cors from "cors";
import { logger } from "./utils/logger.js";

// ✅ import routes
import authRoutes from "./routes/authRoutes.js";
import firebaseAuthRoutes from "./routes/firebaseAuthRoutes.js";
import jobRoutes from "./routes/jobRoutes.js";
import applicationRoutes from "./routes/applicationRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import employerRoutes from "./routes/employerRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import pdpaRoutes from "./routes/pdpaRoutes.js";
import onlineStatusRoutes from "./routes/onlineStatusRoutes.js";

dotenv.config();
const app = express();

// ✅ Security Headers (ต้องอยู่ก่อน CORS)
app.use(securityHeaders);

// ✅ Security Logging
app.use(securityLogger);

// ✅ CORS with environment-based configuration
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ✅ Input Sanitization
app.use(sanitizeInput);

// ✅ Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/* uploads static */
if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");

// ✅ เพิ่มการจัดการ error สำหรับไฟล์ที่หาไม่เจอ
app.use("/uploads", (req, res, next) => {
  const filePath = `uploads${req.path}`;
  
  // ตรวจสอบว่าไฟล์มีอยู่จริงหรือไม่
  if (fs.existsSync(filePath)) {
    next(); // ไฟล์มีอยู่ ให้ express.static จัดการต่อ
  } else {
    logger.debug(`❌ File not found: ${filePath}`);
    res.status(404).json({ 
      error: "File not found", 
      message: "ไฟล์ที่ร้องขอไม่พบในระบบ อาจถูกลบหรือย้ายแล้ว"
    });
  }
});

app.use("/uploads", express.static("uploads"));

/* MongoDB */
const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/job-app";

mongoose
  .connect(MONGO_URI)
  .then(() => {
    logger.info("✅ MongoDB connected successfully");
  })
  .catch((err) => {
    logger.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });

/* Routes พื้นฐาน */
app.get("/api", (_req, res) => {
  res.json({ 
    message: "API is running",
    version: process.env.API_VERSION || "1.0.0",
    environment: process.env.NODE_ENV || "development"
  });
});

// ✅ health check / เอาไว้ปลุกเซิร์ฟเวอร์ให้ตื่นเร็ว ๆ
app.get("/api/health", (_req, res) => {
  res.json({ 
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ✅ Apply rate limiting to different route groups
app.use("/api/auth", authRateLimit); // Stricter rate limiting for auth
app.use("/api", apiRateLimit); // General API rate limiting

// ✅ Debug middleware - log all requests
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`📡 ${req.method} ${req.path} - ${timestamp}`);
  
  if (req.path.includes('firebase-google')) {
    console.log("🔥🔥🔥 FIREBASE GOOGLE REQUEST DETECTED! 🔥🔥🔥");
    console.log("📋 Method:", req.method);
    console.log("📋 Path:", req.path);
    console.log("📋 Original URL:", req.originalUrl);
    console.log("📋 Body:", JSON.stringify(req.body, null, 2));
    console.log("📋 Headers:", JSON.stringify(req.headers, null, 2));
  }
  
  next();
});

// ✅ ผูก route ต่าง ๆ ให้ frontend เรียกได้
console.log("🔗 Registering routes...");
console.log("📁 Available routes will be:");
console.log("  - POST /api/auth/firebase-google");
console.log("  - GET /api/auth/test-firebase");
app.use("/api/auth", authRoutes);
app.use("/api/auth", firebaseAuthRoutes);
console.log("✅ Auth routes registered: /api/auth");
app.use("/api/jobs", jobRoutes);
app.use("/api", applicationRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/employer", employerRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/pdpa", pdpaRoutes);
app.use("/api/online", onlineStatusRoutes);
console.log("✅ All routes registered successfully");

// ✅ Simple test endpoints (no dependencies)
app.get("/ping", (req, res) => {
  res.send("pong");
});

app.get("/test", (req, res) => {
  res.json({ message: "Backend is working!", timestamp: new Date().toISOString() });
});

// ✅ Health check endpoint
app.get("/", (req, res) => {
  console.log("🏥 Health check endpoint hit");
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: "1.0.0",
    routes: {
      auth: "/api/auth/*",
      firebase: "/api/auth/firebase-google",
      test: "/api/auth/test-firebase"
    }
  });
});

app.get("/health", (req, res) => {
  console.log("🏥 Health endpoint hit");
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ✅ Debug route - แสดงทุก request ที่ไม่ match
app.use("/api/*", (req, res) => {
  console.log(`❌ Unmatched API route: ${req.method} ${req.originalUrl}`);
  console.log("📋 Available auth routes:");
  console.log("  - POST /api/auth/firebase-google");
  console.log("  - GET /api/auth/test-firebase");
  res.status(404).json({
    error: "API endpoint not found",
    method: req.method,
    path: req.originalUrl,
    availableAuthRoutes: [
      "POST /api/auth/firebase-google",
      "GET /api/auth/test-firebase"
    ]
  });
});

// ✅ Global Error Handler
app.use((err, req, res, next) => {
  // Log error for monitoring
  logger.error('Global Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.url,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  // CORS Error
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      error: 'CORS Error',
      message: 'Origin not allowed'
    });
  }

  // Rate Limit Error
  if (err.status === 429) {
    return res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.'
    });
  }

  // Default error response
  const isDevelopment = process.env.NODE_ENV === 'development';
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: isDevelopment ? err.message : 'Something went wrong',
    ...(isDevelopment && { stack: err.stack })
  });
});

// ✅ 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'API endpoint not found',
    path: req.originalUrl
  });
});

/* START */
// ✅ Startup validation
console.log("🔍 Starting server validation...");
console.log("📋 Environment variables:");
console.log("  - NODE_ENV:", process.env.NODE_ENV || 'not set');
console.log("  - PORT:", process.env.PORT || '5000 (default)');
console.log("  - MONGODB_URI:", process.env.MONGODB_URI ? 'Present' : 'Missing');
console.log("  - JWT_SECRET:", process.env.JWT_SECRET ? 'Present' : 'Missing');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("🚀🚀🚀 SERVER STARTED SUCCESSFULLY 🚀🚀🚀");
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  console.log("📋 Available endpoints:");
  console.log("  - GET  /ping");
  console.log("  - GET  /test");
  console.log("  - GET  / (health check)");
  console.log("  - GET  /health");
  console.log("  - POST /api/auth/firebase-google");
  console.log("  - GET  /api/auth/test-firebase");
  console.log("🚀🚀🚀 SERVER READY FOR REQUESTS 🚀🚀🚀");
  
  logger.info(`💖 Server running on port ${PORT}`);
  logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// ✅ Process error handlers
process.on('uncaughtException', (err) => {
  console.error('🚨 Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('🚨 Unhandled Rejection:', err);
  process.exit(1);
});

console.log("✅ Server setup complete - waiting for requests...");

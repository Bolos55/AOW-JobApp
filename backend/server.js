// backend/server.js
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import cors from "cors";

// ===============================
// Security & Utils
// ===============================
import {
  securityHeaders,
  corsOptions,
  sanitizeInput,
  apiRateLimit,
  authRateLimit,
  securityLogger,
  createRateLimit,
  uploadRateLimit,
} from "./middleware/security.js";
import { 
  monitorAuthFailure,
  monitorRateLimit,
  detectSuspiciousPatterns,
  trackIPSecurity
} from "./middleware/securityMonitoring.js";
import { logger } from "./utils/logger.js";

// ===============================
// Routes
// ===============================
import authRoutes from "./routes/authRoutes.js";
import firebaseAuthRoutes from "./routes/firebaseAuthRoutes.js";
import socialAuthRoutes from "./routes/socialAuthRoutes.js";
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

// ===============================
// App Init
// ===============================
dotenv.config();
const app = express();

// ===============================
// Global Security Middleware
// ===============================
app.use(securityHeaders);
app.use(securityLogger);

// ✅ Security monitoring
app.use(trackIPSecurity);
app.use(detectSuspiciousPatterns);
app.use(monitorAuthFailure);
app.use(monitorRateLimit);

// ✅ Enhanced CORS configuration for production with photo upload support
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'https://aow-jobapp.onrender.com',
      'https://aow-jobapp-frontend.onrender.com'
    ];
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Allow any origin in development
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    console.log('❌ CORS blocked origin:', origin);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With', 
    'Origin',
    'Accept',
    'Cache-Control',
    'X-Forwarded-For',
    'X-Real-IP'
  ],
  exposedHeaders: ['Content-Length', 'X-Total-Count'],
  optionsSuccessStatus: 200,
  preflightContinue: false
};

app.use(cors(corsOptions));

// ✅ Manual CORS headers for all responses (backup)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://aow-jobapp.onrender.com',
    'https://aow-jobapp-frontend.onrender.com'
  ];
  
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  } else if (process.env.NODE_ENV === 'development') {
    res.header('Access-Control-Allow-Origin', origin || '*');
  } else {
    res.header('Access-Control-Allow-Origin', 'https://aow-jobapp-frontend.onrender.com');
  }
  
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Origin, Accept, Cache-Control');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Max-Age', '86400');
    return res.sendStatus(200);
  }
  
  next();
});

// ✅ Handle preflight requests for all routes
app.options("*", cors(corsOptions));

// Input sanitize
app.use(sanitizeInput);

// Body parser with raw body for webhooks
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ✅ Raw body middleware for webhook signature verification
app.use('/api/payments/webhook', (req, res, next) => {
  req.rawBody = req.body;
  req.body = JSON.parse(req.body);
  next();
});

// ===============================
// Static uploads with enhanced CORS and error handling
// ===============================
if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");

// ✅ Enhanced static file serving with proper error handling
app.use("/uploads", (req, res, next) => {
  // Set CORS headers for static files
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  
  const filePath = `uploads${req.path}`;
  console.log(`📁 Static file request: ${filePath}`);
  
  if (fs.existsSync(filePath)) {
    console.log(`✅ File exists: ${filePath}`);
    return next();
  } else {
    console.log(`❌ File not found: ${filePath}`);
    return res.status(404).json({ 
      error: "File not found",
      path: req.path,
      message: "รูปภาพที่ร้องขอไม่พบ อาจถูกลบหรือย้ายแล้ว"
    });
  }
});

app.use("/uploads", express.static("uploads", {
  setHeaders: (res, path) => {
    // ✅ Force CORS headers for all static files
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
  }
}));

// ===============================
// Database
// ===============================
const MONGO_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/job-app";

mongoose
  .connect(MONGO_URI)
  .then(() => logger.info("✅ MongoDB connected"))
  .catch((err) => {
    logger.error("❌ MongoDB error:", err.message);
    console.error("🚨 CRITICAL: MongoDB connection failed. Exiting...");
    process.exit(1);
  });

// ===============================
// Basic endpoints
// ===============================
app.get("/api", (_req, res) => {
  res.json({
    message: "API is running",
    environment: process.env.NODE_ENV || "development",
  });
});

// ===============================
// ✅ COMPREHENSIVE RATE LIMITING
// ===============================

// ✅ จำกัดเฉพาะ email/password (เสี่ยง brute-force)
app.post("/api/auth/login", authRateLimit);
app.post("/api/auth/register", authRateLimit);
app.post("/api/auth/forgot-password", authRateLimit);
app.post("/api/auth/reset-password", authRateLimit);

// ✅ API rate limiting for general endpoints (exclude payments)
app.use("/api/jobs", apiRateLimit);
app.use("/api/applications", apiRateLimit);
app.use("/api/reviews", apiRateLimit);
app.use("/api/chats", apiRateLimit);
// ❌ Exclude /api/payments from general rate limiting

// ✅ Payment rate limiting (less strict for viewing, strict for transactions)
app.use("/api/payments/create", createRateLimit(15 * 60 * 1000, 5)); // 5 payment creations per 15 minutes
app.use("/api/payments/webhook", createRateLimit(5 * 60 * 1000, 50)); // 50 webhook calls per 5 minutes

// ✅ Explicitly bypass rate limits for payment history and status checks
app.use("/api/payments/my-payments", (req, res, next) => {
  console.log("🔍 Payment history request - bypassing rate limits");
  next();
});

app.use("/api/payments/:paymentId/status", (req, res, next) => {
  console.log("🔍 Payment status request - bypassing rate limits");
  next();
});

// OAuth / Firebase / GitHub ❌ ไม่โดน rate limit (ใช้ provider's rate limiting)

// ===============================
// Health Check & API Info
// ===============================
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
    uptime: process.uptime(),
    endpoints: {
      auth: "/api/auth/*",
      jobs: "/api/jobs/*",
      applications: "/api/applications/*",
      profile: "/api/profile/*",
      payments: "/api/payments/*",
      chats: "/api/chats/*",
      reviews: "/api/reviews/*",
      admin: "/api/admin/*",
      online: "/api/online/*"
    },
    security: {
      rateLimiting: "enabled",
      cors: "configured",
      authentication: "JWT + Firebase",
      fileUpload: "secure",
      paymentWebhook: "HMAC-SHA256"
    },
    cloudinary: {
      configured: !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET),
      cloudName: process.env.CLOUDINARY_CLOUD_NAME ? "✅ Set" : "❌ Missing",
      apiKey: process.env.CLOUDINARY_API_KEY ? "✅ Set" : "❌ Missing",
      apiSecret: process.env.CLOUDINARY_API_SECRET ? "✅ Set" : "❌ Missing"
    }
  });
});

// API Documentation endpoint
app.get("/api", (req, res) => {
  res.json({
    message: "AOW Job Platform API",
    version: "1.0.0",
    documentation: "/api/health",
    endpoints: {
      "Authentication": "/api/auth/*",
      "Jobs": "/api/jobs/*", 
      "Applications": "/api/applications/*",
      "Profile": "/api/profile/*",
      "Payments": "/api/payments/*",
      "Chat": "/api/chats/*",
      "Reviews": "/api/reviews/*",
      "Admin": "/api/admin/*",
      "Online Status": "/api/online/*"
    }
  });
});

// ===============================
// Routes registration
// ===============================
if (process.env.NODE_ENV === 'development') {
  console.log("🔗 Registering routes...");
}

app.use("/api/auth", authRoutes);
app.use("/api/auth", firebaseAuthRoutes);
app.use("/api/auth", socialAuthRoutes);

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

// ===============================
// ❌ Remove general API rate limit - too broad
// app.use("/api", apiRateLimit);

// ===============================
// Debug / Test
// ===============================
app.get("/ping", (_req, res) => res.send("pong"));

app.get("/", (_req, res) => {
  res.json({
    status: "ok",
    routes: {
      auth: "/api/auth/*",
      firebase: "/api/auth/firebase-google",
      testFirebase: "/api/auth/test-firebase",
    },
  });
});

// ===============================
// 404 Handler
// ===============================
app.use("/api/*", (req, res) => {
  res.status(404).json({
    error: "API endpoint not found",
    path: req.originalUrl,
  });
});

app.use("*", (req, res) => {
  res.status(404).json({
    error: "Not Found",
    path: req.originalUrl,
  });
});

// ===============================
// Global Error Handler
// ===============================
app.use((err, req, res, _next) => {
  // ✅ Always set CORS headers even for errors
  const origin = req.headers.origin;
  const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://aow-jobapp.onrender.com',
    'https://aow-jobapp-frontend.onrender.com'
  ];
  
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  } else if (process.env.NODE_ENV === 'development') {
    res.header('Access-Control-Allow-Origin', origin || '*');
  } else {
    res.header('Access-Control-Allow-Origin', 'https://aow-jobapp-frontend.onrender.com');
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Origin, Accept');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // ✅ Enhanced error logging
  logger.error("Global Error", {
    message: err.message,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    timestamp: new Date().toISOString()
  });

  // ✅ Handle specific error types
  if (err.status === 429 || err.code === 'RATE_LIMITED') {
    return res.status(429).json({
      error: "Too Many Requests",
      message: "คำขอมากเกินไป กรุณารอสักครู่แล้วลองใหม่",
      retryAfter: err.retryAfter || 60
    });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: "Validation Error",
      message: "ข้อมูลที่ส่งมาไม่ถูกต้อง",
      details: process.env.NODE_ENV === "development" ? err.message : undefined
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      error: "Invalid ID",
      message: "รหัสที่ระบุไม่ถูกต้อง"
    });
  }

  if (err.code === 11000) {
    return res.status(409).json({
      error: "Duplicate Entry",
      message: "ข้อมูลซ้ำกับที่มีอยู่แล้ว"
    });
  }

  // ✅ Handle multer errors specifically
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: "File Too Large",
      message: "ไฟล์ใหญ่เกินไป กรุณาเลือกไฟล์ที่เล็กกว่า"
    });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      error: "Invalid File Type",
      message: "รูปแบบไฟล์ไม่ถูกต้อง"
    });
  }

  // ✅ Handle timeout errors
  if (err.code === 'ETIMEDOUT' || err.message.includes('timeout')) {
    return res.status(408).json({
      error: "Request Timeout",
      message: "คำขอใช้เวลานานเกินไป กรุณาลองใหม่"
    });
  }

  // ✅ Default error response
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    error: statusCode >= 500 ? "Internal Server Error" : "Request Error",
    message: process.env.NODE_ENV === "development" 
      ? err.message 
      : statusCode >= 500 
        ? "เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่อีกครั้ง"
        : err.message || "เกิดข้อผิดพลาด",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack })
  });
});

// ===============================
// Start server
// ===============================
const PORT = process.env.PORT || 5000;

// ✅ Ensure uploads directories exist
const ensureUploadsDirectories = () => {
  const directories = [
    'uploads',
    'uploads/photos',
    'uploads/resumes',
    'uploads/idcards',
    'uploads/profile'
  ];
  
  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  });
};

app.listen(PORT, () => {
  console.log("🚀 SERVER STARTED");
  console.log(`📡 Port: ${PORT}`);
  console.log(`🌍 ENV: ${process.env.NODE_ENV || "development"}`);
  
  // ✅ Debug Cloudinary config on server start
  console.log("🔧 Cloudinary Environment Check:");
  console.log("  CLOUDINARY_CLOUD_NAME:", process.env.CLOUDINARY_CLOUD_NAME ? "✅ Set" : "❌ Missing");
  console.log("  CLOUDINARY_API_KEY:", process.env.CLOUDINARY_API_KEY ? "✅ Set" : "❌ Missing");
  console.log("  CLOUDINARY_API_SECRET:", process.env.CLOUDINARY_API_SECRET ? "✅ Set" : "❌ Missing");
  
  // Ensure upload directories exist
  ensureUploadsDirectories();
  
  if (process.env.NODE_ENV === 'development') {
    console.log("✅ Firebase Google Login is NOT rate-limited");
  }
});

// ===============================
// Process safety
// ===============================
process.on("uncaughtException", (err) => {
  console.error("🚨 Uncaught Exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  console.error("🚨 Unhandled Rejection:", err);
  process.exit(1);
});

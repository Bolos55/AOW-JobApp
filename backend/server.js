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

// CORS - ✅ Enhanced for file uploads
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://aow-jobapp.onrender.com',
    'https://aow-jobapp-frontend.onrender.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With', 
    'Origin',
    'Accept',
    'Cache-Control'
  ],
  exposedHeaders: ['Content-Length'],
}));
app.options("*", cors());

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
// Static uploads with CORS support
// ===============================
if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");

// ✅ CORS middleware specifically for uploads
app.use("/uploads", cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://aow-jobapp.onrender.com',
    'https://aow-jobapp-frontend.onrender.com'
  ],
  methods: ['GET'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Origin'],
  credentials: false
}));

app.use("/uploads", (req, res, next) => {
  const filePath = `uploads${req.path}`;
  if (fs.existsSync(filePath)) return next();
  res.status(404).json({ error: "File not found" });
});

app.use("/uploads", express.static("uploads", {
  setHeaders: (res, path) => {
    // ✅ Force CORS headers for all static files
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
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

// ✅ API rate limiting for general endpoints
app.use("/api/jobs", apiRateLimit);
app.use("/api/applications", apiRateLimit);
app.use("/api/reviews", apiRateLimit);
app.use("/api/chats", apiRateLimit);
app.use("/api/profile", apiRateLimit);

// ✅ Upload rate limiting
app.use("/api/profile/me/resume", uploadRateLimit);
app.use("/api/profile/me/photo", uploadRateLimit);

// ✅ Payment rate limiting (stricter)
app.use("/api/payments", createRateLimit(15 * 60 * 1000, 10)); // 10 requests per 15 minutes

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
// General API rate limit
// ===============================
app.use("/api", apiRateLimit);

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
  logger.error("Global Error", {
    message: err.message,
    path: req.originalUrl,
    method: req.method,
  });

  if (err.status === 429) {
    return res.status(429).json({
      error: "Too Many Requests",
      message: "Rate limit exceeded",
    });
  }

  res.status(err.status || 500).json({
    error: "Internal Server Error",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Something went wrong",
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

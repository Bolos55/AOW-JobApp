// backend/server.js
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import fs from "fs";

// ✅ import routes
import authRoutes from "./routes/authRoutes.js";
import jobRoutes from "./routes/jobRoutes.js";
import applicationRoutes from "./routes/applicationRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import employerRoutes from "./routes/employerRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";

dotenv.config();
const app = express();

/* CORS */
const allowlist = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "https://aow-jobapp-frontend.onrender.com",
  process.env.FRONTEND_URL,
];

const corsOptions = {
  origin: (origin, cb) => {
    if (!origin || allowlist.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS blocked for origin: ${origin}`), false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* uploads static */
if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");
app.use("/uploads", express.static("uploads"));

/* MongoDB */
const MONGO_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/job-app";

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => console.log("❌ MongoDB error:", err.message));

/* Routes พื้นฐาน */
app.get("/api", (_req, res) => {
  res.json({ message: "API is running" });
});

// ✅ health check / เอาไว้ปลุกเซิร์ฟเวอร์ให้ตื่นเร็ว ๆ
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// ✅ ผูก route ต่าง ๆ ให้ frontend เรียกได้
app.use("/api/auth", authRoutes); // /api/auth/register, /api/auth/login, ...
app.use("/api/jobs", jobRoutes); // /api/jobs/...
app.use("/api", applicationRoutes); // /api/applications..., /api/jobs/:id/applications
app.use("/api/reviews", reviewRoutes);
app.use("/api/chats", chatRoutes); // แชท
app.use("/api/admin", adminRoutes); // ✅ เส้นทางสำหรับหน้า AdminView
app.use("/api/employer", employerRoutes);
app.use("/api/profile", profileRoutes); // ✅ เส้นทางโปรไฟล์ (ใหม่)

/* START */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`💖 Server running on port ${PORT}`);
});

// backend/routes/firebaseAuthRoutes.js
import express from "express";
import { firebaseGoogleLogin } from "../controllers/firebaseAuthController.js";

const router = express.Router();

// ✅ Debug middleware
router.use((req, res, next) => {
  console.log(`🔥 Firebase Auth Route: ${req.method} ${req.path}`);
  console.log("📋 Request body:", req.body);
  next();
});

// ===================== FIREBASE GOOGLE LOGIN =====================
router.post("/firebase-google", firebaseGoogleLogin);

// ✅ Test endpoint
router.get("/test", (req, res) => {
  console.log("🧪 Firebase auth test endpoint hit");
  res.json({ 
    message: "Firebase Auth Routes Working!",
    timestamp: new Date().toISOString(),
    path: req.path
  });
});

export default router;
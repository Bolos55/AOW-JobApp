// backend/routes/applicationRoutes.js
import express from "express";
import multer from "multer";
import Job from "../models/Job.js";
import User from "../models/User.js";
import Application from "../models/Application.js";
import auth from "../middleware/auth.js";

const router = express.Router();

// multer สำหรับ upload resume / บัตรประชาชน
const upload = multer({ dest: "uploads/" });

// ✅ ส่งใบสมัคร + รูปบัตรประชาชน
router.post(
  "/applications",
  auth,
  upload.fields([
    { name: "resume", maxCount: 1 },
    { name: "idCard", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { 
        jobId, 
        message, 
        profile, 
        applicationMetadata,
        useProfileResume,
        profileResumeUrl
      } = req.body || {};
      
      const job = await Job.findById(jobId);
      if (!job) return res.status(404).json({ message: "ไม่พบงานนี้" });

      const user = await User.findById(req.user.id);

      const resumeFile = req.files?.resume?.[0] || null;
      const idCardFile = req.files?.idCard?.[0] || null;

      // ✅ ตรวจสอบเรซูเม่ - ใช้จากโปรไฟล์หรืออัปโหลดใหม่
      let resumePath = null;
      if (useProfileResume === "true" && profileResumeUrl) {
        // ใช้เรซูเม่จากโปรไฟล์
        resumePath = profileResumeUrl;
      } else if (resumeFile) {
        // ใช้เรซูเม่ที่อัปโหลดใหม่
        resumePath = resumeFile.path;
      } else {
        return res.status(400).json({ 
          message: "กรุณาแนบไฟล์เรซูเม่ หรือเลือกใช้เรซูเม่จากโปรไฟล์" 
        });
      }

      if (!idCardFile) {
        return res
          .status(400)
          .json({ message: "กรุณาอัปโหลดรูปบัตรประชาชนเพื่อยืนยันตัวตน" });
      }

      // ✅ ตรวจสอบว่าเคยสมัครงานนี้แล้วหรือยัง
      const existingApp = await Application.findOne({
        job: job._id,
        applicant: req.user.id
      });

      if (existingApp) {
        return res.status(400).json({ 
          message: "คุณได้สมัครงานนี้ไปแล้ว ไม่สามารถสมัครซ้ำได้" 
        });
      }

      // ✅ สร้าง Application ID ที่ไม่ซ้ำ
      const applicationId = `APP-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // ✅ Parse metadata ถ้ามี
      let parsedMetadata = {};
      try {
        if (applicationMetadata) {
          parsedMetadata = JSON.parse(applicationMetadata);
        }
      } catch (e) {
        console.log("Invalid metadata:", e);
      }

      const appData = await Application.create({
        job: job._id,
        jobTitle: job.title,
        jobCode: job.jobCode,
        applicant: req.user.id,
        applicantName: user?.name || user?.email || "ผู้ใช้",
        applicantEmail: user?.email,
        message,
        personalProfile: profile,

        // ✅ path ไฟล์เรซูเม่ (จากโปรไฟล์หรืออัปโหลดใหม่)
        resumePath,
        resumeSource: useProfileResume === "true" ? "profile" : "upload",
        idCardPath: idCardFile.path,

        // ✅ ตั้งค่าเริ่มต้นให้รอแอดมินตรวจ
        verifyStatus: "pending",
        
        // ✅ เพิ่มข้อมูล metadata และ application ID
        applicationId,
        submissionMetadata: {
          ...parsedMetadata,
          ipAddress: req.ip || req.connection.remoteAddress,
          submittedAt: new Date(),
        }
      });

      // ✅ ส่งกลับข้อมูลที่มี applicationId
      res.status(201).json({
        ...appData.toObject(),
        applicationId,
        message: "ส่งใบสมัครสำเร็จ"
      });
    } catch (err) {
      console.log("apply error:", err);
      res.status(500).json({ message: "ส่งใบสมัครไม่สำเร็จ" });
    }
  }
);

// ดูผู้สมัครของงานหนึ่ง
router.get("/jobs/:id/applications", auth, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: "ไม่พบนงานนี้" });

    if (job.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: "ไม่มีสิทธิ์ดูผู้สมัครงานนี้" });
    }

    const apps = await Application.find({ job: job._id })
      .sort({ createdAt: -1 })
      .lean();

    res.json(apps);
  } catch (err) {
    console.log("list applications error:", err);
    res.status(500).json({ message: "ดึงรายชื่อผู้สมัครไม่สำเร็จ" });
  }
});

// จ้าง (สถานะ hired)
router.put("/applications/:id/hire", auth, async (req, res) => {
  try {
    const appDoc = await Application.findById(req.params.id).populate("job");
    if (!appDoc) return res.status(404).json({ message: "ไม่พบใบสมัครนี้" });

    if (appDoc.job.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: "ไม่มีสิทธิ์จ้างคนนี้" });
    }

    appDoc.status = "hired";
    appDoc.hiredAt = new Date();
    await appDoc.save();

    res.json({ message: "จ้างงานแล้ว", application: appDoc });
  } catch (err) {
    console.log("hire error:", err);
    res.status(500).json({ message: "จ้างงานไม่สำเร็จ" });
  }
});

// เปลี่ยนสถานะ (PATCH + POST สำรอง)
const updateStatusHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    if (!["pending", "hired", "rejected"].includes(status)) {
      return res.status(400).json({ message: "สถานะไม่ถูกต้อง" });
    }

    const appDoc = await Application.findById(id).populate("job");
    if (!appDoc) return res.status(404).json({ message: "ไม่พบใบสมัคร" });

    if (appDoc.job.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: "ไม่มีสิทธิ์เปลี่ยนสถานะ" });
    }

    appDoc.status = status;
    appDoc.hiredAt = status === "hired" ? new Date() : undefined;
    await appDoc.save();

    return res.json({ message: "อัปเดตสถานะเรียบร้อย", application: appDoc });
  } catch (err) {
    console.log("update application status error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดที่เซิร์ฟเวอร์" });
  }
};

router.patch("/applications/:id/status", auth, updateStatusHandler);
router.post("/applications/:id/status", auth, updateStatusHandler);

/* "งานที่เคยสมัครแล้ว" ของผู้ใช้ปัจจุบัน */
router.get("/my-applications", auth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "ไม่พบข้อมูลผู้ใช้ใน token" });
    }

    const apps = await Application.find({ applicant: userId })
      .populate("job", "title company jobCode salary location type workplacePhotos")
      .sort({ createdAt: -1 })
      .lean();

    return res.json(apps);
  } catch (err) {
    console.log("my-applications error:", err);
    return res
      .status(500)
      .json({ message: "เกิดข้อผิดพลาดในการดึงงานที่เคยสมัคร" });
  }
});

export default router;

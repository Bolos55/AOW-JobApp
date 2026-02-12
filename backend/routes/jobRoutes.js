// backend/routes/jobRoutes.js
import express from "express";
import Job from "../models/Job.js";
import auth from "../middleware/auth.js";

const router = express.Router();

/* ========= helper ========= */

// รวม logic หยิบ id ผู้ใช้จาก middleware auth
function getUserId(req) {
  return (
    req.userId ||
    (req.user && (req.user._id || req.user.id)) ||
    null
  );
}

// สร้างรหัสงานง่าย ๆ เช่น JOB-123456
function genJobCode() {
  const rand = Math.floor(Math.random() * 900000) + 100000; // 6 หลัก
  return `JOB-${rand}`;
}

/* ========= ROUTES ========= */

/**
 * GET /api/jobs
 * ดึงรายการงานทั้งหมด (public)
 */
router.get("/", async (_req, res) => {
  try {
    const jobs = await Job.find().sort({ createdAt: -1 });
    return res.json(jobs);
  } catch (err) {
    console.error("GET /api/jobs error:", err);
    return res.status(500).json({ message: "ดึงรายการงานไม่สำเร็จ" });
  }
});

/**
 * GET /api/jobs/:id
 * ดึงงานทีละตัว (public)
 */
router.get("/:id", async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: "ไม่พบนงานนี้" });
    }
    return res.json(job);
  } catch (err) {
    console.error("GET /api/jobs/:id error:", err);
    return res.status(500).json({ message: "ดึงข้อมูลงานไม่สำเร็จ" });
  }
});

/**
 * POST /api/jobs
 * เพิ่มงานใหม่ (ต้องล็อกอิน)
 */
router.post("/", auth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "กรุณาเข้าสู่ระบบก่อนเพิ่มงาน" });
    }

    const {
      title,
      company,
      salary,
      salaryType,
      minSalary,
      maxSalary,
      location,
      type,
      category,
      description,
      skills,
      workMode,
      mapLink,
      workingHours,
      dayOff,
      benefits,
      contactEmail,
      contactPhone,
      contactWebsite,
      deadline,
    } = req.body || {};

    // 👉 validate ง่าย ๆ ให้สอดคล้องกับฝั่งฟอร์ม
    if (!title || !title.trim()) {
      return res.status(400).json({ message: "กรุณากรอกชื่อตำแหน่งงาน" });
    }
    if (!company || !company.trim()) {
      return res.status(400).json({ message: "กรุณากรอกชื่อบริษัท" });
    }
    if (!description || description.trim().length < 50) {
      return res
        .status(400)
        .json({ message: "กรุณากรอกรายละเอียดงานอย่างน้อย 50 ตัวอักษร" });
    }

    // ถ้า category ไม่ส่งมาให้ใช้ "other"
    const finalCategory = category || "other";

    const jobData = {
      title: title.trim(),
      company: company.trim(),
      salary: salary || "ตามตกลง",
      salaryType: salaryType || "monthly",
      minSalary: minSalary ? Number(minSalary) : undefined,
      maxSalary: maxSalary ? Number(maxSalary) : undefined,
      location: location || "ไม่ระบุ",
      type: type || "Full-time",
      category: finalCategory,
      jobCode: genJobCode(), // ⭐ สำคัญ: เติม jobCode ที่ schema require
      createdBy: userId, // เจ้าของโพสต์งาน
      description,
      skills: Array.isArray(skills) ? skills : [],
      workMode,
      mapLink,
      workingHours,
      dayOff,
      benefits,
      contactEmail,
      contactPhone,
      contactWebsite,
      deadline,
    };

    const job = await Job.create(jobData);
    return res.status(201).json(job);
  } catch (err) {
    console.error("POST /api/jobs error:", err);
    return res.status(500).json({ message: "สร้างงานไม่สำเร็จ" });
  }
});

/**
 * PUT /api/jobs/:id
 * แก้งาน (เฉพาะเจ้าของโพสต์)
 */
router.put("/:id", auth, async (req, res) => {
  try {
    const userId = getUserId(req);

    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: "ไม่พบนงานนี้" });
    }

    if (job.createdBy.toString() !== String(userId)) {
      return res.status(403).json({ message: "ไม่มีสิทธิ์แก้งานนี้" });
    }

    // ไม่ให้แก้ jobCode / createdBy แบบมั่ว ๆ
    const { jobCode, createdBy, ...rest } = req.body || {};
    Object.assign(job, rest);
    await job.save();

    return res.json(job);
  } catch (err) {
    console.error("PUT /api/jobs/:id error:", err);
    return res.status(500).json({ message: "แก้งานไม่สำเร็จ" });
  }
});

/**
 * PATCH /api/jobs/:id/close
 * ✅ ปิดงาน (เฉพาะเจ้าของโพสต์)
 */
router.patch("/:id/close", auth, async (req, res) => {
  try {
    const userId = getUserId(req);

    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: "ไม่พบนงานนี้" });
    }

    if (job.createdBy.toString() !== String(userId)) {
      return res.status(403).json({ message: "ไม่มีสิทธิ์ปิดงานนี้" });
    }

    job.isCompleted = true;
    job.completedAt = new Date();
    await job.save();

    return res.json({ message: "ปิดงานสำเร็จ", job });
  } catch (err) {
    console.error("PATCH /api/jobs/:id/close error:", err);
    return res.status(500).json({ message: "ปิดงานไม่สำเร็จ" });
  }
});

/**
 * DELETE /api/jobs/:id
 * ลบงาน (เฉพาะเจ้าของโพสต์)
 */
router.delete("/:id", auth, async (req, res) => {
  try {
    const userId = getUserId(req);

    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: "ไม่พบนงานนี้" });
    }

    if (job.createdBy.toString() !== String(userId)) {
      return res.status(403).json({ message: "ไม่มีสิทธิ์ลบงานนี้" });
    }

    await job.deleteOne();
    return res.json({ message: "ลบงานเรียบร้อย" });
  } catch (err) {
    console.error("DELETE /api/jobs/:id error:", err);
    return res.status(500).json({ message: "ลบงานไม่สำเร็จ" });
  }
});

/**
 * POST /api/jobs/:id/photos
 * อัปโหลดรูปภาพสถานที่ทำงาน (1-3 รูป)
 */
import { uploadMultiplePhotos } from "../config/cloudinary.js";

router.post("/:id/photos", auth, uploadMultiplePhotos.array("photos", 3), async (req, res) => {
  try {
    const userId = getUserId(req);
    
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: "ไม่พบงานนี้" });
    }

    // ตรวจสอบสิทธิ์ (เฉพาะเจ้าของงาน)
    if (job.createdBy.toString() !== String(userId)) {
      return res.status(403).json({ message: "ไม่มีสิทธิ์อัปโหลดรูปงานนี้" });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "ไม่พบไฟล์รูปภาพ" });
    }

    // ดึง URL จาก Cloudinary
    const photoUrls = req.files.map(file => file.path);
    
    // เพิ่มรูปเข้าไปใน array (สูงสุด 3 รูป)
    const currentPhotos = job.workplacePhotos || [];
    const newPhotos = [...currentPhotos, ...photoUrls].slice(0, 3);
    
    job.workplacePhotos = newPhotos;
    await job.save();

    return res.json({ 
      message: "อัปโหลดรูปสำเร็จ", 
      workplacePhotos: job.workplacePhotos 
    });
  } catch (err) {
    console.error("POST /api/jobs/:id/photos error:", err);
    return res.status(500).json({ message: "อัปโหลดรูปไม่สำเร็จ" });
  }
});

/**
 * DELETE /api/jobs/:id/photos/:photoIndex
 * ลบรูปภาพสถานที่ทำงาน
 */
router.delete("/:id/photos/:photoIndex", auth, async (req, res) => {
  try {
    const userId = getUserId(req);
    const photoIndex = parseInt(req.params.photoIndex);
    
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: "ไม่พบงานนี้" });
    }

    if (job.createdBy.toString() !== String(userId)) {
      return res.status(403).json({ message: "ไม่มีสิทธิ์ลบรูปงานนี้" });
    }

    if (!job.workplacePhotos || photoIndex < 0 || photoIndex >= job.workplacePhotos.length) {
      return res.status(400).json({ message: "ไม่พบรูปที่ต้องการลบ" });
    }

    // ลบรูปออกจาก array
    job.workplacePhotos.splice(photoIndex, 1);
    await job.save();

    return res.json({ 
      message: "ลบรูปสำเร็จ", 
      workplacePhotos: job.workplacePhotos 
    });
  } catch (err) {
    console.error("DELETE /api/jobs/:id/photos/:photoIndex error:", err);
    return res.status(500).json({ message: "ลบรูปไม่สำเร็จ" });
  }
});

export default router;
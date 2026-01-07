// backend/routes/pdpaRoutes.js
import express from "express";
import User from "../models/User.js";
import Job from "../models/Job.js";
import Application from "../models/Application.js";
import Payment from "../models/Payment.js";
import { authMiddleware } from "../middleware/auth.js";
import archiver from "archiver";
import fs from "fs";
import path from "path";

const router = express.Router();

// Helper function to get user ID
function getUserId(req) {
  return req.userId || (req.user && (req.user._id || req.user.id)) || null;
}

/**
 * GET /api/pdpa/my-data
 * ดาวน์โหลดข้อมูลส่วนบุคคลทั้งหมด (Right to Data Portability)
 */
router.get("/my-data", authMiddleware, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "ไม่พบข้อมูลผู้ใช้" });
    }

    // ดึงข้อมูลทั้งหมดของผู้ใช้
    const user = await User.findById(userId).select('-password');
    const jobs = await Job.find({ createdBy: userId });
    const applications = await Application.find({ applicantId: userId }).populate('jobId', 'title company');
    const payments = await Payment.find({ employerId: userId });

    // สร้างข้อมูลสำหรับ export
    const exportData = {
      exportInfo: {
        requestedAt: new Date().toISOString(),
        requestedBy: user.email,
        dataTypes: ['profile', 'jobs', 'applications', 'payments'],
        format: 'JSON',
        version: '1.0'
      },
      personalData: {
        account: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          socialProvider: user.socialProvider,
          emailVerified: user.emailVerified,
          emailVerifiedAt: user.emailVerifiedAt
        },
        profile: user.profile,
        statistics: {
          totalJobs: jobs.length,
          totalApplications: applications.length,
          totalPayments: payments.length,
          accountAge: Math.floor((new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24)) + ' days'
        }
      },
      jobData: jobs.map(job => ({
        id: job._id,
        title: job.title,
        company: job.company,
        description: job.description,
        location: job.location,
        salary: job.salary,
        type: job.type,
        isActive: job.isActive,
        isPaid: job.isPaid,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        applicationsCount: job.applications?.length || 0
      })),
      applicationData: applications.map(app => ({
        id: app._id,
        jobTitle: app.jobId?.title,
        company: app.jobId?.company,
        status: app.status,
        appliedAt: app.createdAt,
        coverLetter: app.coverLetter,
        resumeUrl: app.resumeUrl
      })),
      paymentData: payments.map(payment => ({
        id: payment._id,
        paymentId: payment.paymentId,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        paymentMethod: payment.paymentMethod,
        packageType: payment.packageType,
        createdAt: payment.createdAt,
        paidAt: payment.paidAt
      })),
      dataProcessingInfo: {
        legalBasis: 'Consent and Contract Performance',
        retentionPeriod: 'Active accounts: Indefinite, Inactive accounts: 2 years',
        dataControllers: ['AOW Platform'],
        dataProcessors: ['MongoDB Atlas', 'Render.com', 'Email Service Provider'],
        transferredCountries: ['USA (MongoDB Atlas)', 'USA (Render.com)'],
        userRights: [
          'Right to Access',
          'Right to Rectification', 
          'Right to Erasure',
          'Right to Data Portability',
          'Right to Object',
          'Right to Restrict Processing'
        ]
      }
    };

    // Log การ export
    console.log(`📊 Data export requested by user: ${user.email} (${userId})`);

    res.json({
      message: "ข้อมูลส่วนบุคคลของคุณ",
      data: exportData,
      downloadInfo: {
        filename: `aow-personal-data-${user.email}-${new Date().toISOString().split('T')[0]}.json`,
        size: JSON.stringify(exportData).length + ' bytes',
        generatedAt: new Date().toISOString()
      }
    });

  } catch (err) {
    console.error("Data export error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการส่งออกข้อมูล" });
  }
});

/**
 * DELETE /api/pdpa/delete-account
 * ลบบัญชีและข้อมูลทั้งหมด (Right to be Forgotten)
 */
router.delete("/delete-account", authMiddleware, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "ไม่พบข้อมูลผู้ใช้" });
    }

    const { confirmPassword, reason } = req.body;

    // ตรวจสอบรหัสผ่านเพื่อยืนยัน
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "ไม่พบบัญชีผู้ใช้" });
    }

    // ตรวจสอบรหัสผ่าน (ถ้าไม่ใช่ social login)
    if (!user.socialProvider && confirmPassword) {
      const bcrypt = await import('bcryptjs');
      const isValidPassword = await bcrypt.compare(confirmPassword, user.password);
      if (!isValidPassword) {
        return res.status(400).json({ message: "รหัสผ่านไม่ถูกต้อง" });
      }
    }

    // ตรวจสอบ pending payments
    const pendingPayments = await Payment.find({ 
      employerId: userId, 
      status: { $in: ['pending', 'paid'] } 
    });

    if (pendingPayments.length > 0) {
      return res.status(400).json({ 
        message: "ไม่สามารถลบบัญชีได้ เนื่องจากมีการชำระเงินที่ยังไม่เสร็จสิ้น",
        pendingPayments: pendingPayments.length
      });
    }

    // เริ่มกระบวนการลบข้อมูล
    const deletionLog = {
      userId: userId,
      userEmail: user.email,
      deletedAt: new Date(),
      reason: reason || 'User requested account deletion',
      dataDeleted: []
    };

    // 1. ลบ Applications
    const deletedApplications = await Application.deleteMany({ applicantId: userId });
    deletionLog.dataDeleted.push(`Applications: ${deletedApplications.deletedCount}`);

    // 2. ลบ Jobs (เฉพาะที่ไม่มี applications จากคนอื่น)
    const userJobs = await Job.find({ createdBy: userId });
    let deletedJobsCount = 0;
    
    for (const job of userJobs) {
      const otherApplications = await Application.find({ 
        jobId: job._id, 
        applicantId: { $ne: userId } 
      });
      
      if (otherApplications.length === 0) {
        await Job.findByIdAndDelete(job._id);
        deletedJobsCount++;
      } else {
        // ถ้ามี applications จากคนอื่น ให้ anonymize แทน
        await Job.findByIdAndUpdate(job._id, {
          createdBy: null,
          company: '[Deleted Company]',
          contactEmail: '[deleted]',
          contactPhone: '[deleted]'
        });
      }
    }
    deletionLog.dataDeleted.push(`Jobs: ${deletedJobsCount} deleted, ${userJobs.length - deletedJobsCount} anonymized`);

    // 3. ลบ Payments (เฉพาะที่ cancelled หรือ failed)
    const deletedPayments = await Payment.deleteMany({ 
      employerId: userId,
      status: { $in: ['cancelled', 'failed', 'expired'] }
    });
    deletionLog.dataDeleted.push(`Payments: ${deletedPayments.deletedCount}`);

    // 4. Anonymize successful payments (เก็บไว้เพื่อ audit)
    const anonymizedPayments = await Payment.updateMany(
      { employerId: userId, status: 'paid' },
      { 
        employerId: null,
        metadata: { 
          ...Payment.metadata,
          anonymized: true,
          anonymizedAt: new Date()
        }
      }
    );
    deletionLog.dataDeleted.push(`Payments anonymized: ${anonymizedPayments.modifiedCount}`);

    // 5. ลบไฟล์ที่อัปโหลด
    if (user.profile?.photoUrl) {
      try {
        const photoPath = path.join(process.cwd(), 'uploads', path.basename(user.profile.photoUrl));
        if (fs.existsSync(photoPath)) {
          fs.unlinkSync(photoPath);
          deletionLog.dataDeleted.push('Profile photo deleted');
        }
      } catch (fileErr) {
        console.error('Error deleting profile photo:', fileErr);
      }
    }

    // 6. ลบ User account
    await User.findByIdAndDelete(userId);
    deletionLog.dataDeleted.push('User account deleted');

    // Log การลบ
    console.log('🗑️ Account deletion completed:', deletionLog);

    // ส่ง response (ไม่ต้องส่ง sensitive data)
    res.json({
      message: "ลบบัญชีเรียบร้อยแล้ว",
      deletedAt: deletionLog.deletedAt,
      summary: {
        applicationsDeleted: deletedApplications.deletedCount,
        jobsDeleted: deletedJobsCount,
        paymentsDeleted: deletedPayments.deletedCount,
        paymentsAnonymized: anonymizedPayments.modifiedCount
      }
    });

  } catch (err) {
    console.error("Account deletion error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการลบบัญชี" });
  }
});

/**
 * PUT /api/pdpa/correct-data
 * แก้ไขข้อมูลส่วนบุคคล (Right to Rectification)
 */
router.put("/correct-data", authMiddleware, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "ไม่พบข้อมูลผู้ใช้" });
    }

    const { field, oldValue, newValue, reason } = req.body;

    if (!field || !newValue) {
      return res.status(400).json({ message: "กรุณาระบุฟิลด์และค่าใหม่" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "ไม่พบบัญชีผู้ใช้" });
    }

    // กำหนดฟิลด์ที่อนุญาตให้แก้ไข
    const allowedFields = [
      'name', 'profile.fullName', 'profile.headline', 'profile.location',
      'profile.phone', 'profile.skillsText', 'profile.experience',
      'profile.companyName', 'profile.businessType', 'profile.description',
      'profile.address', 'profile.website', 'profile.employeeCount'
    ];

    if (!allowedFields.includes(field)) {
      return res.status(400).json({ 
        message: "ไม่สามารถแก้ไขฟิลด์นี้ได้",
        allowedFields: allowedFields
      });
    }

    // บันทึกการเปลี่ยนแปลง
    const correctionLog = {
      userId: userId,
      userEmail: user.email,
      field: field,
      oldValue: oldValue,
      newValue: newValue,
      reason: reason || 'Data correction requested by user',
      correctedAt: new Date()
    };

    // อัปเดตข้อมูล
    if (field.startsWith('profile.')) {
      const profileField = field.replace('profile.', '');
      await User.findByIdAndUpdate(userId, {
        [`profile.${profileField}`]: newValue,
        updatedAt: new Date()
      });
    } else {
      await User.findByIdAndUpdate(userId, {
        [field]: newValue,
        updatedAt: new Date()
      });
    }

    console.log('✏️ Data correction completed:', correctionLog);

    res.json({
      message: "แก้ไขข้อมูลเรียบร้อยแล้ว",
      field: field,
      newValue: newValue,
      correctedAt: correctionLog.correctedAt
    });

  } catch (err) {
    console.error("Data correction error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการแก้ไขข้อมูล" });
  }
});

/**
 * POST /api/pdpa/object-processing
 * คัดค้านการประมวลผลข้อมูล (Right to Object)
 */
router.post("/object-processing", authMiddleware, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "ไม่พบข้อมูลผู้ใช้" });
    }

    const { processingType, reason } = req.body;

    const allowedTypes = ['marketing', 'analytics', 'profiling', 'automated_decision'];
    
    if (!processingType || !allowedTypes.includes(processingType)) {
      return res.status(400).json({ 
        message: "ประเภทการประมวลผลไม่ถูกต้อง",
        allowedTypes: allowedTypes
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "ไม่พบบัญชีผู้ใช้" });
    }

    // อัปเดตการตั้งค่าความเป็นส่วนตัว
    const privacySettings = user.privacySettings || {};
    privacySettings[processingType] = false;
    privacySettings.lastUpdated = new Date();

    await User.findByIdAndUpdate(userId, {
      privacySettings: privacySettings,
      updatedAt: new Date()
    });

    // บันทึก objection
    const objectionLog = {
      userId: userId,
      userEmail: user.email,
      processingType: processingType,
      reason: reason || 'User objected to processing',
      objectedAt: new Date()
    };

    console.log('🚫 Processing objection recorded:', objectionLog);

    res.json({
      message: "บันทึกการคัดค้านเรียบร้อยแล้ว",
      processingType: processingType,
      status: "objected",
      objectedAt: objectionLog.objectedAt
    });

  } catch (err) {
    console.error("Processing objection error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการบันทึกการคัดค้าน" });
  }
});

/**
 * GET /api/pdpa/privacy-settings
 * ดูการตั้งค่าความเป็นส่วนตัว
 */
router.get("/privacy-settings", authMiddleware, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "ไม่พบข้อมูลผู้ใช้" });
    }

    const user = await User.findById(userId).select('privacySettings emailVerified createdAt');
    if (!user) {
      return res.status(404).json({ message: "ไม่พบบัญชีผู้ใช้" });
    }

    const defaultSettings = {
      marketing: true,
      analytics: true,
      profiling: false,
      automated_decision: false,
      data_sharing: false,
      lastUpdated: user.createdAt
    };

    const currentSettings = { ...defaultSettings, ...user.privacySettings };

    res.json({
      privacySettings: currentSettings,
      dataRights: {
        access: "ดาวน์โหลดข้อมูลส่วนบุคคล",
        rectification: "แก้ไขข้อมูลที่ไม่ถูกต้อง",
        erasure: "ลบบัญชีและข้อมูลทั้งหมด",
        portability: "ส่งออกข้อมูลในรูปแบบ JSON",
        object: "คัดค้านการประมวลผลข้อมูล",
        restrict: "จำกัดการประมวลผลข้อมูล"
      },
      contactInfo: {
        dpo: "dpo@aow-platform.com",
        legal: "legal@aow-platform.com",
        support: "support@aow-platform.com"
      }
    });

  } catch (err) {
    console.error("Privacy settings error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงการตั้งค่า" });
  }
});

export default router;
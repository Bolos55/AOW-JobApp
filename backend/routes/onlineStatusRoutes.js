// backend/routes/onlineStatusRoutes.js
import express from "express";
import OnlineStatus from "../models/OnlineStatus.js";
import User from "../models/User.js";
import { authMiddleware } from "../middleware/auth.js";
import { auditLogMiddleware } from "../middleware/auditLog.js";
import crypto from "crypto";

const router = express.Router();

// Helper function to get user ID
function getUserId(req) {
  return req.userId || (req.user && (req.user._id || req.user.id)) || null;
}

// Generate session ID
function generateSessionId() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * POST /api/online/heartbeat
 * อัปเดตสถานะออนไลน์ (เรียกทุก 30 วินาที)
 */
router.post("/heartbeat", authMiddleware, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "ไม่พบข้อมูลผู้ใช้" });
    }

    const { currentPage, sessionId } = req.body;
    
    // ดึงข้อมูลผู้ใช้
    const user = await User.findById(userId).select('name email role');
    if (!user) {
      return res.status(404).json({ message: "ไม่พบผู้ใช้" });
    }

    // หา session ปัจจุบันหรือสร้างใหม่
    let onlineStatus = await OnlineStatus.findOne({ userId });
    
    if (!onlineStatus) {
      // สร้าง session ใหม่
      onlineStatus = new OnlineStatus({
        userId: userId,
        userEmail: user.email,
        userName: user.name,
        userRole: user.role,
        sessionId: sessionId || generateSessionId(),
        ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        currentPage: currentPage || '/',
        isOnline: true
      });
      
      // Parse user agent
      onlineStatus.parseUserAgent(req.headers['user-agent']);
      
    } else {
      // อัปเดต session ที่มีอยู่
      onlineStatus.isOnline = true;
      onlineStatus.lastActivity = new Date();
      onlineStatus.lastSeen = new Date();
      onlineStatus.activityCount += 1;
      
      if (currentPage) {
        onlineStatus.currentPage = currentPage;
      }
      
      // อัปเดต session ID ถ้ามีการส่งมา
      if (sessionId && sessionId !== onlineStatus.sessionId) {
        onlineStatus.sessionId = sessionId;
        onlineStatus.sessionStart = new Date();
      }
    }

    await onlineStatus.save();

    res.json({
      message: "อัปเดตสถานะออนไลน์เรียบร้อย",
      sessionId: onlineStatus.sessionId,
      isOnline: true,
      lastActivity: onlineStatus.lastActivity
    });

  } catch (err) {
    console.error("Heartbeat error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการอัปเดตสถานะ" });
  }
});

/**
 * POST /api/online/offline
 * ตั้งสถานะออฟไลน์ (เรียกเมื่อ logout หรือปิดหน้าต่าง)
 */
router.post("/offline", authMiddleware, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "ไม่พบข้อมูลผู้ใช้" });
    }

    const onlineStatus = await OnlineStatus.findOne({ userId });
    if (onlineStatus) {
      await onlineStatus.setOffline();
    }

    res.json({
      message: "ตั้งสถานะออฟไลน์เรียบร้อย",
      isOnline: false
    });

  } catch (err) {
    console.error("Set offline error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการตั้งสถานะออฟไลน์" });
  }
});

/**
 * GET /api/online/status
 * ดูสถานะออนไลน์ของตัวเอง
 */
router.get("/status", authMiddleware, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "ไม่พบข้อมูลผู้ใช้" });
    }

    const onlineStatus = await OnlineStatus.findOne({ userId });
    
    if (!onlineStatus) {
      return res.json({
        isOnline: false,
        message: "ไม่พบสถานะออนไลน์"
      });
    }

    res.json({
      isOnline: onlineStatus.isOnline,
      lastActivity: onlineStatus.lastActivity,
      sessionDuration: onlineStatus.sessionDuration,
      currentPage: onlineStatus.currentPage,
      deviceInfo: onlineStatus.deviceInfo,
      activityCount: onlineStatus.activityCount
    });

  } catch (err) {
    console.error("Get status error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงสถานะ" });
  }
});

/**
 * GET /api/online/admin/dashboard
 * ดูสถิติออนไลน์สำหรับแอดมิน
 */
router.get("/admin/dashboard", 
  authMiddleware, 
  auditLogMiddleware("ONLINE_STATUS_VIEW", "ADMIN"),
  async (req, res) => {
    try {
      const userId = getUserId(req);
      const user = await User.findById(userId);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "ไม่มีสิทธิ์เข้าถึง" });
      }

      // ทำความสะอาด offline users ก่อน
      await OnlineStatus.cleanupOfflineUsers();

      // ดึงสถิติ
      const [totalOnline, onlineByRole, recentUsers] = await Promise.all([
        OnlineStatus.getOnlineCount(),
        OnlineStatus.getOnlineByRole(),
        OnlineStatus.find({ 
          isOnline: true,
          lastActivity: { $gte: new Date(Date.now() - 5 * 60 * 1000) }
        })
        .populate('userId', 'name email role profile.photoUrl')
        .sort({ lastActivity: -1 })
        .limit(50)
      ]);

      // จัดรูปแบบข้อมูล
      const roleStats = {
        jobseeker: 0,
        employer: 0,
        admin: 0
      };

      onlineByRole.forEach(role => {
        roleStats[role._id] = role.count;
      });

      const onlineUsers = recentUsers.map(status => ({
        userId: status.userId._id,
        name: status.userName,
        email: status.userEmail,
        role: status.userRole,
        photoUrl: status.userId.profile?.photoUrl,
        lastActivity: status.lastActivity,
        currentPage: status.currentPage,
        sessionDuration: status.sessionDuration,
        deviceInfo: status.deviceInfo,
        activityCount: status.activityCount,
        ipAddress: status.ipAddress.substring(0, 10) + '...' // ซ่อน IP บางส่วน
      }));

      res.json({
        summary: {
          totalOnline: totalOnline,
          byRole: roleStats,
          lastUpdated: new Date()
        },
        onlineUsers: onlineUsers,
        statistics: {
          totalSessions: recentUsers.length,
          averageSessionTime: recentUsers.reduce((acc, user) => acc + user.sessionDuration, 0) / recentUsers.length || 0,
          mostActiveUsers: recentUsers
            .sort((a, b) => b.activityCount - a.activityCount)
            .slice(0, 5)
            .map(user => ({
              name: user.userName,
              email: user.userEmail,
              activityCount: user.activityCount
            }))
        }
      });

    } catch (err) {
      console.error("Admin dashboard error:", err);
      res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงข้อมูล" });
    }
  }
);

/**
 * GET /api/online/admin/users
 * ดูรายชื่อผู้ใช้ออนไลน์สำหรับแอดมิน (แบบละเอียด)
 */
router.get("/admin/users", 
  authMiddleware, 
  auditLogMiddleware("ONLINE_USERS_VIEW", "ADMIN"),
  async (req, res) => {
    try {
      const userId = getUserId(req);
      const user = await User.findById(userId);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "ไม่มีสิทธิ์เข้าถึง" });
      }

      const { role, page = 1, limit = 20 } = req.query;

      // สร้าง query
      const query = { 
        isOnline: true,
        lastActivity: { $gte: new Date(Date.now() - 5 * 60 * 1000) }
      };

      if (role && ['jobseeker', 'employer', 'admin'].includes(role)) {
        query.userRole = role;
      }

      // ดึงข้อมูล
      const [users, total] = await Promise.all([
        OnlineStatus.find(query)
          .populate('userId', 'name email role profile.photoUrl profile.fullName profile.companyName')
          .sort({ lastActivity: -1 })
          .limit(limit * 1)
          .skip((page - 1) * limit),
        OnlineStatus.countDocuments(query)
      ]);

      const detailedUsers = users.map(status => ({
        userId: status.userId._id,
        name: status.userName,
        email: status.userEmail,
        role: status.userRole,
        photoUrl: status.userId.profile?.photoUrl,
        fullName: status.userId.profile?.fullName,
        companyName: status.userId.profile?.companyName,
        isOnline: status.isOnline,
        lastActivity: status.lastActivity,
        lastSeen: status.lastSeen,
        currentPage: status.currentPage,
        sessionStart: status.sessionStart,
        sessionDuration: status.sessionDuration,
        activityCount: status.activityCount,
        deviceInfo: status.deviceInfo,
        location: status.location,
        ipAddress: status.ipAddress,
        totalOnlineTime: status.totalOnlineTime
      }));

      res.json({
        users: detailedUsers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total,
          pages: Math.ceil(total / limit)
        },
        filters: {
          role: role || 'all'
        }
      });

    } catch (err) {
      console.error("Admin users error:", err);
      res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้" });
    }
  }
);

/**
 * POST /api/online/admin/cleanup
 * ทำความสะอาดสถานะออนไลน์ (สำหรับแอดมิน)
 */
router.post("/admin/cleanup", 
  authMiddleware, 
  auditLogMiddleware("ONLINE_STATUS_CLEANUP", "ADMIN"),
  async (req, res) => {
    try {
      const userId = getUserId(req);
      const user = await User.findById(userId);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "ไม่มีสิทธิ์เข้าถึง" });
      }

      const result = await OnlineStatus.cleanupOfflineUsers();

      res.json({
        message: "ทำความสะอาดเรียบร้อย",
        modifiedCount: result.modifiedCount,
        cleanedAt: new Date()
      });

    } catch (err) {
      console.error("Cleanup error:", err);
      res.status(500).json({ message: "เกิดข้อผิดพลาดในการทำความสะอาด" });
    }
  }
);

export default router;
// backend/middleware/auditLog.js
import mongoose from "mongoose";

// Audit Log Schema
const auditLogSchema = new mongoose.Schema({
  // User Information
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  userEmail: {
    type: String,
    required: true
  },
  userRole: {
    type: String,
    enum: ["jobseeker", "employer", "admin"],
    required: true
  },
  
  // Action Information
  action: {
    type: String,
    required: true // e.g., "LOGIN", "CREATE_JOB", "PAYMENT_CREATE", "DATA_EXPORT"
  },
  resource: {
    type: String,
    required: true // e.g., "USER", "JOB", "PAYMENT", "APPLICATION"
  },
  resourceId: {
    type: String // ID ของ resource ที่ถูก action
  },
  
  // Request Information
  method: {
    type: String,
    required: true // GET, POST, PUT, DELETE
  },
  endpoint: {
    type: String,
    required: true // /api/jobs/create
  },
  
  // Result Information
  status: {
    type: String,
    enum: ["SUCCESS", "FAILED", "UNAUTHORIZED", "FORBIDDEN"],
    required: true
  },
  statusCode: {
    type: Number,
    required: true // HTTP status code
  },
  
  // Additional Data
  details: {
    type: mongoose.Schema.Types.Mixed // เก็บข้อมูลเพิ่มเติม
  },
  
  // Security Information
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    required: true
  },
  
  // Timing
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  processingTime: {
    type: Number // milliseconds
  }
}, {
  timestamps: false // ใช้ timestamp field แทน
});

// Indexes for performance
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ resource: 1, timestamp: -1 });
auditLogSchema.index({ status: 1, timestamp: -1 });
auditLogSchema.index({ ipAddress: 1, timestamp: -1 });

// TTL index - ลบ log เก่าหลัง 2 ปี
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 2 * 365 * 24 * 60 * 60 });

const AuditLog = mongoose.model("AuditLog", auditLogSchema);

// Helper function to get user ID from request
function getUserId(req) {
  return req.userId || (req.user && (req.user._id || req.user.id)) || null;
}

// Helper function to get user info from request
function getUserInfo(req) {
  const user = req.user || {};
  return {
    userId: getUserId(req),
    userEmail: user.email || 'unknown',
    userRole: user.role || 'unknown'
  };
}

/**
 * Audit Log Middleware
 * บันทึกการกระทำสำคัญทั้งหมด
 */
export const auditLogMiddleware = (action, resource) => {
  return async (req, res, next) => {
    const startTime = Date.now();
    
    // เก็บ original res.json เพื่อ intercept response
    const originalJson = res.json;
    let responseData = null;
    let statusCode = 200;
    
    res.json = function(data) {
      responseData = data;
      statusCode = res.statusCode;
      return originalJson.call(this, data);
    };
    
    // เก็บ original res.status เพื่อ track status code
    const originalStatus = res.status;
    res.status = function(code) {
      statusCode = code;
      return originalStatus.call(this, code);
    };
    
    // รอให้ request เสร็จสิ้น
    res.on('finish', async () => {
      try {
        const processingTime = Date.now() - startTime;
        const userInfo = getUserInfo(req);
        
        // กำหนดสถานะตาม status code
        let status = "SUCCESS";
        if (statusCode >= 400 && statusCode < 500) {
          status = statusCode === 401 ? "UNAUTHORIZED" : statusCode === 403 ? "FORBIDDEN" : "FAILED";
        } else if (statusCode >= 500) {
          status = "FAILED";
        }
        
        // สร้าง audit log
        const auditData = {
          ...userInfo,
          action: action,
          resource: resource,
          resourceId: req.params.id || req.params.jobId || req.params.paymentId || null,
          method: req.method,
          endpoint: req.originalUrl,
          status: status,
          statusCode: statusCode,
          details: {
            requestBody: sanitizeRequestBody(req.body),
            responseMessage: responseData?.message || null,
            queryParams: req.query,
            params: req.params
          },
          ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown',
          timestamp: new Date(),
          processingTime: processingTime
        };
        
        // บันทึกลง database (async, ไม่รอ)
        AuditLog.create(auditData).catch(err => {
          console.error('❌ Audit log creation failed:', err);
        });
        
        // Log สำคัญไปยัง console
        if (status !== "SUCCESS" || action.includes("PAYMENT") || action.includes("ADMIN")) {
          console.log(`📋 AUDIT: ${action} ${resource} by ${userInfo.userEmail} - ${status} (${statusCode}) - ${processingTime}ms`);
        }
        
      } catch (err) {
        console.error('❌ Audit logging error:', err);
      }
    });
    
    next();
  };
};

/**
 * ทำความสะอาด request body เพื่อไม่ให้เก็บข้อมูลลับ
 */
function sanitizeRequestBody(body) {
  if (!body || typeof body !== 'object') return body;
  
  const sanitized = { ...body };
  
  // ลบข้อมูลลับ
  const sensitiveFields = [
    'password', 'confirmPassword', 'currentPassword', 'newPassword',
    'token', 'refreshToken', 'apiKey', 'secret', 'privateKey',
    'creditCard', 'cardNumber', 'cvv', 'pin'
  ];
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });
  
  return sanitized;
}

/**
 * Log specific actions
 */
export const logAction = async (userId, userEmail, userRole, action, resource, details = {}) => {
  try {
    await AuditLog.create({
      userId,
      userEmail,
      userRole,
      action,
      resource,
      method: 'SYSTEM',
      endpoint: 'SYSTEM_ACTION',
      status: 'SUCCESS',
      statusCode: 200,
      details,
      ipAddress: 'system',
      userAgent: 'system',
      timestamp: new Date(),
      processingTime: 0
    });
  } catch (err) {
    console.error('❌ Manual audit log failed:', err);
  }
};

/**
 * Get audit logs for admin
 */
export const getAuditLogs = async (filters = {}, limit = 100, skip = 0) => {
  try {
    const query = {};
    
    if (filters.userId) query.userId = filters.userId;
    if (filters.action) query.action = new RegExp(filters.action, 'i');
    if (filters.resource) query.resource = filters.resource;
    if (filters.status) query.status = filters.status;
    if (filters.startDate || filters.endDate) {
      query.timestamp = {};
      if (filters.startDate) query.timestamp.$gte = new Date(filters.startDate);
      if (filters.endDate) query.timestamp.$lte = new Date(filters.endDate);
    }
    
    const logs = await AuditLog.find(query)
      .populate('userId', 'name email role')
      .sort({ timestamp: -1 })
      .limit(limit)
      .skip(skip);
    
    const total = await AuditLog.countDocuments(query);
    
    return { logs, total };
  } catch (err) {
    console.error('❌ Get audit logs error:', err);
    throw err;
  }
};

/**
 * Get user activity summary
 */
export const getUserActivitySummary = async (userId, days = 30) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const summary = await AuditLog.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            action: '$action',
            status: '$status'
          },
          count: { $sum: 1 },
          lastActivity: { $max: '$timestamp' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
    
    return summary;
  } catch (err) {
    console.error('❌ Get user activity summary error:', err);
    throw err;
  }
};

export default AuditLog;
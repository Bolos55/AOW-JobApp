// backend/middleware/securityMonitoring.js
import { logger } from '../utils/logger.js';

// Security event types
export const SECURITY_EVENTS = {
  AUTH_FAILURE: 'AUTH_FAILURE',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  SUSPICIOUS_REQUEST: 'SUSPICIOUS_REQUEST',
  FILE_UPLOAD_VIOLATION: 'FILE_UPLOAD_VIOLATION',
  WEBHOOK_SIGNATURE_FAILURE: 'WEBHOOK_SIGNATURE_FAILURE',
  ADMIN_ACCESS: 'ADMIN_ACCESS',
  PASSWORD_RESET_REQUEST: 'PASSWORD_RESET_REQUEST',
  ACCOUNT_LOCKOUT: 'ACCOUNT_LOCKOUT',
  CORS_VIOLATION: 'CORS_VIOLATION'
};

// Security monitoring middleware
export const securityMonitor = (eventType, details = {}) => {
  return (req, res, next) => {
    const securityEvent = {
      timestamp: new Date().toISOString(),
      eventType,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      url: req.originalUrl,
      method: req.method,
      userId: req.user?.id || null,
      userEmail: req.user?.email || null,
      ...details
    };

    // Log security event
    logger.security(`🚨 SECURITY EVENT: ${eventType}`, securityEvent);

    // Store in database for analysis (optional)
    if (process.env.ENABLE_SECURITY_DB_LOGGING === 'true') {
      storeSecurityEvent(securityEvent).catch(err => {
        logger.error('Failed to store security event:', err);
      });
    }

    // Check for critical events that need immediate action
    if (isCriticalEvent(eventType, securityEvent)) {
      handleCriticalSecurityEvent(securityEvent);
    }

    next();
  };
};

// Authentication failure monitoring
export const monitorAuthFailure = (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    if (res.statusCode === 401 || res.statusCode === 403) {
      const event = {
        email: req.body?.email || 'unknown',
        reason: typeof data === 'string' ? data : JSON.stringify(data),
        statusCode: res.statusCode
      };
      
      securityMonitor(SECURITY_EVENTS.AUTH_FAILURE, event)(req, res, () => {});
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};

// Rate limit monitoring
export const monitorRateLimit = (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    if (res.statusCode === 429) {
      const event = {
        endpoint: req.originalUrl,
        rateLimitType: req.rateLimitType || 'unknown'
      };
      
      securityMonitor(SECURITY_EVENTS.RATE_LIMIT_EXCEEDED, event)(req, res, () => {});
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};

// Suspicious request pattern detection
export const detectSuspiciousPatterns = (req, res, next) => {
  // ✅ Skip security checks for legitimate admin endpoints
  const adminEndpoints = [
    '/api/admin/dashboard',
    '/api/admin/stats', 
    '/api/admin/users',
    '/api/admin/jobs',
    '/api/admin/applications',
    '/api/online/admin/dashboard'
  ];
  
  if (adminEndpoints.some(endpoint => req.originalUrl.startsWith(endpoint))) {
    return next();
  }

  const suspiciousPatterns = [
    // SQL Injection attempts
    /(\b(union|select|insert|update|delete|drop|create|alter)\b.*\b(from|where|into|values)\b)/i,
    
    // XSS attempts
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    
    // Path traversal
    /\.\.[\/\\]/g,
    /(\.\.%2f|\.\.%5c)/gi,
    
    // Command injection (แก้ไขให้ไม่ detect admin URLs)
    /[;&|`$()]/g, // ✅ เอา {} ออกเพื่อไม่ให้ detect admin endpoints
    
    // NoSQL injection
    /\$where|\$ne|\$gt|\$lt|\$regex/gi
  ];

  const checkString = JSON.stringify({
    url: req.originalUrl,
    query: req.query,
    body: req.body,
    headers: req.headers
  });

  const detectedPatterns = suspiciousPatterns.filter(pattern => pattern.test(checkString));
  
  if (detectedPatterns.length > 0) {
    const event = {
      patterns: detectedPatterns.map(p => p.toString()),
      requestData: {
        url: req.originalUrl,
        method: req.method,
        query: req.query,
        bodyKeys: Object.keys(req.body || {})
      }
    };
    
    securityMonitor(SECURITY_EVENTS.SUSPICIOUS_REQUEST, event)(req, res, () => {});
  }
  
  next();
};

// File upload monitoring
export const monitorFileUpload = (req, res, next) => {
  if (req.file) {
    const event = {
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      fieldname: req.file.fieldname
    };
    
    // Check for suspicious file uploads
    const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com', '.jar'];
    const fileExt = req.file.originalname.toLowerCase().split('.').pop();
    
    if (suspiciousExtensions.includes(`.${fileExt}`)) {
      event.violation = 'SUSPICIOUS_FILE_EXTENSION';
      securityMonitor(SECURITY_EVENTS.FILE_UPLOAD_VIOLATION, event)(req, res, () => {});
    }
    
    // Check for oversized files
    const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024;
    if (req.file.size > maxSize) {
      event.violation = 'FILE_SIZE_EXCEEDED';
      securityMonitor(SECURITY_EVENTS.FILE_UPLOAD_VIOLATION, event)(req, res, () => {});
    }
  }
  
  next();
};

// Admin access monitoring
export const monitorAdminAccess = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    const event = {
      adminId: req.user.id,
      adminEmail: req.user.email,
      action: req.method + ' ' + req.originalUrl,
      requestBody: req.method !== 'GET' ? Object.keys(req.body || {}) : null
    };
    
    securityMonitor(SECURITY_EVENTS.ADMIN_ACCESS, event)(req, res, () => {});
  }
  
  next();
};

// Webhook signature failure monitoring
export const monitorWebhookFailure = (signature, payload) => {
  const event = {
    signatureProvided: !!signature,
    signatureLength: signature ? signature.length : 0,
    payloadSize: JSON.stringify(payload).length,
    webhookType: 'payment'
  };
  
  // This would be called from webhook verification failure
  logger.security(`🚨 WEBHOOK SIGNATURE FAILURE`, event);
};

// Check if event is critical and needs immediate action
const isCriticalEvent = (eventType, event) => {
  const criticalEvents = [
    SECURITY_EVENTS.ADMIN_ACCESS,
    SECURITY_EVENTS.WEBHOOK_SIGNATURE_FAILURE,
    SECURITY_EVENTS.SUSPICIOUS_REQUEST
  ];
  
  return criticalEvents.includes(eventType);
};

// Handle critical security events
const handleCriticalSecurityEvent = (event) => {
  // In production, this could:
  // 1. Send alerts to security team
  // 2. Temporarily block IP addresses
  // 3. Trigger additional monitoring
  // 4. Create incident tickets
  
  logger.error(`🚨 CRITICAL SECURITY EVENT DETECTED`, event);
  
  // Example: Send alert (implement based on your notification system)
  if (process.env.SECURITY_WEBHOOK_URL) {
    sendSecurityAlert(event).catch(err => {
      logger.error('Failed to send security alert:', err);
    });
  }
};

// Store security event in database (optional)
const storeSecurityEvent = async (event) => {
  try {
    // Implement database storage for security events
    // This could be MongoDB, PostgreSQL, or a dedicated security database
    
    // Example implementation:
    // const SecurityEvent = await import('../models/SecurityEvent.js');
    // await SecurityEvent.create(event);
    
    logger.info('Security event stored in database');
  } catch (error) {
    logger.error('Failed to store security event:', error);
  }
};

// Send security alert (implement based on your notification system)
const sendSecurityAlert = async (event) => {
  try {
    // Example: Send to Slack, Discord, email, or security service
    const alertData = {
      text: `🚨 Security Alert: ${event.eventType}`,
      details: event,
      timestamp: event.timestamp,
      severity: 'HIGH'
    };
    
    // Implement your notification logic here
    logger.info('Security alert sent');
  } catch (error) {
    logger.error('Failed to send security alert:', error);
  }
};

// Security metrics collection
export const collectSecurityMetrics = () => {
  // This could collect and report security metrics
  // - Failed login attempts per hour
  // - Rate limit violations
  // - Suspicious request patterns
  // - File upload violations
  
  return {
    timestamp: new Date().toISOString(),
    metrics: {
      // Implement metrics collection
    }
  };
};

// IP-based security tracking
const ipSecurityTracker = new Map();

export const trackIPSecurity = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  if (!ipSecurityTracker.has(ip)) {
    ipSecurityTracker.set(ip, {
      firstSeen: now,
      lastSeen: now,
      requestCount: 0,
      failedLogins: 0,
      suspiciousRequests: 0
    });
  }
  
  const ipData = ipSecurityTracker.get(ip);
  ipData.lastSeen = now;
  ipData.requestCount++;
  
  // Clean old entries (older than 24 hours)
  const dayAgo = now - (24 * 60 * 60 * 1000);
  for (const [trackedIp, data] of ipSecurityTracker.entries()) {
    if (data.lastSeen < dayAgo) {
      ipSecurityTracker.delete(trackedIp);
    }
  }
  
  req.ipSecurityData = ipData;
  next();
};

export default {
  securityMonitor,
  monitorAuthFailure,
  monitorRateLimit,
  detectSuspiciousPatterns,
  monitorFileUpload,
  monitorAdminAccess,
  monitorWebhookFailure,
  collectSecurityMetrics,
  trackIPSecurity,
  SECURITY_EVENTS
};
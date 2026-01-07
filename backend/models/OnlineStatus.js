// backend/models/OnlineStatus.js
import mongoose from "mongoose";

const onlineStatusSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
    index: true
  },
  
  // User Information (cached for performance)
  userEmail: {
    type: String,
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  userRole: {
    type: String,
    enum: ["jobseeker", "employer", "admin"],
    required: true
  },
  
  // Online Status
  isOnline: {
    type: Boolean,
    default: true,
    index: true
  },
  
  // Session Information
  sessionId: {
    type: String,
    required: true
  },
  
  // Activity Tracking
  lastActivity: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  lastSeen: {
    type: Date,
    default: Date.now
  },
  
  // Connection Details
  ipAddress: {
    type: String,
    required: true
  },
  
  userAgent: {
    type: String,
    required: true
  },
  
  // Device Information
  deviceInfo: {
    browser: String,
    os: String,
    device: String,
    isMobile: Boolean
  },
  
  // Location (if available)
  location: {
    country: String,
    city: String,
    timezone: String
  },
  
  // Activity Details
  currentPage: {
    type: String,
    default: '/'
  },
  
  activityCount: {
    type: Number,
    default: 1
  },
  
  // Session Duration
  sessionStart: {
    type: Date,
    default: Date.now
  },
  
  totalOnlineTime: {
    type: Number, // milliseconds
    default: 0
  }
  
}, {
  timestamps: true
});

// Indexes for performance
onlineStatusSchema.index({ isOnline: 1, lastActivity: -1 });
onlineStatusSchema.index({ userRole: 1, isOnline: 1 });
onlineStatusSchema.index({ sessionId: 1 });

// TTL index - ลบ record เก่าหลัง 7 วัน
onlineStatusSchema.index({ lastActivity: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

// Virtual for session duration
onlineStatusSchema.virtual('sessionDuration').get(function() {
  return Date.now() - this.sessionStart.getTime();
});

// Methods
onlineStatusSchema.methods.updateActivity = function(page = null) {
  this.lastActivity = new Date();
  this.lastSeen = new Date();
  this.activityCount += 1;
  if (page) this.currentPage = page;
  return this.save();
};

onlineStatusSchema.methods.setOffline = function() {
  this.isOnline = false;
  this.lastSeen = new Date();
  this.totalOnlineTime += Date.now() - this.sessionStart.getTime();
  return this.save();
};

// Static methods
onlineStatusSchema.statics.getOnlineUsers = function() {
  return this.find({ 
    isOnline: true,
    lastActivity: { $gte: new Date(Date.now() - 5 * 60 * 1000) } // 5 minutes
  }).populate('userId', 'name email role profile.photoUrl');
};

onlineStatusSchema.statics.getOnlineCount = function() {
  return this.countDocuments({ 
    isOnline: true,
    lastActivity: { $gte: new Date(Date.now() - 5 * 60 * 1000) }
  });
};

onlineStatusSchema.statics.getOnlineByRole = function() {
  return this.aggregate([
    {
      $match: {
        isOnline: true,
        lastActivity: { $gte: new Date(Date.now() - 5 * 60 * 1000) }
      }
    },
    {
      $group: {
        _id: '$userRole',
        count: { $sum: 1 },
        users: { $push: {
          userId: '$userId',
          userName: '$userName',
          userEmail: '$userEmail',
          lastActivity: '$lastActivity',
          currentPage: '$currentPage'
        }}
      }
    }
  ]);
};

onlineStatusSchema.statics.cleanupOfflineUsers = function() {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  return this.updateMany(
    { 
      isOnline: true,
      lastActivity: { $lt: fiveMinutesAgo }
    },
    { 
      $set: { 
        isOnline: false,
        lastSeen: new Date()
      }
    }
  );
};

// Parse User Agent
onlineStatusSchema.methods.parseUserAgent = function(userAgent) {
  const deviceInfo = {
    browser: 'Unknown',
    os: 'Unknown',
    device: 'Desktop',
    isMobile: false
  };
  
  // Simple user agent parsing
  if (userAgent) {
    // Browser detection
    if (userAgent.includes('Chrome')) deviceInfo.browser = 'Chrome';
    else if (userAgent.includes('Firefox')) deviceInfo.browser = 'Firefox';
    else if (userAgent.includes('Safari')) deviceInfo.browser = 'Safari';
    else if (userAgent.includes('Edge')) deviceInfo.browser = 'Edge';
    
    // OS detection
    if (userAgent.includes('Windows')) deviceInfo.os = 'Windows';
    else if (userAgent.includes('Mac')) deviceInfo.os = 'macOS';
    else if (userAgent.includes('Linux')) deviceInfo.os = 'Linux';
    else if (userAgent.includes('Android')) deviceInfo.os = 'Android';
    else if (userAgent.includes('iOS')) deviceInfo.os = 'iOS';
    
    // Mobile detection
    if (userAgent.includes('Mobile') || userAgent.includes('Android')) {
      deviceInfo.isMobile = true;
      deviceInfo.device = 'Mobile';
    } else if (userAgent.includes('Tablet') || userAgent.includes('iPad')) {
      deviceInfo.device = 'Tablet';
    }
  }
  
  this.deviceInfo = deviceInfo;
  return deviceInfo;
};

export default mongoose.model("OnlineStatus", onlineStatusSchema);
# 🔧 Admin Panel Troubleshooting Guide

## 🎯 ปัญหาที่พบ
จากภาพหน้าจอ Admin Panel:
- ✅ Admin panel โหลดได้
- ✅ แสดงข้อมูลผู้ใช้ได้
- ❌ มี CORS errors ใน browser console
- ❌ บาง API calls อาจล้มเหลว

## 🔍 การตรวจสอบ

### 1. ตรวจสอบ Backend API
```bash
# Health Check
curl https://aow-jobapp-backend.onrender.com/api/health

# API Info
curl https://aow-jobapp-backend.onrender.com/api

# Admin Stats (ต้องมี Authorization header)
curl -H "Authorization: Bearer YOUR_TOKEN" https://aow-jobapp-backend.onrender.com/api/admin/stats
```

### 2. ตรวจสอบ CORS Configuration
ใน `backend/middleware/security.js`:
```javascript
export const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || [
      'http://localhost:3000',
      'https://aow-jobapp-frontend.onrender.com'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Origin'],
};
```

### 3. ตรวจสอบ Environment Variables
**Backend (.env):**
```
CORS_ORIGIN=https://aow-jobapp-frontend.onrender.com,http://localhost:3000
NODE_ENV=production
```

**Frontend (.env):**
```
REACT_APP_API_BASE=https://aow-jobapp-backend.onrender.com
```

## 🛠️ การแก้ไข

### ปัญหา: CORS Errors
1. ตรวจสอบ `CORS_ORIGIN` ใน backend environment variables
2. ตรวจสอบ `REACT_APP_API_BASE` ใน frontend environment variables
3. Redeploy ทั้ง backend และ frontend

### ปัญหา: API Calls ล้มเหลว
1. ตรวจสอบ JWT token ใน localStorage
2. ตรวจสอบ user role เป็น "admin"
3. ตรวจสอบ backend logs ใน Render Dashboard

### ปัญหา: 500 Internal Server Error
1. ตรวจสอบ MongoDB connection
2. ตรวจสอบ environment variables
3. ตรวจสอบ backend logs

## 🧪 การทดสอบ Admin Functions

### ใน Browser Console:
```javascript
// ตรวจสอบ API Base URL
console.log('API_BASE:', window.location.hostname);

// ตรวจสอบ Token
console.log('Token:', localStorage.getItem('token'));

// ตรวจสอบ User
console.log('User:', JSON.parse(localStorage.getItem('user') || '{}'));

// ทดสอบ API Call
fetch('https://aow-jobapp-backend.onrender.com/api/admin/stats', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  }
})
.then(res => res.json())
.then(data => console.log('Admin Stats:', data))
.catch(err => console.error('Error:', err));
```

## 📋 Checklist การแก้ไข

- [ ] ✅ แก้ไข duplicate health endpoints ใน server.js
- [ ] ตรวจสอบ CORS configuration
- [ ] ตรวจสอบ environment variables ใน Render
- [ ] Redeploy backend service
- [ ] Redeploy frontend service
- [ ] ทดสอบ admin functions

## 🚨 หากยังมีปัญหา

1. **Hard refresh** browser (Ctrl+F5)
2. **Clear browser cache** และ localStorage
3. **ลองใน Incognito mode**
4. **ตรวจสอบ Network tab** ใน DevTools
5. **ตรวจสอบ backend logs** ใน Render Dashboard

---

**💡 Tip:** Admin panel ต้องการ user role = "admin" และ valid JWT token เพื่อเข้าถึงข้อมูล
# 🔧 แก้ไข CORS ใน Production

## 🎯 ปัญหา: Backend ทำงานได้ แต่ Frontend ได้ CORS Error

Backend API ตอบ `{"status":"ok"}` แต่ Frontend ยังได้ CORS errors

## 🛠️ วิธีแก้ไข

### STEP 1: อัปเดต Environment Variables ใน Render

#### Backend Service Environment Variables:
```bash
CORS_ORIGIN=https://aow-jobapp-frontend.onrender.com,http://localhost:3000,http://127.0.0.1:3000
NODE_ENV=production
```

#### Frontend Service Environment Variables:
```bash
REACT_APP_API_BASE=https://aow-jobapp.onrender.com
```

### STEP 2: ตรวจสอบ Backend CORS Configuration

ใน `backend/middleware/security.js` ควรมี:

```javascript
export const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || [
      'http://localhost:3000',
      'https://aow-jobapp-frontend.onrender.com'
    ];
    
    if (!origin && process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Origin'],
};
```

### STEP 3: Test API Endpoints

ทดสอบ endpoints เหล่านี้:

1. **Health:** `https://aow-jobapp.onrender.com/api/health`
2. **API Info:** `https://aow-jobapp.onrender.com/api`
3. **Auth Test:** `https://aow-jobapp.onrender.com/api/auth/test`

### STEP 4: Redeploy Services

หลังจากแก้ไข Environment Variables:
1. Redeploy Backend service
2. Redeploy Frontend service
3. รอ 2-3 นาทีให้ services restart

## 🔍 การตรวจสอบ

### ใน Browser Console ควรเห็น:
- ✅ API calls สำเร็จ (200 OK)
- ❌ ไม่มี CORS errors
- ✅ Login/Register ทำงานได้

### ใน Network Tab ควรเห็น:
- `POST /api/auth/firebase-google` → 200 OK
- `POST /api/auth/login` → 200 OK
- Headers มี `Access-Control-Allow-Origin`

## 🚨 ถ้ายังไม่ได้

1. **ตรวจสอบ Backend Logs** ใน Render Dashboard
2. **ตรวจสอบ Environment Variables** ว่าตั้งถูกต้องไหม
3. **Hard refresh** browser (Ctrl+F5)
4. **ลองใน Incognito mode**

---

**💡 Tip:** Render services ใช้เวลา 1-2 นาทีในการ restart หลังจากเปลี่ยน environment variables
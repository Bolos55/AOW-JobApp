# 🚀 Deploy Backend to Render.com

## 🎯 ปัญหา: Backend Service ไม่ทำงาน

จาก error logs เห็นว่า:
- `POST https://aow-jobapp.onrender.com/api/auth/*` → 404 Not Found
- Backend service อาจยังไม่ได้ deploy หรือไม่ทำงาน

## 📋 ขั้นตอนการ Deploy Backend

### STEP 1: สร้าง Backend Service ใน Render

1. **ไปที่ Render Dashboard** → https://dashboard.render.com
2. **คลิก "New +"** → **Web Service**
3. **Connect GitHub Repository:** `Bolos55/AOW-JobApp`
4. **ตั้งค่า Service:**
   ```
   Name: aow-jobapp-backend
   Environment: Node
   Region: Singapore (ใกล้ที่สุด)
   Branch: main
   Root Directory: backend
   Build Command: npm install
   Start Command: npm start
   ```

### STEP 2: ตั้งค่า Environment Variables

ใน Backend Service Environment Variables:

```bash
# Database
MONGODB_URI=mongodb+srv://bosszazababa_db_user:NEW_PASSWORD@cluster0.7pefvkv.mongodb.net/job-app?retryWrites=true&w=majority

# JWT Security
JWT_SECRET=7f8e9d2c1b4a5f6e8d9c2b1a4f5e6d7c8b9a2f1e4d5c6b7a8f9e2d1c4b5a6f7e8d9c2b1a4f5e6d7c8b9a2f1e4d5c6b7a8f9e2d1c4b5a6f7e8d9c2b1a4f5e6d7c
JWT_EXPIRE=7d

# CORS Configuration
CORS_ORIGIN=https://aow-jobapp-frontend.onrender.com,http://localhost:3000

# Firebase
FIREBASE_PROJECT_ID=jobapp-93cfa
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"jobapp-93cfa",...}

# Email
EMAIL_SERVICE=gmail
EMAIL_USER=bosszazababa@gmail.com
EMAIL_PASS=YOUR_GMAIL_APP_PASSWORD

# GitHub OAuth
GITHUB_CLIENT_ID=Ov23lilnsasWNsSB74mx
GITHUB_CLIENT_SECRET=YOUR_NEW_GITHUB_SECRET

# Other Settings
NODE_ENV=production
PORT=10000
FRONTEND_URL=https://aow-jobapp-frontend.onrender.com
```

### STEP 3: Deploy และตรวจสอบ

1. **คลิก "Create Web Service"**
2. **รอให้ build เสร็จ** (5-10 นาที)
3. **ตรวจสอบ Logs** ว่ามี error ไหม
4. **Test API endpoint:** `https://aow-jobapp-backend.onrender.com/api/health`

### STEP 4: อัปเดต Frontend API URL

ใน Frontend Service Environment Variables:
```bash
REACT_APP_API_BASE=https://aow-jobapp-backend.onrender.com
```

## 🔧 ถ้ามี Backend Service แล้วแต่ไม่ทำงาน

### ตรวจสอบ Logs:
1. **ไปที่ Backend Service** ใน Render Dashboard
2. **คลิก "Logs"** tab
3. **ดู error messages**

### Common Issues:
- **MongoDB connection failed** → ตรวจสอบ MONGODB_URI
- **Missing environment variables** → เพิ่ม variables ที่ขาด
- **Port configuration** → ตั้ง PORT=10000
- **Firebase service account** → ตั้ง FIREBASE_SERVICE_ACCOUNT_KEY

## 🎯 Expected Result

หลังจาก deploy สำเร็จ:
- `https://aow-jobapp-backend.onrender.com/api/health` → 200 OK
- Frontend จะเชื่อมต่อ Backend ได้
- CORS errors จะหายไป
- Login/Register จะทำงานได้

## 🆘 ถ้ายังมีปัญหา

1. **ตรวจสอบ Backend Logs** ใน Render Dashboard
2. **Test API endpoints** ด้วย Postman หรือ curl
3. **ตรวจสอบ Environment Variables** ว่าครบไหม
4. **ตรวจสอบ CORS configuration** ใน backend/middleware/security.js

---

**💡 Tip:** Render free tier มี cold start delay ~30 วินาที ถ้าไม่มีการใช้งาน
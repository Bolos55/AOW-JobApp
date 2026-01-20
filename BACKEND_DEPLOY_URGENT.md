# 🚨 URGENT: Deploy Backend to Render

## 🎯 ปัญหา: Cannot POST /api/auth/firebase-google (404)

Backend service ไม่ทำงานหรือไม่ได้ deploy

## 🚀 แก้ไขทันที

### STEP 1: สร้าง Backend Service

1. **ไปที่ Render Dashboard:** https://dashboard.render.com
2. **คลิก "New +" → Web Service**
3. **Connect Repository:** `Bolos55/AOW-JobApp`
4. **ตั้งค่า:**
   ```
   Name: aow-jobapp
   Environment: Node
   Region: Singapore
   Branch: main
   Root Directory: backend
   Build Command: npm install
   Start Command: node server.js
   ```

### STEP 2: Environment Variables (สำคัญ!)

```bash
# Database (ต้องมี!)
MONGODB_URI=mongodb+srv://bosszazababa_db_user:QaVGqdiQMbgrEHL6@cluster0.7pefvkv.mongodb.net/job-app?retryWrites=true&w=majority

# JWT (ต้องมี!)
JWT_SECRET=7f8e9d2c1b4a5f6e8d9c2b1a4f5e6d7c8b9a2f1e4d5c6b7a8f9e2d1c4b5a6f7e8d9c2b1a4f5e6d7c8b9a2f1e4d5c6b7a8f9e2d1c4b5a6f7e8d9c2b1a4f5e6d7c

# CORS (ต้องมี!)
CORS_ORIGIN=https://aow-jobapp-frontend.onrender.com,http://localhost:3000

# Firebase (ต้องมี!)
FIREBASE_PROJECT_ID=jobapp-93cfa

# Production Settings
NODE_ENV=production
PORT=10000
```

### STEP 3: Deploy และรอ

1. **คลิก "Create Web Service"**
2. **รอ 5-10 นาที** ให้ build เสร็จ
3. **ตรวจสอบ Logs** ว่ามี error ไหม

### STEP 4: Test API

หลังจาก deploy เสร็จ:
- `https://aow-jobapp.onrender.com/api/health` → ควรได้ `{"status":"ok"}`
- `https://aow-jobapp.onrender.com/api` → ควรได้ API info

## 🔧 ถ้ามี Backend Service แล้ว

### ตรวจสอบ Logs:
1. **ไปที่ Backend Service** ใน Render
2. **คลิก "Logs"**
3. **ดู error messages:**
   - MongoDB connection failed?
   - Missing environment variables?
   - Port binding error?

### Common Fixes:
- **เพิ่ม Environment Variables** ที่ขาด
- **ตั้ง PORT=10000**
- **ตรวจสอบ MONGODB_URI**
- **Redeploy service**

## 🎯 Expected Result

หลังจากแก้ไข:
- ✅ `POST /api/auth/firebase-google` → 200 OK
- ✅ Login ทำงานได้
- ✅ ไม่มี CORS errors

---

**⏰ ใช้เวลา: 5-10 นาที**
**🎯 Priority: URGENT - Frontend ไม่ทำงานจนกว่า Backend จะ deploy**
# 🔥 Firebase Authorization Error - วิธีแก้ไข

## ❌ ปัญหา: "An Authorization Error Occurred"

### 🔍 สาเหตุที่เป็นไปได้:

1. **Firebase Domain ไม่ได้รับอนุญาต**
2. **Firebase Project Configuration ผิด**
3. **Google OAuth ไม่ได้เปิดใช้งาน**
4. **Firebase Admin SDK ไม่ได้ตั้งค่า**

## 🛠️ วิธีแก้ไข:

### 1. Firebase Console - Authorized Domains

1. ไปที่ [Firebase Console](https://console.firebase.google.com/)
2. เลือก project: `jobapp-93cfa`
3. ไปที่ **Authentication > Settings > Authorized domains**
4. เพิ่ม domains ต่อไปนี้:
   ```
   localhost
   127.0.0.1
   aow-jobapp.onrender.com
   aow-jobapp-frontend.onrender.com
   ```

### 2. Firebase Console - Sign-in Methods

1. ไปที่ **Authentication > Sign-in method**
2. เปิดใช้งาน **Google** provider
3. ตั้งค่า **OAuth consent screen**:
   - App name: AOW Job Platform
   - User support email: bosszazababa@gmail.com
   - Developer contact: bosszazababa@gmail.com

### 3. ตรวจสอบ Environment Variables

Frontend (.env):
```bash
REACT_APP_FIREBASE_API_KEY=AIzaSyCpq_OYRG43zPRQlwAa85iWZBLOTntiGfc
REACT_APP_FIREBASE_AUTH_DOMAIN=jobapp-93cfa.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=jobapp-93cfa
```

Backend (backend/.env):
```bash
FIREBASE_PROJECT_ID=jobapp-93cfa
```

### 4. ตรวจสอบ Firebase Admin SDK

Backend ต้องมี Firebase Admin SDK ที่ทำงานได้:

```javascript
// backend/config/firebase-admin.js
import admin from 'firebase-admin';

const initializeFirebaseAdmin = () => {
  if (process.env.FIREBASE_PROJECT_ID) {
    return admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID
    });
  }
  throw new Error('Firebase configuration missing');
};
```

## 🧪 การทดสอบ:

### 1. ทดสอบ Firebase Config
```bash
# ตรวจสอบว่า Firebase endpoint ทำงาน
curl http://localhost:5000/api/auth/test
```

### 2. ทดสอบ Google Login
1. เปิด browser ไปที่ `http://localhost:3000`
2. คลิก "เข้าสู่ระบบด้วย Google"
3. ดู console สำหรับ error messages

### 3. ตรวจสอบ Network Tab
1. เปิด Developer Tools > Network
2. ลอง login ด้วย Google
3. ดู request/response สำหรับ errors

## 🚨 Error Messages ที่พบบ่อย:

### "auth/unauthorized-domain"
```
🚫 Domain ไม่ได้รับอนุญาต
กรุณาเพิ่ม "localhost" ใน Firebase Authorized domains
```
**แก้ไข**: เพิ่ม domain ใน Firebase Console

### "Firebase ID Token ไม่ถูกต้อง"
```
{"message":"Firebase ID Token ไม่ถูกต้อง","error":"auth/argument-error"}
```
**แก้ไข**: ตรวจสอบ Firebase Admin SDK configuration

### "Firebase Auth ยังไม่พร้อมใช้งาน"
```
Firebase Auth ยังไม่พร้อมใช้งาน
```
**แก้ไข**: ตรวจสอบ environment variables

## 📋 Checklist:

- [ ] Firebase project `jobapp-93cfa` exists
- [ ] Google Sign-in method enabled
- [ ] Authorized domains added (localhost, production domains)
- [ ] OAuth consent screen configured
- [ ] Environment variables correct
- [ ] Firebase Admin SDK initialized
- [ ] Backend server running on port 5000
- [ ] Frontend can connect to backend

## 🔧 Quick Fix Commands:

```bash
# 1. Restart backend server
cd backend
npm start

# 2. Test Firebase endpoint
curl http://localhost:5000/api/auth/test

# 3. Check environment variables
echo $REACT_APP_FIREBASE_PROJECT_ID
echo $FIREBASE_PROJECT_ID
```

## 📞 หากยังมีปัญหา:

1. ตรวจสอบ Firebase Console logs
2. ดู browser console สำหรับ detailed errors
3. ตรวจสอบ network requests ใน Developer Tools
4. ลอง clear browser cache และ cookies

---

**สถานะ**: ✅ Backend ทำงานได้, ต้องตรวจสอบ Firebase Console settings
**อัปเดต**: January 2026
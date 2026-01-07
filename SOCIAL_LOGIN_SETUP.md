# การตั้งค่า Social Login (Google & Facebook)

## 📋 สิ่งที่ได้เพิ่มแล้ว

✅ **Frontend Components:**
- `src/components/SocialLogin.jsx` - Component สำหรับปุ่ม Google และ Facebook login
- อัพเดต `src/LoginPage.jsx` เพื่อรวม Social Login
- อัพเดต `src/index.js` เพื่อเพิ่ม GoogleOAuthProvider

✅ **Backend Routes:**
- `backend/routes/socialAuthRoutes.js` - API endpoints สำหรับ `/api/auth/google` และ `/api/auth/facebook`
- อัพเดต `backend/models/User.js` เพื่อรองรับ social login fields
- อัพเดต `backend/server.js` เพื่อเพิ่ม social auth routes

✅ **Dependencies:**
- Frontend: `@react-oauth/google`, `react-facebook-login`
- Backend: `passport`, `passport-google-oauth20`, `passport-facebook`

## 🚨 ข้อจำกัดสำคัญ

### Facebook Login Requirements:
- **ต้องใช้ HTTPS เท่านั้น** - Facebook ไม่อนุญาตให้ใช้ FB.login บน HTTP
- **Development Mode**: Facebook Login จะไม่ทำงานบน `http://localhost:3000`
- **Production Only**: Facebook Login จะทำงานได้เมื่อ deploy บน HTTPS เท่านั้น

### Google Login:
- ✅ **ทำงานได้ทั้ง HTTP และ HTTPS**
- ✅ **ใช้ได้ใน Development**
- ✅ **ใช้ได้ใน Production**

## 🔧 การตั้งค่าที่ต้องทำเพิ่ม

### 1. Google OAuth Setup

1. ไปที่ [Google Cloud Console](https://console.cloud.google.com/)
2. สร้างโปรเจคใหม่หรือเลือกโปรเจคที่มีอยู่
3. เปิดใช้งาน Google+ API
4. ไปที่ "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. เลือก "Web application"
6. เพิ่ม Authorized JavaScript origins:
   - `http://localhost:3000` (สำหรับ development)
   - `https://your-frontend-domain.com` (สำหรับ production)
7. เพิ่ม Authorized redirect URIs:
   - `http://localhost:3000` (สำหรับ development)
   - `https://your-frontend-domain.com` (สำหรับ production)
8. คัดลอก Client ID มาใส่ใน `.env`:

```env
REACT_APP_GOOGLE_CLIENT_ID=your-actual-google-client-id-here
```

### 2. Facebook App Setup

1. ไปที่ [Facebook Developers](https://developers.facebook.com/)
2. สร้าง App ใหม่ → เลือก "Consumer"
3. เพิ่ม "Facebook Login" product
4. ไปที่ Settings → Basic → คัดลอก App ID
5. ไปที่ Facebook Login → Settings
6. เพิ่ม Valid OAuth Redirect URIs:
   - `http://localhost:3000/` (สำหรับ development)
   - `https://your-frontend-domain.com/` (สำหรับ production)
7. ใส่ App ID ใน `.env`:

```env
REACT_APP_FACEBOOK_APP_ID=your-actual-facebook-app-id-here
```

### 3. อัพเดต .env Files

**Frontend (.env):**
```env
REACT_APP_API_URL=https://aow-jobapp.onrender.com/api
REACT_APP_GOOGLE_CLIENT_ID=your-actual-google-client-id-here
REACT_APP_FACEBOOK_APP_ID=your-actual-facebook-app-id-here
```

**Backend (backend/.env):**
```env
PORT=5000
MONGODB_URI="your-mongodb-connection-string"
JWT_SECRET=your-jwt-secret
JWT_EXPIRE=7d
FRONTEND_URL=https://aow-jobapp-frontend.onrender.com
```

## 🚀 การทดสอบ

1. รัน backend: `cd backend && npm start`
2. รัน frontend: `npm start`
3. ไปที่หน้า login
4. ลองกดปุ่ม "เข้าสู่ระบบด้วย Google" หรือ "เข้าสู่ระบบด้วย Facebook"

## 🔍 การ Debug

### ตรวจสอบ Console Errors:
- เปิด Developer Tools (F12)
- ดู Console tab สำหรับ error messages
- ดู Network tab สำหรับ API calls

### ปัญหาที่อาจพบ:
1. **"Invalid Client ID"** → ตรวจสอบ REACT_APP_GOOGLE_CLIENT_ID
2. **"App Not Setup"** → ตรวจสอบ REACT_APP_FACEBOOK_APP_ID
3. **"FB.login can no longer be called from http pages"** → Facebook ต้องใช้ HTTPS เท่านั้น
4. **"Tracking Prevention blocked access"** → Browser บล็อก Facebook SDK (ปกติใน development)
5. **CORS Error** → ตรวจสอบ domain ใน OAuth settings
6. **"Failed to fetch"** → ตรวจสอบว่า backend รันอยู่

### วิธีแก้ปัญหา Facebook ใน Development:
1. **ใช้ HTTPS ใน Development:**
   ```bash
   # ใช้ HTTPS=true
   HTTPS=true npm start
   ```
   
2. **หรือทดสอบเฉพาะ Google Login** ใน development
3. **ทดสอบ Facebook Login หลัง deploy** บน production (HTTPS)

## 📝 Features ที่ทำงาน

✅ **Google Login:**
- ดึงข้อมูล name, email, picture จาก Google
- สร้าง user ใหม่ถ้ายังไม่มีในระบบ
- Login user ที่มีอยู่แล้ว

✅ **Facebook Login:**
- ดึงข้อมูล name, email, picture จาก Facebook
- สร้าง user ใหม่ถ้ายังไม่มีในระบบ
- Login user ที่มีอยู่แล้ว

✅ **Security:**
- Verify token กับ Google/Facebook API
- สร้าง JWT token สำหรับ session
- เก็บข้อมูล social provider ใน database

## 🎯 Next Steps

1. ตั้งค่า Google และ Facebook App IDs
2. ทดสอบ social login
3. ปรับแต่ง UI/UX ตามต้องการ
4. เพิ่ม error handling เพิ่มเติม
5. เพิ่ม social login สำหรับ mobile app (ถ้าต้องการ)
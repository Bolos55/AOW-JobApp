# 🔐 คู่มือตั้งค่า Social Login

## 🔥 Firebase (Google Login)

### 1. สร้าง Firebase Project
1. ไปที่ [Firebase Console](https://console.firebase.google.com/)
2. คลิก "Create a project"
3. ตั้งชื่อโปรเจกต์ เช่น "aow-jobapp"
4. ปิด Google Analytics (ไม่จำเป็น)
5. คลิก "Create project"

### 2. เปิดใช้งาน Authentication
1. ไปที่ "Authentication" → "Get started"
2. แท็บ "Sign-in method" → เลือก "Google"
3. เปิดใช้งาน (Enable)
4. ใส่ชื่อโปรเจกต์และอีเมล support
5. คลิก "Save"

### 3. เพิ่ม Web App
1. หน้าหลัก Firebase Console → คลิก "</>" (Web)
2. ตั้งชื่อแอป เช่น "AOW JobApp Web"
3. คลิก "Register app"
4. **คัดลอก Firebase configuration**

### 4. อัปเดต .env
```env
REACT_APP_FIREBASE_API_KEY=AIzaSyC_your_actual_api_key_here
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789012
REACT_APP_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890
```

---

## 🐙 GitHub OAuth

### 1. สร้าง GitHub OAuth App
1. ไปที่ [GitHub Settings](https://github.com/settings/developers)
2. "OAuth Apps" → "New OAuth App"
3. กรอกข้อมูล:
   - **Application name**: AOW JobApp
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/auth/github/callback`
4. คลิก "Register application"
5. **คัดลอก Client ID**

### 2. อัปเดต .env
```env
REACT_APP_GITHUB_CLIENT_ID=your_actual_github_client_id_here
```

---

## 🚀 การทดสอบ

### หลังตั้งค่าเสร็จ:
1. รีสตาร์ทเซิร์ฟเวอร์: `npm start`
2. ปุ่ม Social Login จะเปลี่ยนจาก disabled เป็น active
3. ทดสอบ Google Login และ GitHub Login

### ถ้ามีปัญหา:
- ตรวจสอบ Console ใน Browser (F12)
- ตรวจสอบ Firebase Console → Authentication → Users
- ตรวจสอบ Backend logs

---

## 🔒 Production Setup

### Firebase:
- เพิ่ม domain จริงใน Firebase Console → Authentication → Settings → Authorized domains

### GitHub:
- อัปเดต OAuth App:
  - **Homepage URL**: `https://yourdomain.com`
  - **Authorization callback URL**: `https://yourdomain.com/auth/github/callback`

---

## 📋 Checklist

- [ ] สร้าง Firebase Project
- [ ] เปิดใช้งาน Google Authentication
- [ ] เพิ่ม Web App ใน Firebase
- [ ] อัปเดต Firebase config ใน .env
- [ ] สร้าง GitHub OAuth App
- [ ] อัปเดต GitHub Client ID ใน .env
- [ ] รีสตาร์ทเซิร์ฟเวอร์
- [ ] ทดสอบ Google Login
- [ ] ทดสอบ GitHub Login

เมื่อทำครบทุกขั้นตอน Social Login จะพร้อมใช้งาน! 🎉
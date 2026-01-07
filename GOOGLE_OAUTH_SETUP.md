# การตั้งค่า Google OAuth Client ID

## 🚨 ปัญหาปัจจุบัน
Error: "invalid_client" เกิดจากยังไม่ได้ตั้งค่า Google OAuth Client ID

## 📋 ขั้นตอนการแก้ไข

### 1. ไปที่ Google Cloud Console
- เปิด [Google Cloud Console](https://console.cloud.google.com/)
- เข้าสู่ระบบด้วย Google Account

### 2. สร้างโปรเจค (ถ้ายังไม่มี)
- คลิก "Select a project" → "New Project"
- ตั้งชื่อโปรเจค เช่น "JobApp OAuth"
- คลิก "Create"

### 3. เปิดใช้งาน Google Identity API
- ไปที่ "APIs & Services" → "Library"
- ค้นหา "Google Identity" หรือ "Google+ API"
- คลิก "Enable"

### 4. สร้าง OAuth 2.0 Client ID
- ไปที่ "APIs & Services" → "Credentials"
- คลิก "Create Credentials" → "OAuth 2.0 Client IDs"

### 5. ตั้งค่า OAuth Consent Screen (ถ้ายังไม่เคยทำ)
- เลือก "External" → "Create"
- กรอกข้อมูล:
  - **App name**: JobApp
  - **User support email**: อีเมลของคุณ
  - **Developer contact information**: อีเมลของคุณ
- คลิก "Save and Continue" ทุกขั้นตอน

### 6. สร้าง OAuth Client ID
- กลับไปที่ "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
- เลือก "Web application"
- ตั้งค่า:

**Application name**: JobApp Frontend

**Authorized JavaScript origins**:
```
http://localhost:3000
https://localhost:3000
https://your-production-domain.com
```

**Authorized redirect URIs**:
```
http://localhost:3000
https://localhost:3000
https://your-production-domain.com
```

### 7. คัดลอก Client ID
- หลังจากสร้างเสร็จ จะได้ Client ID
- คัดลอก Client ID (รูปแบบ: xxxxx.apps.googleusercontent.com)

### 8. อัพเดต .env
แก้ไขไฟล์ `.env`:
```env
REACT_APP_API_URL=https://aow-jobapp.onrender.com/api
REACT_APP_GOOGLE_CLIENT_ID=your-actual-client-id.apps.googleusercontent.com
REACT_APP_FACEBOOK_APP_ID=your-facebook-app-id-here
```

### 9. Restart Development Server
```bash
# หยุด server (Ctrl+C)
# รันใหม่
npm start
```

## ✅ การทดสอบ
1. รัน `npm start`
2. ไปหน้า login
3. ปุ่ม "เข้าสู่ระบบด้วย Google" ควรใช้งานได้
4. คลิกแล้วควรเปิดหน้าต่าง Google OAuth

## 🔍 การ Debug
ถ้ายังมีปัญหา:

1. **ตรวจสอบ Console**:
   - เปิด Developer Tools (F12)
   - ดู Console tab หา error messages

2. **ตรวจสอบ Network**:
   - ดู Network tab ว่า API calls ไปถึง backend หรือไม่

3. **ตรวจสอบ Environment Variables**:
   ```javascript
   console.log('Google Client ID:', process.env.REACT_APP_GOOGLE_CLIENT_ID);
   ```

## 📝 หมายเหตุ
- Client ID ไม่ใช่ข้อมูลลับ (สามารถเห็นได้ใน frontend)
- Client Secret ไม่ต้องใช้ในการตั้งค่านี้
- ถ้าเปลี่ยน domain ต้องเพิ่มใน Authorized origins ด้วย
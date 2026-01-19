# 📋 API Endpoints Summary - AOW Job Platform

## 🔍 สถานะ API หลังการแก้ไขความปลอดภัย

### ✅ Authentication Endpoints

#### `/api/auth/*`
- **POST** `/api/auth/register` - ลงทะเบียนผู้ใช้ใหม่
- **POST** `/api/auth/login` - เข้าสู่ระบบ
- **GET** `/api/auth/me` - ดึงข้อมูลผู้ใช้ปัจจุบัน
- **POST** `/api/auth/forgot-password` - ขอรีเซ็ตรหัสผ่าน
- **POST** `/api/auth/reset-password` - รีเซ็ตรหัสผ่าน
- **POST** `/api/auth/verify-email` - ยืนยันอีเมล
- **POST** `/api/auth/resend-verification` - ส่งลิงก์ยืนยันใหม่
- **POST** `/api/auth/complete-social-registration` - สมัครผ่าน Social Login
- **GET** `/api/auth/test-firebase` - ทดสอบ Firebase

#### Firebase Authentication (Secure)
- **POST** `/api/auth/firebase-google` - เข้าสู่ระบบด้วย Google (ใช้ ID Token)

### ✅ Job Endpoints

#### `/api/jobs/*`
- **GET** `/api/jobs` - ดึงรายการงาน (มี pagination, search)
- **POST** `/api/jobs` - สร้างงานใหม่ (ต้อง auth)
- **GET** `/api/jobs/:id` - ดึงข้อมูลงานเฉพาะ
- **PUT** `/api/jobs/:id` - แก้ไขงาน (ต้อง auth + owner)
- **DELETE** `/api/jobs/:id` - ลบงาน (ต้อง auth + owner)

### ✅ Application Endpoints

#### `/api/applications/*`
- **POST** `/api/applications` - สมัครงาน (ต้อง auth)
- **GET** `/api/applications/my` - ดึงใบสมัครของตัวเอง
- **GET** `/api/applications/job/:jobId` - ดึงใบสมัครของงาน (employer only)
- **PUT** `/api/applications/:id/status` - เปลี่ยนสถานะใบสมัคร (employer only)

### ✅ Profile Endpoints

#### `/api/profile/*`
- **GET** `/api/profile/me` - ดึงโปรไฟล์ตัวเอง
- **PUT** `/api/profile/me` - แก้ไขโปรไฟล์
- **POST** `/api/profile/me/resume` - อัปโหลดเรซูเม่ (มี rate limiting)
- **POST** `/api/profile/me/photo` - อัปโหลดรูปโปรไฟล์ (มี rate limiting)
- **GET** `/api/profile/:userId` - ดึงโปรไฟล์ผู้อื่น (employer/admin only)

### ✅ Payment Endpoints

#### `/api/payments/*`
- **POST** `/api/payments/create` - สร้างการชำระเงิน (ต้อง auth)
- **GET** `/api/payments/:paymentId/status` - ตรวจสอบสถานะการชำระ
- **POST** `/api/payments/webhook` - รับ webhook จาก payment gateway (secure signature)

### ✅ Chat Endpoints

#### `/api/chats/*`
- **GET** `/api/chats` - ดึงรายการแชท
- **POST** `/api/chats` - สร้างแชทใหม่
- **GET** `/api/chats/:chatId/messages` - ดึงข้อความในแชท
- **POST** `/api/chats/:chatId/messages` - ส่งข้อความ

### ✅ Review Endpoints

#### `/api/reviews/*`
- **GET** `/api/reviews/user/:userId` - ดึงรีวิวของผู้ใช้
- **POST** `/api/reviews` - เขียนรีวิว
- **PUT** `/api/reviews/:id` - แก้ไขรีวิว
- **DELETE** `/api/reviews/:id` - ลบรีวิว

### ✅ Admin Endpoints

#### `/api/admin/*` (ต้อง Admin API Key)
- **GET** `/api/admin/users` - ดึงรายการผู้ใช้ทั้งหมด
- **PUT** `/api/admin/users/:id/status` - เปลี่ยนสถานะผู้ใช้
- **GET** `/api/admin/jobs` - ดึงรายการงานทั้งหมด
- **GET** `/api/admin/payments` - ดึงรายการการชำระเงิน

### ✅ Online Status Endpoints

#### `/api/online-status/*`
- **POST** `/api/online-status/update` - อัปเดตสถานะออนไลน์
- **GET** `/api/online-status/:userId` - ดึงสถานะออนไลน์

## 🔒 การเปลี่ยนแปลงด้านความปลอดภัย

### ❌ Endpoints ที่ถูกลบ (เพื่อความปลอดภัย)
- **POST** `/api/auth/firebase-google` (insecure version) - ลบแล้ว

### ✅ Endpoints ที่ได้รับการปรับปรุง
- **POST** `/api/auth/firebase-google` - ใช้ Firebase ID Token verification
- **POST** `/api/payments/webhook` - เพิ่ม HMAC-SHA256 signature verification
- **POST** `/api/profile/me/resume` - เพิ่ม rate limiting และ file validation
- **POST** `/api/profile/me/photo` - เพิ่ม rate limiting และ file validation

### 🛡️ Security Features เพิ่มเติม
- **Rate Limiting**: ทุก endpoints มี rate limiting
- **Input Validation**: ทุก inputs ผ่านการตรวจสอบ
- **Authentication**: JWT token validation ที่เข้มงวด
- **Authorization**: Role-based access control
- **File Upload Security**: Type, size validation + random filenames
- **CORS Protection**: Strict origin validation

## 📊 API Status Check

### ✅ Working Endpoints
- Authentication flows
- Job CRUD operations
- Profile management
- File uploads (secure)
- Payment processing (secure)
- Chat functionality
- Review system
- Admin operations

### ⚠️ Potential Issues
- **Firebase Authentication**: ต้องมี Firebase Admin SDK configured
- **Payment Webhooks**: ต้องมี PAYMENT_WEBHOOK_SECRET
- **File Uploads**: ต้องมีโฟลเดอร์ uploads/resumes และ uploads/photos
- **Admin Endpoints**: ต้องมี ADMIN_API_KEY

## 🔧 Configuration Required

### Environment Variables ที่จำเป็น
```bash
# Authentication
JWT_SECRET=<secure-secret>
FIREBASE_PROJECT_ID=<project-id>

# Payment
PAYMENT_WEBHOOK_SECRET=<secure-secret>

# Admin
ADMIN_API_KEY=<secure-secret>

# File Upload
MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,application/pdf
```

### Folders ที่จำเป็น
```
backend/uploads/
├── resumes/
├── photos/
├── idcards/
└── profile/
```

## 🧪 Testing Endpoints

### Quick Health Check
```bash
# Test basic endpoints
curl http://localhost:5000/api/auth/test-firebase
curl http://localhost:5000/api/jobs
curl http://localhost:5000/api/health (if exists)
```

### Authentication Test
```bash
# Test login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

### Rate Limiting Test
```bash
# Test rate limiting (should get 429 after multiple requests)
for i in {1..10}; do
  curl http://localhost:5000/api/jobs
done
```

## 🚨 Breaking Changes

### ⚠️ Changes That May Affect Frontend

1. **Firebase Authentication**
   - Frontend ต้องส่ง `idToken` แทน user data
   - Endpoint เดิมถูกลบแล้ว

2. **File Upload**
   - Response format อาจเปลี่ยน
   - File paths ใช้ random names

3. **Rate Limiting**
   - อาจได้รับ 429 status หากส่ง request มากเกินไป

4. **Validation**
   - Input validation เข้มงวดขึ้น
   - Error messages อาจเปลี่ยน

### 🔄 Migration Guide

#### Frontend Changes Required
```javascript
// OLD: Send user data
const response = await fetch('/api/auth/firebase-google', {
  body: JSON.stringify({
    uid: user.uid,
    email: user.email,
    name: user.displayName
  })
});

// NEW: Send ID token
const idToken = await user.getIdToken();
const response = await fetch('/api/auth/firebase-google', {
  body: JSON.stringify({
    idToken: idToken
  })
});
```

## 📞 Support

หากพบปัญหากับ API endpoints:

1. ตรวจสอบ environment variables
2. ตรวจสอบ rate limiting
3. ตรวจสอบ authentication token
4. ดู logs ใน console
5. ตรวจสอบ CORS settings

---

**Last Updated**: January 2026  
**API Version**: v1  
**Security Level**: Production Ready ✅
# 🔧 แก้ไข CORS บน Render

## ปัญหา
Backend บน Render ไม่อนุญาตให้ `http://192.168.137.1:3000` เข้าถึง

## 🛠️ วิธีแก้ไข:

### Option 1: ใช้ localhost (แนะนำ)
เปลี่ยน URL ใน browser จาก:
```
http://192.168.137.1:3000
```
เป็น:
```
http://localhost:3000
```

### Option 2: อัปเดต CORS บน Render
1. **เปิด Render Dashboard:** https://dashboard.render.com
2. **เลือก Backend Service:** `aow-jobapp` (หรือชื่อที่ใช้)
3. **ไป Environment tab**
4. **แก้ไข `CORS_ORIGIN`:**
   ```
   CORS_ORIGIN=http://localhost:3000,http://127.0.0.1:3000,http://192.168.137.1:3000,https://aow-jobapp-frontend.onrender.com
   ```
5. **กด "Save Changes"**
6. **รอ auto-deploy (2-3 นาที)**

### Option 3: ใช้ Local Backend
1. **เปลี่ยน API_BASE ใน frontend:**
   ```javascript
   // ใน .env หรือ src/api.js
   API_BASE = "http://localhost:5000"
   ```
2. **รัน backend locally:**
   ```bash
   cd backend
   npm start
   ```

## 🧪 ทดสอบ
หลังแก้ไข ให้:
1. รีเฟรชหน้าเว็บ
2. กด Google Login
3. ดู Network tab - ไม่ควรมี CORS error

## 💡 Tips
- **Development:** ใช้ localhost เสมอ
- **Production:** ใช้ domain จริง
- **Testing:** เพิ่มทุก IP ที่อาจใช้
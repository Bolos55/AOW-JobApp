# 🔧 Firebase Authorized Domains Setup

## ปัญหา: `auth/unauthorized-domain`

เมื่อใช้ Google Login จาก domain ที่ไม่ได้รับอนุญาต Firebase จะแสดง error นี้

## 🛠️ วิธีแก้ไข:

### 1. เปิด Firebase Console
- ไป https://console.firebase.google.com
- เลือกโปรเจกต์ `jobapp-93cfa`

### 2. ไปที่ Authentication Settings
- คลิก **Authentication** ในเมนูซ้าย
- คลิก **Settings** tab
- คลิก **Authorized domains**

### 3. เพิ่ม Domains ที่ต้องการ
กด **"Add domain"** และเพิ่ม:

```
localhost
127.0.0.1
192.168.137.1
```

### 4. สำหรับ Production
เมื่อ deploy จริง ให้เพิ่ม:
```
your-domain.com
www.your-domain.com
your-app.onrender.com
```

## 🔍 ตรวจสอบ Domain ปัจจุบัน

เปิด Console ใน browser และรัน:
```javascript
console.log('Current domain:', window.location.hostname);
console.log('Current origin:', window.location.origin);
```

## 💡 Tips

1. **Development:** ใช้ `localhost:3000` แทน IP address
2. **Testing:** เพิ่มทุก domain ที่อาจใช้ (localhost, 127.0.0.1, IP address)
3. **Production:** เพิ่มเฉพาะ domain จริงที่ใช้งาน

## 🚨 หมายเหตุ

- การเปลี่ยนแปลงใน Firebase Console จะมีผลทันที
- ไม่ต้อง restart แอป
- ถ้ายังไม่ได้ ลองรีเฟรชหน้าเว็บ
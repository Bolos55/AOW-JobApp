# 📧 วิธีตั้งค่า Resend สำหรับส่งอีเมล

## 🎯 ทำไมต้องใช้ Resend?

Render (และ hosting อื่นๆ) มักจะ **block SMTP port 25, 465, 587** เพื่อป้องกัน spam  
ทำให้ Gmail SMTP ใช้ไม่ได้ → เกิด `ETIMEDOUT` error

**Resend** ใช้ HTTPS API แทน SMTP → ไม่โดน block ✅

---

## 🚀 ขั้นตอนการตั้งค่า Resend

### 1. สมัคร Resend (ฟรี)

1. ไปที่ https://resend.com
2. คลิก "Sign Up" (ใช้ GitHub หรือ Google ได้)
3. ยืนยันอีเมล

### 2. สร้าง API Key

1. เข้า Dashboard: https://resend.com/api-keys
2. คลิก "Create API Key"
3. ตั้งชื่อ: `AOW-JobApp-Production`
4. เลือก Permission: **Full Access** (หรือ Sending access)
5. คลิก "Create"
6. **คัดลอก API Key** (จะแสดงครั้งเดียว!)

```
re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 3. เพิ่ม API Key ใน Environment Variables

#### สำหรับ Render:

1. ไปที่ Dashboard → เลือก Service
2. คลิก "Environment" tab
3. เพิ่ม Environment Variables:

```bash
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=AOW Job App <noreply@yourdomain.com>
```

4. คลิก "Save Changes"
5. Render จะ redeploy อัตโนมัติ

#### สำหรับ Local Development:

แก้ไขไฟล์ `backend/.env`:

```bash
# Resend API (แนะนำ - ใช้ได้ทั้ง local และ production)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=AOW Job App <noreply@yourdomain.com>

# SMTP Fallback (optional - สำหรับ development)
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
```

### 4. ตั้งค่า Domain (Optional แต่แนะนำ)

ถ้าคุณมี domain เป็นของตัวเอง:

1. ไปที่ https://resend.com/domains
2. คลิก "Add Domain"
3. กรอก domain ของคุณ (เช่น `aow-jobapp.com`)
4. เพิ่ม DNS Records ตามที่ Resend บอก:
   - SPF Record
   - DKIM Record
   - DMARC Record (optional)
5. รอ DNS propagate (5-30 นาที)
6. Verify domain

หลังจากนั้นเปลี่ยน `EMAIL_FROM`:

```bash
EMAIL_FROM=AOW Job App <noreply@aow-jobapp.com>
```

---

## 📊 Free Plan Limits

| Feature | Limit |
|---------|-------|
| Emails/month | 3,000 |
| Emails/day | 100 |
| API Calls | Unlimited |
| Domains | 1 |

**เพียงพอสำหรับ MVP และ Testing!** 🎉

---

## ✅ ทดสอบว่าใช้งานได้

### 1. ตรวจสอบ Environment Variables

```bash
# ใน backend directory
node -e "console.log(process.env.RESEND_API_KEY ? '✅ RESEND_API_KEY set' : '❌ RESEND_API_KEY missing')"
```

### 2. ทดสอบส่งอีเมล

ลองสมัครสมาชิกใหม่หรือขอรีเซ็ตรหัสผ่าน

ดู logs:
```bash
# Render
ดูใน Dashboard → Logs

# Local
ดูใน terminal ที่รัน npm start
```

ควรเห็น:
```
✅ Email sent via Resend: re_xxxxx
```

### 3. ตรวจสอบใน Resend Dashboard

1. ไปที่ https://resend.com/emails
2. ดูรายการอีเมลที่ส่ง
3. คลิกดูรายละเอียด (status, recipient, etc.)

---

## 🔄 Fallback System

ระบบจะลองส่งตามลำดับ:

1. **Resend API** (ถ้ามี `RESEND_API_KEY`)
2. **SMTP** (ถ้า Resend ล้มเหลว)
3. **Mock Mode** (ถ้าไม่มีทั้ง 2 อย่าง - development only)

---

## 🐛 Troubleshooting

### ❌ Error: "Invalid API key"

- ตรวจสอบว่า API Key ถูกต้อง
- ตรวจสอบว่าไม่มีช่องว่างหน้า/หลัง
- ลองสร้าง API Key ใหม่

### ❌ Error: "Domain not verified"

- ใช้ `onboarding@resend.dev` ใน `EMAIL_FROM` (สำหรับทดสอบ)
- หรือ verify domain ของคุณ

### ❌ ไม่ได้รับอีเมล

1. ตรวจสอบ Spam folder
2. ตรวจสอบใน Resend Dashboard ว่าส่งสำเร็จหรือไม่
3. ตรวจสอบ logs ใน Render/terminal

### ❌ Rate limit exceeded

- Free plan: 100 emails/day
- รอ 24 ชั่วโมงหรืออัปเกรด plan

---

## 💰 Pricing (ถ้าต้องการอัปเกรด)

| Plan | Price | Emails/month |
|------|-------|--------------|
| Free | $0 | 3,000 |
| Pro | $20 | 50,000 |
| Scale | Custom | Unlimited |

---

## 🔗 Resources

- Resend Docs: https://resend.com/docs
- API Reference: https://resend.com/docs/api-reference
- Node.js SDK: https://resend.com/docs/send-with-nodejs
- Status Page: https://status.resend.com

---

## 📝 สรุป

✅ สมัคร Resend (ฟรี)  
✅ สร้าง API Key  
✅ เพิ่ม `RESEND_API_KEY` ใน Environment Variables  
✅ Deploy/Restart service  
✅ ทดสอบส่งอีเมล  

**เสร็จแล้ว! 🎉**

---

## 🆘 ต้องการความช่วยเหลือ?

- Resend Discord: https://resend.com/discord
- Email: support@resend.com
- GitHub Issues: https://github.com/resendlabs/resend-node

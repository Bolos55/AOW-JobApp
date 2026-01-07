# วิธีรัน Development Server ด้วย HTTPS

## สำหรับทดสอบ Facebook Login ใน Development

### วิธีที่ 1: ใช้ HTTPS=true
```bash
# Windows
set HTTPS=true && npm start

# หรือใน PowerShell
$env:HTTPS="true"; npm start

# หรือใน package.json scripts
"start:https": "HTTPS=true react-scripts start"
```

### วิธีที่ 2: ใช้ .env
เพิ่มใน `.env`:
```
HTTPS=true
```

### วิธีที่ 3: ใช้ ngrok (แนะนำ)
```bash
# ติดตั้ง ngrok
npm install -g ngrok

# รัน frontend ปกติ
npm start

# ใน terminal ใหม่
ngrok http 3000
```

จากนั้นใช้ URL ที่ ngrok ให้มา (https://xxxxx.ngrok.io) แทน localhost

## หมายเหตุ:
- HTTPS=true จะใช้ self-signed certificate
- Browser อาจแสดง warning "Not secure" - กด "Advanced" → "Proceed"
- Facebook Login จะทำงานได้หลังจากยอมรับ certificate
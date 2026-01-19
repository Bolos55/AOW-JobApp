# 🧪 ทดสอบ API Endpoints

## 🎯 ปัญหา: Cannot GET /api/auth/firebase-google

**สาเหตุ:** Route นี้ต้องใช้ **POST** method ไม่ใช่ GET

## 🔍 ทดสอบ Endpoints ที่ถูกต้อง

### 1. Health Check (GET) ✅
```
GET https://aow-jobapp.onrender.com/api/health
```
**Expected:** `{"status":"ok",...}`

### 2. API Info (GET) ✅
```
GET https://aow-jobapp.onrender.com/api
```
**Expected:** `{"message":"AOW Job Platform API",...}`

### 3. Firebase Google Login (POST) ⚠️
```
POST https://aow-jobapp.onrender.com/api/auth/firebase-google
Content-Type: application/json

{
  "idToken": "FIREBASE_ID_TOKEN_HERE"
}
```
**Expected:** `{"message":"เข้าสู่ระบบด้วย Google สำเร็จ",...}`

### 4. Test Firebase Endpoint (GET) ✅
```
GET https://aow-jobapp.onrender.com/api/auth/test-firebase
```
**Expected:** Firebase configuration info

## 🛠️ วิธีทดสอบ

### ใน Browser (GET requests only):
- ✅ `/api/health`
- ✅ `/api`
- ✅ `/api/auth/test-firebase`

### ใน Postman/curl (POST requests):
```bash
curl -X POST https://aow-jobapp.onrender.com/api/auth/firebase-google \
  -H "Content-Type: application/json" \
  -d '{"idToken":"test"}'
```

## 🎯 สิ่งที่ควรเห็น

### ✅ Working Endpoints:
- `GET /api/health` → 200 OK
- `GET /api` → 200 OK
- `GET /api/auth/test-firebase` → 200 OK

### ⚠️ POST Only Endpoints:
- `POST /api/auth/firebase-google` → 200 OK (with valid data)
- `POST /api/auth/login` → 200 OK (with valid data)
- `POST /api/auth/register` → 200 OK (with valid data)

### ❌ Should Return 404:
- `GET /api/auth/firebase-google` → 404 (Method not allowed)
- `GET /api/auth/login` → 404 (Method not allowed)

## 🔧 แก้ไข Frontend

Frontend ต้องส่ง POST request ไม่ใช่ GET:

```javascript
// ✅ Correct
fetch('/api/auth/firebase-google', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ idToken })
})

// ❌ Wrong
fetch('/api/auth/firebase-google') // This is GET
```

---

**💡 สรุป:** Route ทำงานปกติ แต่คุณทดสอบด้วย GET method ที่ไม่ถูกต้อง
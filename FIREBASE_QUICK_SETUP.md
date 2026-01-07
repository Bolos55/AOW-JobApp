# Firebase Authentication - ทางลัดไม่ต้องใส่บัตรเครดิต

## 🚀 ขั้นตอนเร็ว (5 นาที):

### 1. ไปที่ Firebase Console
- [https://console.firebase.google.com/](https://console.firebase.google.com/)
- เข้าสู่ระบบด้วย Google

### 2. สร้างโปรเจค
- คลิก "Add project"
- ชื่อ: "JobApp Auth"
- ปิด Analytics
- คลิก "Create project"

### 3. เปิด Authentication
- ไปที่ "Authentication" → "Get started"
- Tab "Sign-in method"
- เปิด "Google" → "Enable" → "Save"

### 4. เพิ่ม Web App
- ไปที่ Project Settings (เฟือง)
- "Your apps" → Web icon (</>)
- ชื่อ: "JobApp Web"
- คลิก "Register app"

### 5. คัดลอก Config
```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "jobapp-xxx.firebaseapp.com",
  projectId: "jobapp-xxx",
  // ...
};
```

### 6. ติดตั้ง Firebase
```bash
npm install firebase
```

### 7. สร้างไฟล์ firebase.js
```javascript
// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  // ใส่ config ที่ได้
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
```

### 8. อัพเดต SocialLogin
```javascript
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

const handleGoogleLogin = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // ส่งไป backend
    const res = await fetch(`${API_BASE}/api/auth/firebase-google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: user.uid,
        email: user.email,
        name: user.displayName,
        photoURL: user.photoURL
      })
    });
    
    const data = await res.json();
    if (res.ok) onSuccess(data);
  } catch (error) {
    onError('Google login failed');
  }
};
```

## ✅ ข้อดี Firebase:
- ไม่ต้องใส่บัตรเครดิต
- Setup 5 นาที
- ฟรีตลอดไป
- รองรับหลาย provider
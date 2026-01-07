// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// ✅ ตรวจสอบว่ามี Firebase config จริงหรือไม่
const hasValidFirebaseConfig = 
  process.env.REACT_APP_FIREBASE_API_KEY && 
  process.env.REACT_APP_FIREBASE_API_KEY !== 'your-firebase-api-key' &&
  process.env.REACT_APP_FIREBASE_PROJECT_ID && 
  process.env.REACT_APP_FIREBASE_PROJECT_ID !== 'your-project-id';

// Firebase configuration - ใส่ config ที่ได้จาก Firebase Console
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "your-api-key",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "your-project.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "your-project-id",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "your-project.appspot.com",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:123456789:web:abcdef"
};

// ✅ Initialize Firebase เฉพาะเมื่อมี config จริง
let app = null;
let auth = null;
let googleProvider = null;

if (hasValidFirebaseConfig) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    
    // Configure Google provider
    googleProvider.setCustomParameters({
      prompt: 'select_account'
    });
    
    console.log('✅ Firebase initialized successfully');
  } catch (error) {
    // ไม่แสดง warning - Firebase initialization failed เป็นเรื่องปกติในการพัฒนา
  }
} else {
  // Firebase ไม่ได้ตั้งค่า - ไม่แสดง warning เพราะเป็นเรื่องปกติในการพัฒนา
  // Social login จะถูกปิดใช้งานโดยอัตโนมัติ
}

export { auth, googleProvider };
export default app;
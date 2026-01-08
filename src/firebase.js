// src/firebase.js
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// ✅ ตรวจสอบว่ามี Firebase config จริงหรือไม่
const hasValidFirebaseConfig = 
  process.env.REACT_APP_FIREBASE_API_KEY && 
  process.env.REACT_APP_FIREBASE_API_KEY !== 'your_firebase_api_key_here' &&
  process.env.REACT_APP_FIREBASE_PROJECT_ID && 
  process.env.REACT_APP_FIREBASE_PROJECT_ID !== 'your-project-id' &&
  process.env.REACT_APP_FIREBASE_AUTH_DOMAIN &&
  process.env.REACT_APP_FIREBASE_AUTH_DOMAIN !== 'your-project-id.firebaseapp.com';

// Firebase configuration - ใช้ environment variables เท่านั้น
const firebaseConfig = hasValidFirebaseConfig ? {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
} : null;

// ✅ Initialize Firebase เฉพาะเมื่อมี config จริง
let app = null;
let auth = null;
let googleProvider = null;

if (hasValidFirebaseConfig && firebaseConfig) {
  try {
    // ✅ Production-safe: ป้องกัน Firebase initialize ซ้ำ
    app = getApps().length === 0
      ? initializeApp(firebaseConfig)
      : getApps()[0];
    
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    
    // Configure Google provider
    googleProvider.setCustomParameters({
      prompt: 'select_account'
    });
    
    console.log('✅ Firebase initialized successfully');
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    // ไม่ log config ใน production เพื่อความปลอดภัย
    if (process.env.NODE_ENV === 'development') {
      console.error('🔧 Firebase config debug:', {
        hasApiKey: !!process.env.REACT_APP_FIREBASE_API_KEY,
        hasProjectId: !!process.env.REACT_APP_FIREBASE_PROJECT_ID,
        hasAuthDomain: !!process.env.REACT_APP_FIREBASE_AUTH_DOMAIN
      });
    }
  }
} else {
  console.log('⚠️ Firebase not configured - missing environment variables');
  // ใน development แสดง debug info
  if (process.env.NODE_ENV === 'development') {
    console.log('🔧 Environment check:', {
      REACT_APP_FIREBASE_API_KEY: process.env.REACT_APP_FIREBASE_API_KEY ? 'Present' : 'Missing',
      REACT_APP_FIREBASE_PROJECT_ID: process.env.REACT_APP_FIREBASE_PROJECT_ID ? 'Present' : 'Missing',
      REACT_APP_FIREBASE_AUTH_DOMAIN: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN ? 'Present' : 'Missing'
    });
  }
}

export { auth, googleProvider };
export default app;
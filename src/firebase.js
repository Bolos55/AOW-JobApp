// src/firebase.js
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// ✅ ตรวจสอบว่ามี Firebase config จริงหรือไม่ (Safe check)
const hasValidFirebaseConfig = 
  typeof import.meta !== 'undefined' &&
  import.meta.env &&
  import.meta.env.VITE_FIREBASE_API_KEY && 
  import.meta.env.VITE_FIREBASE_API_KEY !== 'your_firebase_api_key_here' &&
  import.meta.env.VITE_FIREBASE_PROJECT_ID && 
  import.meta.env.VITE_FIREBASE_PROJECT_ID !== 'your-project-id' &&
  import.meta.env.VITE_FIREBASE_AUTH_DOMAIN &&
  import.meta.env.VITE_FIREBASE_AUTH_DOMAIN !== 'your-project-id.firebaseapp.com';

// Firebase configuration - ใช้ environment variables เท่านั้น (Safe access)
const firebaseConfig = hasValidFirebaseConfig ? {
  apiKey: import.meta.env?.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env?.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env?.VITE_FIREBASE_APP_ID
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
    if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
      console.error('🔧 Firebase config debug:', {
        hasApiKey: !!(import.meta.env?.VITE_FIREBASE_API_KEY),
        hasProjectId: !!(import.meta.env?.VITE_FIREBASE_PROJECT_ID),
        hasAuthDomain: !!(import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN)
      });
    }
  }
} else {
  console.log('⚠️ Firebase not configured - missing environment variables');
  // ใน development แสดง debug info
  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
    console.log('🔧 Environment check:', {
      VITE_FIREBASE_API_KEY: import.meta.env?.VITE_FIREBASE_API_KEY ? 'Present' : 'Missing',
      VITE_FIREBASE_PROJECT_ID: import.meta.env?.VITE_FIREBASE_PROJECT_ID ? 'Present' : 'Missing',
      VITE_FIREBASE_AUTH_DOMAIN: import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN ? 'Present' : 'Missing'
    });
  }
}

export { auth, googleProvider };
export default app;
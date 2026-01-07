// src/firebase.js
import { initializeApp } from 'firebase/app';
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
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
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
    console.log('🔧 Firebase config check:', {
      hasApiKey: !!process.env.REACT_APP_FIREBASE_API_KEY,
      hasProjectId: !!process.env.REACT_APP_FIREBASE_PROJECT_ID,
      hasAuthDomain: !!process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
      authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN
    });
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    console.error('🔧 Firebase config used:', {
      apiKey: process.env.REACT_APP_FIREBASE_API_KEY ? `${process.env.REACT_APP_FIREBASE_API_KEY.substring(0, 10)}...` : 'Missing',
      authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
      storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.REACT_APP_FIREBASE_APP_ID ? `${process.env.REACT_APP_FIREBASE_APP_ID.substring(0, 10)}...` : 'Missing'
    });
  }
} else {
  console.log('⚠️ Firebase not configured - missing environment variables');
  console.log('🔧 Environment check:', {
    REACT_APP_FIREBASE_API_KEY: process.env.REACT_APP_FIREBASE_API_KEY ? 'Present' : 'Missing',
    REACT_APP_FIREBASE_PROJECT_ID: process.env.REACT_APP_FIREBASE_PROJECT_ID ? 'Present' : 'Missing',
    REACT_APP_FIREBASE_AUTH_DOMAIN: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN ? 'Present' : 'Missing'
  });
}

export { auth, googleProvider };
export default app;
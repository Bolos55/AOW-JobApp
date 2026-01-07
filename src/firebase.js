// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// ✅ ตรวจสอบว่ามี Firebase config จริงหรือไม่
const hasValidFirebaseConfig = 
  process.env.REACT_APP_FIREBASE_API_KEY && 
  process.env.REACT_APP_FIREBASE_API_KEY !== 'your_firebase_api_key_here' &&
  process.env.REACT_APP_FIREBASE_PROJECT_ID && 
  process.env.REACT_APP_FIREBASE_PROJECT_ID !== 'your-project-id';

// Firebase configuration - ใส่ config ที่ได้จาก Firebase Console
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyCpq_OYRG43zPRQlwAa85iWZBLOTntiGfc",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "jobapp-93cfa.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "jobapp-93cfa",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "jobapp-93cfa.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "935454716852",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:935454716852:web:0e2bf94092c9b17d1938e1"
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
      projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID
    });
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
  }
} else {
  console.log('⚠️ Firebase not configured - missing environment variables');
  console.log('🔧 Environment check:', {
    REACT_APP_FIREBASE_API_KEY: process.env.REACT_APP_FIREBASE_API_KEY ? 'Present' : 'Missing',
    REACT_APP_FIREBASE_PROJECT_ID: process.env.REACT_APP_FIREBASE_PROJECT_ID ? 'Present' : 'Missing'
  });
}

export { auth, googleProvider };
export default app;
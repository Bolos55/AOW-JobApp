// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// ✅ ตรวจสอบว่ามี Firebase config จริงหรือไม่
const hasValidFirebaseConfig = 
  import.meta.env.VITE_FIREBASE_API_KEY && 
  import.meta.env.VITE_FIREBASE_API_KEY !== 'your_firebase_api_key_here' &&
  import.meta.env.VITE_FIREBASE_PROJECT_ID && 
  import.meta.env.VITE_FIREBASE_PROJECT_ID !== 'your-project-id' &&
  import.meta.env.VITE_FIREBASE_AUTH_DOMAIN &&
  import.meta.env.VITE_FIREBASE_AUTH_DOMAIN !== 'your-project-id.firebaseapp.com';

// Firebase configuration - ใช้ environment variables เท่านั้น
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
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
    // console.log('🔧 Firebase config check:', { // ลบ detailed config log
    //   hasApiKey: !!import.meta.env.VITE_FIREBASE_API_KEY,
    //   hasProjectId: !!import.meta.env.VITE_FIREBASE_PROJECT_ID,
    //   hasAuthDomain: !!import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    //   projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    //   authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN
    // });
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    console.error('🔧 Firebase config used:', {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY ? `${import.meta.env.VITE_FIREBASE_API_KEY.substring(0, 10)}...` : 'Missing',
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID ? `${import.meta.env.VITE_FIREBASE_APP_ID.substring(0, 10)}...` : 'Missing'
    });
  }
} else {
  console.log('⚠️ Firebase not configured - missing environment variables');
  console.log('🔧 Environment check:', {
    VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY ? 'Present' : 'Missing',
    VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID ? 'Present' : 'Missing',
    VITE_FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ? 'Present' : 'Missing'
  });
}

export { auth, googleProvider };
export default app;
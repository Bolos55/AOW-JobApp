  // src/firebase.js
  import { initializeApp, getApps } from 'firebase/app';
  import { getAuth, GoogleAuthProvider } from 'firebase/auth';

  // Security: ห้าม hardcode ค่า sensitive data
  const PLACEHOLDER_VALUES = [
    'AIzaSyCpq_OYRG43zPRQlwAa85iWZBLOTntiGfc',
    'jobapp-93cfa',
    'jobapp-93cfa.firebaseapp.com',
    '935454716852',
    '1:935454716852:web:0e2bf94092c9b17d1938e1'
  ];

  // ✅ ตรวจสอบว่ามี Firebase config จริงหรือไม่
  const hasValidFirebaseConfig = () => {
    return (
      process.env.REACT_APP_FIREBASE_API_KEY &&
      process.env.REACT_APP_FIREBASE_PROJECT_ID &&
      process.env.REACT_APP_FIREBASE_AUTH_DOMAIN &&
      process.env.REACT_APP_FIREBASE_APP_ID
    );
  };

  // Firebase configuration - ใช้ environment variables เท่านั้น
  const getFirebaseConfig = () => {
    if (!hasValidFirebaseConfig()) return null;
    
    return {
      apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
      authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
      storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.REACT_APP_FIREBASE_APP_ID,
      measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
    };
  };

  // Initialize Firebase function
  const initFirebase = () => {
    const firebaseConfig = getFirebaseConfig();
    
    if (!firebaseConfig) {
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.log('⚠️ Firebase not configured - missing environment variables');
      }
      return { app: null, auth: null, googleProvider: null };
    }

    try {
      // ✅ Production-safe: ป้องกัน Firebase initialize ซ้ำ
      const app = getApps().length === 0
        ? initializeApp(firebaseConfig)
        : getApps()[0];
      
      const auth = getAuth(app);
      const googleProvider = new GoogleAuthProvider();
      
      // Configure Google provider
      googleProvider.setCustomParameters({
        prompt: 'select_account'
      });
      
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Firebase initialized successfully');
      }
      
      return { app, auth, googleProvider };
    } catch (error) {
      console.error('❌ Firebase initialization failed:', error);
      return { app: null, auth: null, googleProvider: null };
    }
  };

  // Initialize Firebase
  const { app, auth, googleProvider } = initFirebase();

  // Null-safe exports
  export { auth, googleProvider };
  export default app;
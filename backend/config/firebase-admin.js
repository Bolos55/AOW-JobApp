// backend/config/firebase-admin.js
import admin from 'firebase-admin';

// ✅ Initialize Firebase Admin SDK
let firebaseApp;

const initializeFirebaseAdmin = () => {
  if (firebaseApp) {
    return firebaseApp;
  }

  try {
    // For production: Use service account key file
    if (process.env.NODE_ENV === 'production' && process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID
      });
      
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Firebase Admin initialized with service account');
      }
    } 
    // For development: Use project ID only (requires Firebase CLI auth)
    else if (process.env.FIREBASE_PROJECT_ID) {
      firebaseApp = admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID
      });
      
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Firebase Admin initialized with project ID');
      }
    } 
    else {
      throw new Error('Firebase configuration missing. Set FIREBASE_PROJECT_ID or FIREBASE_SERVICE_ACCOUNT_KEY');
    }

    return firebaseApp;
  } catch (error) {
    console.error('❌ Firebase Admin initialization failed:', error.message);
    throw error;
  }
};

// ✅ Verify Firebase ID Token
export const verifyFirebaseToken = async (idToken) => {
  try {
    if (!firebaseApp) {
      initializeFirebaseAdmin();
    }

    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    return {
      success: true,
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email,
        name: decodedToken.name,
        picture: decodedToken.picture,
        emailVerified: decodedToken.email_verified,
        provider: decodedToken.firebase.sign_in_provider
      }
    };
  } catch (error) {
    console.error('❌ Firebase token verification failed:', error.message);
    
    return {
      success: false,
      error: error.code || 'INVALID_TOKEN',
      message: error.message
    };
  }
};

// Initialize only when needed, not on import
// initializeFirebaseAdmin();

export default firebaseApp;
// src/components/SocialLogin.jsx
import { useEffect, useCallback } from 'react';
import { signInWithPopup, getRedirectResult } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { API_BASE } from '../api';

export default function SocialLogin({ onSuccess, onError }) {
  
  // ตรวจสอบว่ามี Firebase config จริงหรือไม่ และ Firebase objects พร้อมใช้งาน
  const hasFirebaseConfig = process.env.REACT_APP_FIREBASE_API_KEY && 
    process.env.REACT_APP_FIREBASE_API_KEY !== 'your_firebase_api_key_here' &&
    process.env.REACT_APP_FIREBASE_PROJECT_ID && 
    process.env.REACT_APP_FIREBASE_PROJECT_ID !== 'your-project-id' &&
    process.env.REACT_APP_FIREBASE_AUTH_DOMAIN &&
    process.env.REACT_APP_FIREBASE_AUTH_DOMAIN !== 'your-project-id.firebaseapp.com' &&
    auth && googleProvider;

  // Helper function สำหรับจัดการ Firebase user
  const handleFirebaseUser = useCallback(async (user) => {
    try {
      console.log('🔄 Processing Firebase user:', user.email);
      console.log('📋 Firebase user data:', {
        uid: user.uid,
        email: user.email,
        name: user.displayName,
        photoURL: user.photoURL,
        emailVerified: user.emailVerified
      });
      
      console.log('📡 Sending request to backend...');
      console.log('🌐 Request details:', {
        url: `${API_BASE}/api/auth/firebase-google`,
        origin: window.location.origin,
        method: 'POST'
      });
      
      // ส่งข้อมูลไป backend
      const res = await fetch(`${API_BASE}/api/auth/firebase-google`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Origin': window.location.origin
        },
        mode: 'cors', // ✅ ระบุ CORS mode ชัดเจน
        body: JSON.stringify({
          uid: user.uid,
          email: user.email,
          name: user.displayName,
          photoURL: user.photoURL,
          emailVerified: user.emailVerified
        })
      });
      
      console.log('📥 Backend response status:', res.status);
      console.log('📥 Backend response headers:', Object.fromEntries(res.headers.entries()));
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('❌ Backend error response:', errorText);
        
        // ตรวจสอบ CORS error
        if (res.status === 0 || errorText.includes('CORS')) {
          onError(`🚫 CORS Error\n\nOrigin: ${window.location.origin}\nBackend: ${API_BASE}\n\nแก้ไข:\n1. ใช้ http://localhost:3000 แทน\n2. หรือแก้ CORS บน Render`);
        } else {
          onError(`Backend error (${res.status}): ${errorText}`);
        }
        return;
      }
      
      const data = await res.json();
      console.log('📥 Backend response data:', data);
      
      // ✅ ตรวจสอบว่าเป็นผู้ใช้ใหม่ที่ต้องเลือก role หรือไม่
      if (data.newUser && data.needsRoleSelection) {
        console.log('👤 New user needs role selection, redirecting...');
        
        // ✅ Redirect ไปหน้าเลือก role พร้อมข้อมูล social
        const redirectData = {
          socialData: data.socialData,
          provider: data.provider
        };
        
        window.location.href = `/role-selection?data=${encodeURIComponent(JSON.stringify(redirectData))}`;
        return;
      }
      
      // ✅ ผู้ใช้เก่าหรือเสร็จสิ้นการเลือก role แล้ว
      if (!data || !data.user || !data.token) {
        console.error('❌ Invalid backend response structure:', data);
        onError('Invalid response from server');
        return;
      }
      
      console.log('✅ Firebase login successful, calling onSuccess with:', {
        user: data.user,
        token: data.token ? 'Present' : 'Missing'
      });
      
      onSuccess(data);
      
    } catch (err) {
      console.error('❌ Network/Parse error:', err);
      
      // ตรวจสอบ CORS error
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        onError(`🚫 Network/CORS Error\n\nOrigin: ${window.location.origin}\nBackend: ${API_BASE}\n\nแก้ไข:\n1. ใช้ http://localhost:3000 แทน\n2. หรือรัน backend locally\n3. หรือแก้ CORS บน Render\n\nError: ${err.message}`);
      } else {
        onError(`Network error: ${err.message}`);
      }
    }
  }, [onSuccess, onError]);

  // ตรวจสอบ redirect result เมื่อ component โหลด
  useEffect(() => {
    // ถ้า Firebase ไม่ได้ตั้งค่า ไม่ต้องทำอะไร
    if (!hasFirebaseConfig) return;
    
    const checkRedirectResult = async () => {
      try {
        console.log('🔍 Checking Firebase redirect result...');
        const result = await getRedirectResult(auth);
        if (result) {
          console.log('✅ Firebase redirect result found:', result.user.email);
          const user = result.user;
          await handleFirebaseUser(user);
        } else {
          console.log('ℹ️ No Firebase redirect result');
        }
      } catch (error) {
        console.log('⚠️ Firebase redirect result error:', error.message);
        
        // จัดการ error เฉพาะ
        if (error.code === 'auth/unauthorized-domain') {
          onError(`🚫 Domain ไม่ได้รับอนุญาต\n\nกรุณาเพิ่ม "${window.location.hostname}" ใน Firebase Console:\nAuthentication → Settings → Authorized domains`);
        } else if (error.code && !error.code.includes('auth/no-auth-event')) {
          onError('เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย Google');
        }
      }
    };

    checkRedirectResult();
  }, [hasFirebaseConfig, handleFirebaseUser, onError]);

  // Firebase Google Login
  const handleFirebaseGoogleLogin = async () => {
    console.log('🚀 Starting Google Login...');
    
    // ✅ ตรวจสอบ Firebase config ก่อนทำงาน
    if (!hasFirebaseConfig || !auth || !googleProvider) {
      console.log('❌ Firebase not configured properly');
      console.log('🔍 Debug info:', {
        hasFirebaseConfig,
        hasAuth: !!auth,
        hasGoogleProvider: !!googleProvider,
        envVarsPresent: {
          API_KEY: !!process.env.REACT_APP_FIREBASE_API_KEY,
          PROJECT_ID: !!process.env.REACT_APP_FIREBASE_PROJECT_ID,
          AUTH_DOMAIN: !!process.env.REACT_APP_FIREBASE_AUTH_DOMAIN
        }
      });
      
      // แสดง error message ที่ชัดเจน
      const envCheck = {
        REACT_APP_FIREBASE_API_KEY: process.env.REACT_APP_FIREBASE_API_KEY,
        REACT_APP_FIREBASE_PROJECT_ID: process.env.REACT_APP_FIREBASE_PROJECT_ID,
        REACT_APP_FIREBASE_AUTH_DOMAIN: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
        REACT_APP_FIREBASE_STORAGE_BUCKET: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
        REACT_APP_FIREBASE_MESSAGING_SENDER_ID: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
        REACT_APP_FIREBASE_APP_ID: process.env.REACT_APP_FIREBASE_APP_ID
      };
      
      const missingVars = [];
      // ตรวจสอบแต่ละตัวแปร
      Object.entries(envCheck).forEach(([key, value]) => {
        if (!value || value === 'your_firebase_api_key_here' || value === 'your-project-id' || value === 'your-project-id.firebaseapp.com' || value === 'your_messaging_sender_id' || value === 'your_firebase_app_id') {
          missingVars.push(key);
        }
      });
      
      console.log('🔍 Environment Variables Check:', envCheck);
      console.log('❌ Missing Variables:', missingVars);
      
      // ตรวจสอบสาเหตุที่แท้จริง
      let rootCause = '';
      if (missingVars.length > 0) {
        rootCause = 'Environment Variables ขาดหายไป';
      } else if (!auth || !googleProvider) {
        rootCause = 'Firebase initialization ล้มเหลว - ตรวจสอบ browser console สำหรับ Firebase errors';
      } else {
        rootCause = 'Firebase validation logic ผิดพลาด';
      }
      
      onError(`🔧 Firebase ยังไม่ได้ตั้งค่า

🔍 สาเหตุ: ${rootCause}

❌ Environment Variables ที่ขาดหายไป:
${missingVars.length > 0 ? missingVars.map(v => `• ${v}`).join('\n') : '• ไม่มีตัวแปรที่ขาดหายไป'}

🔍 ตรวจสอบปัจจุบัน:
${Object.entries(envCheck).map(([key, value]) => `• ${key}: ${value ? 'มี' : 'ไม่มี'}`).join('\n')}

🔧 สถานะ Firebase Objects:
• Firebase Auth: ${auth ? 'พร้อมใช้งาน' : 'ไม่พร้อม'}
• Google Provider: ${googleProvider ? 'พร้อมใช้งาน' : 'ไม่พร้อม'}

📋 วิธีแก้ไข:
${missingVars.length > 0 ? 
  '1. เพิ่ม Firebase environment variables ใน hosting platform (Render)' : 
  '1. ตรวจสอบ Firebase Console logs และ browser console'
}
2. ตั้งค่า Authorized Domains ใน Firebase Console
3. เพิ่ม domain "${window.location.hostname}" ใน Firebase Authorized domains
4. Redeploy application

🔗 ดูคู่มือเพิ่มเติม: FIREBASE_PRODUCTION_SETUP.md`);
      return;
    }

    try {
      // ลอง popup ก่อน (เร็วกว่า redirect)
      console.log('🔄 Attempting signInWithPopup...');
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      console.log('✅ signInWithPopup successful:', user.email);
      console.log('📋 User object:', {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL
      });
      
      // ⭐ ส่งข้อมูลไปยัง handleFirebaseUser ทันที
      await handleFirebaseUser(user);
      
    } catch (error) {
      console.error('❌ signInWithPopup failed:', error);
      
      // จัดการ error เฉพาะ
      if (error.code === 'auth/unauthorized-domain') {
        onError(`🚫 Domain ไม่ได้รับอนุญาต\n\nเว็บไซต์รันจาก: ${window.location.origin}\n\nวิธีแก้ไข:\n1. เปิด Firebase Console\n2. ไป Authentication → Settings → Authorized domains\n3. เพิ่ม "${window.location.hostname}"`);
      } else if (error.code === 'auth/popup-closed-by-user') {
        onError('การเข้าสู่ระบบถูกยกเลิก');
      } else if (error.code === 'auth/popup-blocked') {
        onError('Popup ถูกบล็อก กรุณาอนุญาต popup สำหรับเว็บไซต์นี้');
      } else {
        console.log('🔄 Popup failed, trying redirect...');
        // ถ้า popup ไม่ได้ ลอง redirect
        try {
          const { signInWithRedirect } = await import('firebase/auth');
          await signInWithRedirect(auth, googleProvider);
          console.log('✅ signInWithRedirect initiated');
        } catch (redirectError) {
          console.error('❌ Both popup and redirect failed:', redirectError);
          onError(`เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย Google\n\nError: ${error.message}`);
        }
      }
    }
  };

  // GitHub Login
  const handleGitHubLogin = () => {
    console.log('🚀 Starting GitHub Login...');
    
    // Redirect ไปที่ backend GitHub OAuth endpoint
    const apiBase = process.env.REACT_APP_API_BASE || API_BASE;
    const githubAuthUrl = `${apiBase}${apiBase.endsWith('/api') ? '' : '/api'}/auth/github`;
    
    console.log('🔗 Redirecting to:', githubAuthUrl);
    window.location.href = githubAuthUrl;
  };

  return (
    <div className="space-y-3">
      {/* Firebase Google Login Button */}
      {/* ✅ เปิดปุ่ม Google Login ให้กดได้เสมอ แต่แสดง error ถ้าไม่มี config */}
      <button
        onClick={handleFirebaseGoogleLogin}
        className="w-full flex items-center justify-center gap-3 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        <span className="text-gray-700 font-medium">
          เข้าสู่ระบบด้วย Google
          {!hasFirebaseConfig && <span className="text-xs text-red-500 ml-1">(ตั้งค่าไม่ครบ)</span>}
        </span>
      </button>

      {/* GitHub Login Button */}
      <button
        onClick={handleGitHubLogin}
        className="w-full flex items-center justify-center gap-3 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.30.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
        </svg>
        <span className="font-medium">เข้าสู่ระบบด้วย GitHub</span>
      </button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">หรือ</span>
        </div>
      </div>
    </div>
  );
}
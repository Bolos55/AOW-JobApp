// src/components/SocialLogin.jsx
import { useEffect, useCallback } from 'react';
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { API_BASE } from '../api';

export default function SocialLogin({ onSuccess, onError }) {
  // 🔑 แหล่งความจริงเดียวของ Firebase
  const isFirebaseReady = !!auth && !!googleProvider;

  // ===============================
  // ส่ง Firebase ID Token ไป backend (SECURE)
  // ===============================
  const handleFirebaseUser = useCallback(
    async (user) => {
      try {
        // ✅ Get Firebase ID Token (SECURE)
        const idToken = await user.getIdToken();
        
        const apiUrl = `${API_BASE}/api/auth/firebase-google`.replace(
          /\/api\/api\//,
          '/api/'
        );

        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          mode: 'cors',
          body: JSON.stringify({
            idToken // ✅ Send ID Token instead of user data
          }),
        });

        if (!res.ok) {
          const text = await res.text();
          onError(`Backend error (${res.status}): ${text}`);
          return;
        }

        const data = await res.json();

        // ผู้ใช้ใหม่ ต้องเลือก role
        if (data?.newUser && data?.needsRoleSelection) {
          const redirectData = {
            socialData: data.socialData,
            provider: data.provider,
          };
          window.location.href = `/role-selection?data=${encodeURIComponent(
            JSON.stringify(redirectData)
          )}`;
          return;
        }

        if (!data?.user || !data?.token) {
          onError('Invalid response from server');
          return;
        }

        onSuccess(data);
      } catch (err) {
        onError(`Network error: ${err.message}`);
      }
    },
    [onSuccess, onError]
  );

  // ===============================
  // รองรับกรณี signInWithRedirect
  // ===============================
  useEffect(() => {
    if (!isFirebaseReady) return;

    let cancelled = false;

    const checkRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (!cancelled && result?.user) {
          await handleFirebaseUser(result.user);
        }
      } catch (err) {
        if (err.code === 'auth/unauthorized-domain') {
          onError(
            `🚫 Domain ไม่ได้รับอนุญาต\n\nกรุณาเพิ่ม "${window.location.hostname}" ใน Firebase Console`
          );
        }
      }
    };

    checkRedirect();
    return () => {
      cancelled = true;
    };
  }, [isFirebaseReady, handleFirebaseUser, onError]);

  // ===============================
  // Google Login
  // ===============================
  const handleGoogleLogin = async () => {
    if (!isFirebaseReady) {
      onError('Firebase Auth ยังไม่พร้อมใช้งาน');
      return;
    }

    try {
      const result = await signInWithPopup(auth, googleProvider);
      await handleFirebaseUser(result.user);
    } catch (error) {
      if (error.code === 'auth/popup-closed-by-user') {
        onError('การเข้าสู่ระบบถูกยกเลิก');
      } else if (error.code === 'auth/popup-blocked') {
        onError('Popup ถูกบล็อก กรุณาอนุญาต popup สำหรับเว็บไซต์นี้');
      } else if (error.code === 'auth/unauthorized-domain') {
        onError(
          `🚫 Domain ไม่ได้รับอนุญาต\nกรุณาเพิ่ม "${window.location.hostname}" ใน Firebase Authorized domains`
        );
      } else {
        // fallback เป็น redirect
        try {
          await signInWithRedirect(auth, googleProvider);
        } catch (e) {
          onError(`Google login failed: ${e.message}`);
        }
      }
    }
  };

  return (
    <div className="space-y-3">
      {/* Google Login */}
      <button
        onClick={handleGoogleLogin}
        className="w-full flex items-center justify-center gap-3 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        <span className="font-medium text-gray-700">
          เข้าสู่ระบบด้วย Google
          {!isFirebaseReady && (
            <span className="ml-1 text-xs text-red-500">
              (Firebase ยังไม่พร้อม)
            </span>
          )}
        </span>
      </button>
    </div>
  );
}

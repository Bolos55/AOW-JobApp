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
  // ส่งข้อมูล Firebase user ไป backend
  // ===============================
  const handleFirebaseUser = useCallback(
    async (user) => {
      try {
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
            uid: user.uid,
            email: user.email,
            name: user.displayName,
            photoURL: user.photoURL,
            emailVerified: user.emailVerified,
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

  // ===============================
  // GitHub Login
  // ===============================
  const handleGitHubLogin = () => {
    window.location.href = `${API_BASE}/api/auth/github`;
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

      {/* GitHub Login */}
      <button
        onClick={handleGitHubLogin}
        className="w-full flex items-center justify-center gap-3 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
        </svg>
        <span className="font-medium">เข้าสู่ระบบด้วย GitHub</span>
      </button>
    </div>
  );
}

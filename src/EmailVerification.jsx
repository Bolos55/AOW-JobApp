// src/EmailVerification.jsx
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { API_BASE } from "./api";

export default function EmailVerification() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('');
  const [userInfo, setUserInfo] = useState(null);

  const verifyEmail = useCallback(async () => {
    try {
      setStatus('verifying');
      
      const res = await fetch(`${API_BASE}/api/auth/verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus('success');
        setMessage(data.message);
        setUserInfo(data.user);
        
        // ✅ เก็บ token และ user data เพื่อเข้าสู่ระบบทันที
        if (data.token && data.user) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          
          // ✅ Dispatch event เพื่อให้ App.js อัปเดต auth state
          window.dispatchEvent(new Event('auth-change'));
          
          // ✅ Redirect หลังจาก 3 วินาที
          setTimeout(() => {
            navigate('/', { replace: true });
          }, 3000);
        }
      } else {
        setStatus('error');
        setMessage(data.message);
      }
    } catch (err) {
      setStatus('error');
      setMessage('เกิดข้อผิดพลาดในการยืนยันอีเมล');
      console.error('Email verification error:', err);
    }
  }, [token, navigate]);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('ไม่พบโทเคนยืนยัน');
      return;
    }

    verifyEmail();
  }, [token, verifyEmail]);

  const handleGoToLogin = () => {
    navigate('/login', { replace: true });
  };

  const handleGoToHome = () => {
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center px-4">
      <div className="bg-white/95 rounded-3xl shadow-2xl max-w-md w-full p-8 text-center">
        
        {/* Loading State */}
        {status === 'verifying' && (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">กำลังยืนยันอีเมล...</h2>
            <p className="text-sm text-gray-600">กรุณารอสักครู่</p>
          </>
        )}

        {/* Success State */}
        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-green-600 mb-2">ยืนยันอีเมลสำเร็จ! 🎉</h2>
            <p className="text-sm text-gray-600 mb-4">{message}</p>
            
            {userInfo && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 text-left">
                <h3 className="font-semibold text-green-800 mb-2">ข้อมูลบัญชีของคุณ</h3>
                <p className="text-sm text-green-700"><strong>ชื่อ:</strong> {userInfo.name}</p>
                <p className="text-sm text-green-700"><strong>อีเมล:</strong> {userInfo.email}</p>
                <p className="text-sm text-green-700"><strong>สถานะ:</strong> {userInfo.role === 'employer' ? 'นายจ้าง' : 'ผู้หางาน'}</p>
              </div>
            )}
            
            <div className="space-y-3">
              <p className="text-sm text-gray-600">กำลังเข้าสู่ระบบอัตโนมัติ...</p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full animate-pulse" style={{width: '100%'}}></div>
              </div>
              <button
                onClick={handleGoToHome}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-2.5 rounded-xl text-sm font-medium hover:from-green-700 hover:to-green-800"
              >
                เข้าสู่ระบบทันที
              </button>
            </div>
          </>
        )}

        {/* Error State */}
        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-red-600 mb-2">ยืนยันอีเมลไม่สำเร็จ</h2>
            <p className="text-sm text-gray-600 mb-4">{message}</p>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-red-800 mb-2">สาเหตุที่เป็นไปได้</h3>
              <ul className="text-sm text-red-700 text-left space-y-1">
                <li>• ลิงก์หมดอายุแล้ว (เกิน 24 ชั่วโมง)</li>
                <li>• ลิงก์ถูกใช้งานไปแล้ว</li>
                <li>• ลิงก์ไม่ถูกต้องหรือเสียหาย</li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={handleGoToLogin}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2.5 rounded-xl text-sm font-medium hover:from-blue-700 hover:to-purple-700"
              >
                กลับไปหน้าเข้าสู่ระบบ
              </button>
              <p className="text-xs text-gray-500">
                หากต้องการลิงก์ยืนยันใหม่ กรุณาติดต่อแอดมิน
              </p>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            AOW Job App - ระบบหางานและรับสมัครงานออนไลน์
          </p>
        </div>
      </div>
    </div>
  );
}
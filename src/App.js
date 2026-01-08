// src/App.js
import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ChatsPage from "./ChatsPage";
import LoginPage from "./LoginPage";
import JobSearchApp from "./JobSearchApp";
import ForgotPassword from "./ForgotPassword";
import ResetPassword from "./ResetPassword";
import EmailVerification from "./EmailVerification";
import RoleSelection from "./RoleSelection";
import PaymentStatusDemo from "./components/PaymentStatusDemo";
import CookieConsent from "./components/CookieConsent";
import ErrorBoundary from "./components/ErrorBoundary";
import { useOnlineStatus } from "./hooks/useOnlineStatus";

function useAuthUser() {
  const read = () => {
    try {
      const userData = JSON.parse(localStorage.getItem("user") || "null");
      // console.log('👤 useAuthUser read:', userData ? `${userData.name} (${userData.email})` : 'No user');
      return userData;
    } catch (e) {
      console.log('❌ useAuthUser read error:', e.message);
      return null;
    }
  };

  const [user, setUser] = useState(read);

  useEffect(() => {
    const onChange = () => {
      console.log('🔄 Auth change event triggered, re-reading user...');
      const newUser = read();
      console.log('📝 Setting new user state:', newUser ? `${newUser.name}` : 'null');
      setUser(newUser);
    };
    
    // ⭐ เพิ่ม event listeners หลายตัว
    window.addEventListener("storage", onChange);
    window.addEventListener("auth-change", onChange);
    
    // ⭐ ลบ manual check ที่ทำให้ช้า - ใช้ event listeners แทน
    // const interval = setInterval(() => {
    //   const currentUser = read();
    //   if (currentUser && !user) {
    //     console.log('🔄 Manual check found user, updating state...');
    //     setUser(currentUser);
    //   }
    // }, 1000);
    
    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener("auth-change", onChange);
      // clearInterval(interval); // ลบแล้ว
    };
  }, [user]);

  // ⭐ Log current state
  // console.log('🎯 useAuthUser current state:', user ? `${user.name}` : 'null');
  
  return user;
}

function RequireAuth({ children }) {
  const token = localStorage.getItem("token");
  const user = localStorage.getItem("user");
  
  // console.log('🔐 RequireAuth check:', {
  //   hasToken: !!token,
  //   hasUser: !!user,
  //   tokenLength: token ? token.length : 0,
  //   userEmail: user ? JSON.parse(user)?.email : 'No email'
  // });
  
  // ⭐ ถ้ามี token แต่ไม่มี user ให้รอสักครู่
  if (token && !user) {
    // console.log('⏳ Has token but no user, waiting...');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    );
  }
  
  if (!token) {
    // console.log('❌ No token, redirecting to login');
    return <Navigate to="/login" replace />;
  }
  
  // console.log('✅ Auth check passed, rendering children');
  return children;
}

export default function App() {
  const user = useAuthUser();
  
  // เรียก Hook เสมอ แต่ใช้ condition ภายใน Hook
  useOnlineStatus(user); // ส่ง user เป็น parameter

  // ลบ handleLogout ออกเพราะไม่ได้ใช้ในที่นี่
  // handleLogout จะอยู่ใน component ที่ต้องการใช้จริง

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          {/* หน้าแรก: ต้องล็อกอินก่อน */}
          <Route
            path="/"
            element={
              <RequireAuth>
                <JobSearchApp user={user} />
              </RequireAuth>
            }
          />

          {/* หน้าแชท */}
          <Route
            path="/chats"
            element={
              <RequireAuth>
                <ChatsPage user={user} />
              </RequireAuth>
            }
          />

          {/* หน้า login */}
          <Route 
            path="/login" 
            element={
              <LoginPage 
                onAuth={(user, token) => {
                  console.log('🎯 App.js onAuth callback triggered:', user.email);
                  
                  // ⭐ Force re-read user state หลัง login สำเร็จ
                  window.dispatchEvent(new Event("auth-change"));
                  
                  // ⭐ Manual trigger หลังจาก delay เล็กน้อย
                  setTimeout(() => {
                    console.log('🔄 Manual auth-change trigger after delay');
                    window.dispatchEvent(new Event("auth-change"));
                  }, 100);
                }}
              />
            } 
          />

          {/* ✅ ลืมรหัสผ่าน (ไม่ต้องล็อกอิน) */}
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* ✅ ตั้งรหัสผ่านใหม่ (รับ token จาก URL) */}
          <Route path="/reset-password/:token" element={<ResetPassword />} />

          {/* ✅ ยืนยันอีเมล (รับ token จาก URL) */}
          <Route path="/verify-email/:token" element={<EmailVerification />} />

          {/* ✅ เลือก Role สำหรับ Social Login */}
          <Route path="/role-selection" element={<RoleSelection />} />

          {/* 🧪 ทดสอบระบบ Payment Status Check */}
          <Route path="/payment-demo" element={<PaymentStatusDemo />} />

          {/* กันหลงทาง */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        
        {/* Cookie Consent Banner */}
        <CookieConsent />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

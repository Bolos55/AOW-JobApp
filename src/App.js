// src/App.js
import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ChatsPage from "./ChatsPage";
import LoginPage from "./LoginPage";
import JobSearchApp from "./JobSearchApp";
import PublicJobView from "./PublicJobView";
import ForgotPassword from "./ForgotPassword";
import ResetPassword from "./ResetPassword";
import EmailVerification from "./EmailVerification";
import RoleSelection from "./RoleSelection";
import CookieConsent from "./components/CookieConsent";
import ErrorBoundary from "./components/ErrorBoundary";
import { useOnlineStatus } from "./hooks/useOnlineStatus";

function useAuthUser() {
  const read = () => {
    try {
      const userData = JSON.parse(localStorage.getItem("user") || "null");
      return userData;
    } catch (e) {
      return null;
    }
  };

  const [user, setUser] = useState(read);

  useEffect(() => {
    const onChange = () => {
      const newUser = read();
      setUser(newUser);
    };
    
    window.addEventListener("storage", onChange);
    window.addEventListener("auth-change", onChange);
    
    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener("auth-change", onChange);
    };
  }, [user]);
  
  return user;
}

function RequireAuth({ children }) {
  const token = localStorage.getItem("token");
  const user = localStorage.getItem("user");
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">กำลังโหลดข้อมูลผู้ใช้...</p>
        </div>
      </div>
    );
  }
  
  try {
    const userData = JSON.parse(user);
    if (!userData || !userData.email) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      return <Navigate to="/login" replace />;
    }
  } catch (e) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    return <Navigate to="/login" replace />;
  }
  
  return children;
}

export default function App() {
  const user = useAuthUser();
  
  // เรียก Hook เสมอ แต่ใช้ condition ภายใน Hook
  useOnlineStatus(user); // ส่ง user เป็น parameter

  // ตรวจสอบว่ามี ?job= parameter หรือไม่
  const params = new URLSearchParams(window.location.search);
  const hasJobParam = params.has('job');

  // ลบ handleLogout ออกเพราะไม่ได้ใช้ในที่นี่
  // handleLogout จะอยู่ใน component ที่ต้องการใช้จริง

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          {/* หน้าแรก: ถ้ามี ?job= และไม่ได้ล็อกอิน แสดง PublicJobView */}
          <Route
            path="/"
            element={
              hasJobParam && !user ? (
                <PublicJobView />
              ) : (
                <RequireAuth>
                  <JobSearchApp user={user} />
                </RequireAuth>
              )
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
                  window.dispatchEvent(new Event("auth-change"));
                  
                  setTimeout(() => {
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

          {/* กันหลงทาง */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        
        {/* Cookie Consent Banner */}
        <CookieConsent />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

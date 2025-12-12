// src/App.jsx
import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ChatsPage from "./ChatsPage";
import LoginPage from "./LoginPage";
import JobSearchApp from "./JobSearchApp"; 
import ForgotPasswordPage from "./ForgotPasswordPage";
import ResetPassword from "./ResetPassword"; 


function useAuthUser() {
  const read = () => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  };

  const [user, setUser] = useState(read);

  useEffect(() => {
    const onChange = () => setUser(read());
    window.addEventListener("storage", onChange);
    window.addEventListener("auth-change", onChange);
    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener("auth-change", onChange);
    };
  }, []);

  return user;
}

function RequireAuth({ children }) {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const user = useAuthUser();

  return (
    <BrowserRouter>
      <Routes>
        {/* หน้าแรก: ต้องล็อกอินก่อน แล้วให้ JobSearchApp จัดการต่อ (ภายในแยก role เอง) */}
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
        <Route path="/login" element={<LoginPage />} />

        {/* กันหลงทาง */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

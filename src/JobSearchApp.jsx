// src/JobSearchApp.jsx
import React, { useEffect, useState } from "react";
import LoginPage from "./LoginPage";
import JobSeekerView from "./JobSeekerView";
import EmployerView from "./EmployerView";
import AdminView from "./AdminView";
import { API_BASE } from "./api";

export default function JobSearchApp() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // โหลด user จาก localStorage / backend ก็ได้
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        setUser(null);
      }
    }
    setLoading(false);
  }, []);

  // เวลาล็อกอินสำเร็จจาก LoginPage
  const handleAuthSuccess = (userFromServer, token) => {
    setUser(userFromServer);
    if (token) {
      localStorage.setItem("token", token);
    }
    localStorage.setItem("user", JSON.stringify(userFromServer));
  };

  // ออกจากระบบ (ใช้ร่วมกันทุก role)
  const handleLogout = () => {
    setUser(null);
    try {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      localStorage.removeItem("chat:lastOpen");
      localStorage.removeItem("chat:lastThread");
      sessionStorage.clear();
      document.cookie.split(";").forEach((c) => {
        const eqPos = c.indexOf("=");
        const name = eqPos > -1 ? c.substr(0, eqPos) : c;
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      });
      window.dispatchEvent(new Event("auth-change"));
    } catch (e) {
      console.error("logout error", e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">กำลังโหลด...</p>
      </div>
    );
  }

  // ยังไม่ได้ล็อกอิน → ไปหน้า Login
  if (!user) {
    return <LoginPage onAuth={handleAuthSuccess} />;
  }

  // ป้องกันตัวสะกด role แปลก ๆ
  const role = (user.role || "").toLowerCase();

  // admin
  if (role === "admin") {
    return <AdminView user={user} onLogout={handleLogout} />;
  }

  // employer
  if (role === "employer") {
    return <EmployerView user={user} onLogout={handleLogout} />;
  }

  // ที่เหลือให้เป็นผู้หางาน (jobseeker) เป็น default
  return <JobSeekerView user={user} onLogout={handleLogout} />;
}

// src/JobSearchApp.jsx
import { useEffect, useState } from "react";
import LoginPage from "./LoginPage";
import JobSeekerView from "./JobSeekerView";
import EmployerView from "./EmployerView";
import AdminView from "./AdminView";
import { logout } from "./utils/auth";

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
  const handleLogout = async () => {
    await logout();
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

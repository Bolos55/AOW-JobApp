import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "./api";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    setError("");

    // ตรวจสอบรูปแบบอีเมล
    const emailTrimmed = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailTrimmed) {
      setError("กรุณากรอกอีเมล");
      return;
    }
    
    if (!emailRegex.test(emailTrimmed)) {
      setError("รูปแบบอีเมลไม่ถูกต้อง กรุณากรอกอีเมลให้ถูกต้อง เช่น example@gmail.com");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailTrimmed }),
      });

      const ct = res.headers.get("content-type") || "";
      const data = ct.includes("application/json") ? await res.json() : null;

      if (!res.ok) {
        setError((data && data.message) || `เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง`);
        return;
      }

      setMsg(
        "ส่งลิงก์รีเซ็ตรหัสผ่านไปที่อีเมลของคุณแล้ว กรุณาตรวจสอบกล่องจดหมาย"
      );
      setEmail(""); // ล้างช่องอีเมล
    } catch {
      setError("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบอินเทอร์เน็ต");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center px-4">
      <div className="bg-white/95 rounded-3xl shadow-2xl max-w-md w-full p-8">
        <h1 className="text-2xl font-extrabold text-gray-800 text-center">
          ลืมรหัสผ่าน
        </h1>
        <p className="text-sm text-gray-500 text-center mt-1">
          กรอกอีเมลเพื่อรับลิงก์ตั้งรหัสผ่านใหม่
        </p>

        <form onSubmit={onSubmit} className="space-y-4 mt-6">
          <div>
            <label htmlFor="forgotEmail" className="block text-sm font-medium text-gray-700 mb-2">
              อีเมลที่ใช้สมัครสมาชิก
            </label>
            <input
              id="forgotEmail"
              type="text"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="example@gmail.com"
            />
            <p className="text-xs text-gray-500 mt-1">
              กรอกอีเมลที่คุณใช้สมัครสมาชิก เราจะส่งลิงก์รีเซ็ตรหัสผ่านไปให้
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          {msg && (
            <p className="text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2">
              {msg}
            </p>
          )}

          <button
            disabled={loading}
            className={`w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2.5 rounded-xl text-sm font-medium ${
              loading ? "opacity-70 cursor-not-allowed" : ""
            }`}
          >
            {loading ? "กำลังส่ง..." : "ส่งลิงก์รีเซ็ตรหัสผ่าน"}
          </button>

          <button
            type="button"
            onClick={() => navigate("/login")}
            className="w-full text-sm text-gray-600 hover:underline"
          >
            กลับไปหน้าเข้าสู่ระบบ
          </button>
        </form>
      </div>
    </div>
  );
}

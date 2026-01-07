// src/ResetPassword.jsx
import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { API_BASE } from "./api";

export default function ResetPassword() {
  const { token } = useParams(); // token ที่มากับลิงก์
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!password) {
      setMessage("กรุณากรอกรหัสผ่านใหม่");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      // ✅ ใช้ API_BASE แทน hardcoded URL
      const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage("ตั้งรหัสผ่านใหม่เรียบร้อยแล้ว กำลังพากลับไปหน้าล็อกอิน...");
        setTimeout(() => navigate("/"), 2000);
      } else {
        setMessage(data.message || "ตั้งรหัสผ่านไม่ได้");
      }
    } catch (err) {
      setMessage("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="bg-white p-6 rounded-xl shadow w-full max-w-md space-y-4">
        <h1 className="text-2xl font-bold">ตั้งรหัสผ่านใหม่</h1>
        {/* แค่โชว์ token ให้เห็นว่าเรารับมาจริง */}
        <p className="text-xs text-gray-400 break-all">โทเคน: {token}</p>

        <input
          type="password"
          className="w-full border rounded-lg px-3 py-2"
          placeholder="รหัสผ่านใหม่"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={handleReset}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg disabled:opacity-60"
        >
          {loading ? "กำลังตั้งรหัสผ่าน..." : "ตั้งรหัสผ่าน"}
        </button>

        {message && <p className="text-sm text-center mt-2">{message}</p>}
      </div>
    </div>
  );
}
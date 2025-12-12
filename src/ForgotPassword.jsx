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
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const ct = res.headers.get("content-type") || "";
      const data = ct.includes("application/json") ? await res.json() : null;

      if (!res.ok) {
        setError((data && data.message) || `เกิดข้อผิดพลาด (${res.status})`);
        return;
      }

      setMsg(
        (data && data.message) ||
          "ส่งลิงก์รีเซ็ตรหัสผ่านไปที่อีเมลแล้ว (ถ้าอีเมลมีอยู่ในระบบ)"
      );
    } catch {
      setError("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้");
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
            <label className="block text-sm mb-1">อีเมล</label>
            <input
              type="email"
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
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

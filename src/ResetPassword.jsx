// src/ResetPassword.jsx
import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { API_BASE } from "./api";

export default function ResetPassword() {
  const { token } = useParams(); // token ที่มากับลิงก์
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
        // ✅ แสดงรายละเอียด error ที่ชัดเจน
        if (data.errors && Array.isArray(data.errors)) {
          // ถ้ามี errors array (จากการตรวจสอบรหัสผ่าน)
          const errorList = data.errors.map((err, idx) => `${idx + 1}. ${err}`).join('\n');
          setMessage(`รหัสผ่านไม่ปลอดภัย:\n${errorList}`);
        } else if (data.message) {
          // ถ้ามีแค่ message เดียว
          setMessage(data.message);
        } else {
          setMessage("ไม่สามารถตั้งรหัสผ่านได้ กรุณาลองใหม่อีกครั้ง");
        }
      }
    } catch (err) {
      setMessage("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบอินเทอร์เน็ต");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 px-4">
      <div className="bg-white/95 rounded-3xl shadow-2xl p-8 w-full max-w-md space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-800 text-center">
            ตั้งรหัสผ่านใหม่
          </h1>
          <p className="text-sm text-gray-500 text-center mt-2">
            กรุณากรอกรหัสผ่านใหม่ของคุณ
          </p>
        </div>

        <div className="relative">
          <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
            รหัสผ่านใหม่
          </label>
          <div className="relative">
            <input
              id="newPassword"
              type={showPassword ? "text" : "password"}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="กรอกรหัสผ่านใหม่"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
              aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
            >
              {showPassword ? (
                // ไอคอนตาเปิด
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              ) : (
                // ไอคอนตาปิด
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              )}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร ประกอบด้วยตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก ตัวเลข และอักขระพิเศษ
          </p>
        </div>

        <button
          onClick={handleReset}
          disabled={loading}
          className={`w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2.5 rounded-xl font-medium transition-all ${
            loading ? "opacity-70 cursor-not-allowed" : "hover:shadow-lg"
          }`}
        >
          {loading ? "กำลังตั้งรหัสผ่าน..." : "ตั้งรหัสผ่าน"}
        </button>

        {message && (
          <div className={`text-sm px-4 py-3 rounded-lg ${
            message.includes("เรียบร้อย") 
              ? "text-green-600 bg-green-50" 
              : "text-red-500 bg-red-50"
          }`}>
            {message.split('\n').map((line, idx) => (
              <div key={idx} className={idx > 0 ? "mt-1" : ""}>
                {line}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
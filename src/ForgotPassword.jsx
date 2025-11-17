// src/ForgotPassword.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, AlertCircle, CheckCircle } from "lucide-react";

const API_BASE = "http://localhost:5000";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [resetLink, setResetLink] = useState("");

  const validateEmail = (email) => /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });
    setResetLink("");

    if (!email) {
      setMessage({ type: "error", text: "กรุณากรอกอีเมล" });
      return;
    }

    if (!validateEmail(email)) {
      setMessage({ type: "error", text: "รูปแบบอีเมลไม่ถูกต้อง" });
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้");
      }

      // backend ของคุณส่ง { message, resetLink } มา
      setMessage({ type: "success", text: data.message || "สร้างลิงก์รีเซ็ตแล้ว" });
      if (data.resetLink) {
        setResetLink(data.resetLink);
      }
    } catch (err) {
      setMessage({
        type: "error",
        text: err.message || "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8">
        <div className="text-center mb-6">
          <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-purple-100 flex items-center justify-center">
            <Mail className="w-8 h-8 text-purple-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">ลืมรหัสผ่าน</h1>
          <p className="text-gray-500 text-sm mt-1">
            กรอกอีเมลที่ใช้สมัคร เราจะสร้างลิงก์ให้คุณรีเซ็ต
          </p>
        </div>

        {message.text && (
            <div
              className={`mb-4 p-4 rounded-xl flex gap-3 items-start ${
                message.type === "success"
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {message.type === "success" ? (
                <CheckCircle className="w-5 h-5 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 mt-0.5" />
              )}
              <div>
                <p className="text-sm font-medium">{message.text}</p>
                {resetLink && (
                  <p className="text-xs mt-2 break-all">
                    ลิงก์รีเซ็ต: <span className="font-mono">{resetLink}</span>
                  </p>
                )}
              </div>
            </div>
          )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              อีเมลที่ใช้สมัคร
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                placeholder="your@email.com"
                disabled={isLoading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50"
          >
            {isLoading ? "กำลังส่ง..." : "ขอรีเซ็ตรหัสผ่าน"}
          </button>
        </form>

        <button
          onClick={() => navigate("/")}
          className="w-full mt-6 text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          กลับไปหน้าเข้าสู่ระบบ
        </button>
      </div>
    </div>
  );
}
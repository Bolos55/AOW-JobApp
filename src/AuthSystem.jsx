// src/AuthSystem.jsx
import React, { useState } from "react";
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Briefcase,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

export default function AuthSystem({ onSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgot, setIsForgot] = useState(false); // โหมดลืมรหัสผ่าน
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  // ชี้ไปที่ backend ของคุณ
  const API_BASE = "http://localhost:5000/api/auth";

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setMessage({ type: "", text: "" });
  };

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  /* ========== LOGIN ========== */
  const handleLogin = async () => {
    setIsLoading(true);
    setMessage({ type: "", text: "" });

    if (!formData.email || !formData.password) {
      setMessage({ type: "error", text: "กรุณากรอกอีเมลและรหัสผ่าน" });
      setIsLoading(false);
      return;
    }
    if (!validateEmail(formData.email)) {
      setMessage({ type: "error", text: "รูปแบบอีเมลไม่ถูกต้อง" });
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({
          type: "error",
          text: data.message || "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
        });
      } else {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        setMessage({ type: "success", text: "เข้าสู่ระบบสำเร็จ!" });
        if (typeof onSuccess === "function") onSuccess();
      }
    } catch (err) {
      setMessage({ type: "error", text: "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้" });
    } finally {
      setIsLoading(false);
    }
  };

  /* ========== REGISTER ========== */
  const handleRegister = async () => {
    setIsLoading(true);
    setMessage({ type: "", text: "" });

    if (
      !formData.name ||
      !formData.email ||
      !formData.password ||
      !formData.confirmPassword
    ) {
      setMessage({ type: "error", text: "กรุณากรอกข้อมูลให้ครบทุกช่อง" });
      setIsLoading(false);
      return;
    }
    if (!validateEmail(formData.email)) {
      setMessage({ type: "error", text: "รูปแบบอีเมลไม่ถูกต้อง" });
      setIsLoading(false);
      return;
    }
    if (formData.password.length < 6) {
      setMessage({
        type: "error",
        text: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร",
      });
      setIsLoading(false);
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setMessage({ type: "error", text: "รหัสผ่านไม่ตรงกัน" });
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({
          type: "error",
          text: data.message || "สมัครสมาชิกไม่สำเร็จ",
        });
      } else {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        setMessage({ type: "success", text: "สมัครสมาชิกสำเร็จ!" });
        if (typeof onSuccess === "function") onSuccess();
      }
    } catch (err) {
      setMessage({ type: "error", text: "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้" });
    } finally {
      setIsLoading(false);
    }
  };

  /* ========== FORGOT PASSWORD ========== */
  const handleForgotPassword = async () => {
    setMessage({ type: "", text: "" });

    if (!formData.email) {
      setMessage({ type: "error", text: "กรุณากรอกอีเมล" });
      return;
    }
    if (!validateEmail(formData.email)) {
      setMessage({ type: "error", text: "รูปแบบอีเมลไม่ถูกต้อง" });
      return;
    }

    try {
      // backend ของคุณใช้ /forgot-password
      const res = await fetch(`${API_BASE}/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email }),
      });

      const data = await res.json();

      if (res.ok) {
        // backend คืน { message, resetLink }
        setMessage({
          type: "success",
          text: data.resetLink
            ? `สร้างลิงก์รีเซ็ตแล้ว ให้คัดลอกไปเปิด: ${data.resetLink}`
            : data.message || "สร้างลิงก์รีเซ็ตแล้ว",
        });
      } else {
        setMessage({ type: "error", text: data.message || "ขอรีเซ็ตไม่สำเร็จ" });
      }
    } catch (err) {
      setMessage({ type: "error", text: "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้" });
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      if (isForgot) handleForgotPassword();
      else isLogin ? handleLogin() : handleRegister();
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setIsForgot(false);
    setFormData({
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    });
    setMessage({ type: "", text: "" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-3xl shadow-2xl mb-4">
            <Briefcase className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">
            {isForgot ? "ลืมรหัสผ่าน" : isLogin ? "ยินดีต้อนรับกลับ" : "เริ่มต้นใช้งาน"}
          </h1>
          <p className="text-blue-100">
            {isForgot
              ? "กรอกอีเมลที่ใช้สมัคร เราจะสร้างลิงก์ให้"
              : isLogin
              ? "เข้าสู่ระบบเพื่อค้นหางานในฝัน"
              : "สมัครสมาชิกเพื่อเริ่มหางาน"}
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8">
          {message.text && (
            <div
              className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
                message.type === "success"
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {message.type === "success" ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              <span className="text-sm font-medium">{message.text}</span>
            </div>
          )}

          {/* โหมดลืมรหัสผ่าน */}
          {isForgot ? (
            <>
              <div className="space-y-4 mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  อีเมลที่ใช้สมัคร
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    onKeyPress={handleKeyPress}
                    className="w-full pl-12 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
                    placeholder="your@email.com"
                  />
                </div>
              </div>
              <button
                onClick={handleForgotPassword}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-bold"
              >
                ขอรีเซ็ตรหัสผ่าน
              </button>
              <p className="text-center mt-4 text-sm">
                กลับไป{" "}
                <button
                  onClick={() => {
                    setIsForgot(false);
                    setMessage({ type: "", text: "" });
                  }}
                  className="text-blue-600 font-bold"
                >
                  เข้าสู่ระบบ
                </button>
              </p>
            </>
          ) : (
            <>
              <div className="space-y-5">
                {!isLogin && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ชื่อ-นามสกุล
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        onKeyPress={handleKeyPress}
                        placeholder="กรอกชื่อ-นามสกุล"
                        className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    อีเมล
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      onKeyPress={handleKeyPress}
                      placeholder="your@email.com"
                      className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    รหัสผ่าน
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      onKeyPress={handleKeyPress}
                      placeholder="••••••••"
                      className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {!isLogin && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ยืนยันรหัสผ่าน
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type={showPassword ? "text" : "password"}
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        onKeyPress={handleKeyPress}
                        placeholder="••••••••"
                        className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                      />
                    </div>
                  </div>
                )}

                {isLogin && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgot(true);
                        setMessage({ type: "", text: "" });
                      }}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      ลืมรหัสผ่าน?
                    </button>
                  </div>
                )}

                <button
                  onClick={isLogin ? handleLogin : handleRegister}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-bold text-lg hover:shadow-2xl transition transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isLoading
                    ? "กำลังดำเนินการ..."
                    : isLogin
                    ? "เข้าสู่ระบบ"
                    : "สมัครสมาชิก"}
                </button>
              </div>

              <div className="mt-6 text-center">
                <p className="text-gray-600 text-sm">
                  {isLogin ? "ยังไม่มีบัญชี?" : "มีบัญชีอยู่แล้ว?"}
                  <button
                    onClick={toggleMode}
                    className="ml-2 text-blue-600 hover:text-blue-700 font-bold"
                  >
                    {isLogin ? "สมัครสมาชิก" : "เข้าสู่ระบบ"}
                  </button>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
// src/LoginPage.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "./api";

export default function LoginPage() {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint =
        mode === "login" ? "/api/auth/login" : "/api/auth/register";

      const body =
        mode === "login"
          ? {
              email: form.email.trim(),
              password: form.password,
            }
          : {
              name: form.name.trim(),
              email: form.email.trim(),
              password: form.password,
            };

      const url = `${API_BASE}${endpoint}`;
      console.log("🔎 Calling API:", url, body);

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      // พยายามอ่าน JSON ถ้าตอบกลับเป็น JSON จริง ๆ
      let data = null;
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        try {
          data = await res.json();
        } catch (parseErr) {
          console.error("❌ JSON parse error:", parseErr);
        }
      }

      if (!res.ok) {
        console.error("❌ Auth error:", res.status, data);
        setError(
          data?.message ||
            (res.status === 404
              ? "ไม่พบเส้นทาง API (404) กรุณาเช็ก backend ว่ามี /api/auth/register และ /api/auth/login หรือไม่"
              : `เกิดข้อผิดพลาดจากเซิร์ฟเวอร์ (${res.status})`)
        );
        return;
      }

      if (!data || !data.user || !data.token) {
        console.error("❌ Invalid response:", data);
        setError("รูปแบบข้อมูลตอบกลับไม่ถูกต้อง");
        return;
      }

      const user = data.user; // { id, name, email }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(user));

      window.dispatchEvent(new Event("auth-change"));

      navigate("/", { replace: true });
    } catch (err) {
      console.error("❌ Network / fetch error:", err);
      setError("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center px-4">
      <div className="bg-white/95 rounded-3xl shadow-2xl max-w-md w-full p-8">
        {/* 🔹 แบรนด์ AOW all of works + แท็กไลน์ */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-extrabold text-gray-800 tracking-wide">
            AOW <span className="font-semibold text-gray-700">all of works</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">งานเพื่อคุณเพื่อทุกคน</p>
          <p className="text-xs text-gray-400 mt-2">
            Job Finder • ระบบหางานและประกาศรับสมัครงาน
          </p>
        </div>

        {/* แท็บสลับโหมด เข้าสู่ระบบ / สมัครสมาชิก */}
        <div className="flex mb-6 rounded-xl bg-gray-100 p-1">
          <button
            type="button"
            className={`flex-1 py-2 rounded-lg text-sm font-medium ${
              mode === "login"
                ? "bg-white shadow text-blue-600"
                : "text-gray-500"
            }`}
            onClick={() => setMode("login")}
          >
            เข้าสู่ระบบ
          </button>
          <button
            type="button"
            className={`flex-1 py-2 rounded-lg text-sm font-medium ${
              mode === "register"
                ? "bg-white shadow text-blue-600"
                : "text-gray-500"
            }`}
            onClick={() => setMode("register")}
          >
            สมัครสมาชิก
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <div>
              <label className="block text-sm mb-1">ชื่อผู้ใช้</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="เช่น สมหญิง แรงงานดีเด่น"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm mb-1">อีเมล</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-1">รหัสผ่าน</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="อย่างน้อย 6 ตัวอักษร"
              required
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2.5 rounded-xl text-sm font-medium hover:shadow-lg disabled:opacity-60"
          >
            {loading
              ? "กำลังดำเนินการ..."
              : mode === "login"
              ? "เข้าสู่ระบบ"
              : "สมัครสมาชิก"}
          </button>
        </form>
      </div>
    </div>
  );
}
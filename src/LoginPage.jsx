// src/LoginPage.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "./api";

export default function LoginPage() {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "jobseeker", // ✅ ค่าเริ่มต้น
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  // ✅ ถ้ามี token อยู่แล้ว ไม่ให้เข้าหน้า login ซ้ำ -> เด้งกลับหน้าแรก
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  // ❌ ตัด useEffect ปลุก backend ออกไปก่อน เพื่อตัดปัญหา error ทั้งหมด
  // ถ้าอยากใส่ทีหลังค่อยมาเพิ่มใหม่ได้

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "radio" ? value : value,
    }));
  };

  // ⭐ helper ดึงโปรไฟล์หลังจาก login สำเร็จ
  const fetchMyProfile = async (token) => {
    try {
      const res = await fetch(`${API_BASE}/api/profile/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        console.log("fetchMyProfile not ok:", res.status);
        return null;
      }

      const data = await res.json().catch(() => null);
      return data || null;
    } catch (err) {
      console.log("fetchMyProfile error:", err && err.message);
      return null;
    }
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
              role: form.role, // ✅ ส่ง role ไป register
            };

      const url = `${API_BASE}${endpoint}`;
      console.log("🔎 Calling API:", url, body);

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      let data = null;
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        data = await res.json();
      }

      if (!res.ok) {
        setError(
          (data && data.message) ||
            (res.status === 404
              ? "ไม่พบเส้นทาง API (404) กรุณาเช็ก backend"
              : `เกิดข้อผิดพลาด (${res.status})`)
        );
        return;
      }

      if (!data || !data.user || !data.token) {
        setError("รูปแบบข้อมูลตอบกลับไม่ถูกต้อง");
        return;
      }

      const token = data.token;

      // ⭐ ดึงโปรไฟล์จาก backend มาผูกกับ user
      const profile = await fetchMyProfile(token);

      const user = {
        ...data.user,
        role: (data.user.role || "jobseeker").toLowerCase(),
        profile: profile || data.user.profile || null,
      };

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      window.dispatchEvent(new Event("auth-change"));

      navigate("/", { replace: true });
    } catch (err) {
      console.error("❌ Network error:", err);
      setError("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center px-4">
      <div className="bg-white/95 rounded-3xl shadow-2xl max-w-md w-full p-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-extrabold text-gray-800 tracking-wide">
            AOW <span className="font-semibold text-gray-700">all of works</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">เริ่มใช้งานกันเลย!!</p>
        </div>

        {/* สลับโหมด */}
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
            <>
              <div>
                <label className="block text-sm mb-1">ชื่อผู้ใช้</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  required
                />
              </div>

              {/* ✅ เลือก Role */}
              <div>
                <label className="block text-sm mb-1">สมัครในฐานะ</label>
                <div className="flex gap-4 mt-1">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="role"
                      value="jobseeker"
                      checked={form.role === "jobseeker"}
                      onChange={handleChange}
                    />
                    ผู้หางาน
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="role"
                      value="employer"
                      checked={form.role === "employer"}
                      onChange={handleChange}
                    />
                    นายจ้าง
                  </label>
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm mb-1">อีเมล</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 text-sm"
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
              className="w-full border rounded-lg px-3 py-2 text-sm"
              required
            />
            {/* ✅ ปุ่มลืมรหัสผ่าน */}
            {mode === "login" && (
              <div className="flex justify-end mt-1">
                <button
                  type="button"
                  onClick={() => navigate("/forgot-password")}
                  className="text-xs text-blue-600 hover:underline"
                >
                  ลืมรหัสผ่าน?
                </button>
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2.5 rounded-xl text-sm font-medium ${
              loading ? "opacity-70 cursor-not-allowed" : ""
            }`}
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

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

  // ✅ เวอร์ชันปรับปรุง: มี timeout + handle error ชัดเจน + ปิด loading ทุกกรณี
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // ทำ timeout กัน request ค้าง (เช่น backend ไม่ตอบ)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 15000); // 15 วิ

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
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let data = null;
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        try {
          data = await res.json();
        } catch (parseErr) {
          console.error("❌ JSON parse error:", parseErr);
        }
      }

      // ❌ เคส login/register ไม่ผ่าน
      if (!res.ok) {
        console.error("❌ Auth error:", res.status, data);

        if (res.status === 400 || res.status === 401) {
          setError(data?.message || "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
        } else if (res.status === 404) {
          setError(
            "ไม่พบเส้นทาง API (404) กรุณาเช็ก backend ว่ามี /api/auth/login และ /api/auth/register หรือไม่"
          );
        } else if (res.status >= 500) {
          setError("เซิร์ฟเวอร์มีปัญหา กรุณาลองใหม่อีกครั้ง");
        } else {
          setError(
            data?.message ||
              `เกิดข้อผิดพลาดจากเซิร์ฟเวอร์ (${res.status})`
          );
        }
        return; // ⛔ หยุด ไม่ไปต่อด้านล่าง
      }

      // ✅ ตอบกลับแต่รูปแบบผิด
      if (!data || !data.user || !data.token) {
        console.error("❌ Invalid response:", data);
        setError("รูปแบบข้อมูลตอบกลับไม่ถูกต้อง");
        return;
      }

      const user = data.user;

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(user));
      window.dispatchEvent(new Event("auth-change"));

      navigate("/", { replace: true });
    } catch (err) {
      clearTimeout(timeoutId);
      console.error("❌ Network / fetch error:", err);

      if (err.name === "AbortError") {
        setError("เซิร์ฟเวอร์ตอบช้าเกินไป กรุณาลองใหม่อีกครั้ง");
      } else {
        setError("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้");
      }
    } finally {
      // ✅ ปิดโหลดทุกกรณี
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center px-4">
      <div className="bg-white/95 rounded-3xl shadow-2xl max-w-md w-full p-8">
        {/* ... ที่เหลือเหมือนเดิม */}
        {/* ... */}
      </div>
    </div>
  );
}

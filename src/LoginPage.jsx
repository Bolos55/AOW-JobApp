// src/LoginPage.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "./api";
import SocialLogin from "./components/SocialLogin";

export default function LoginPage({ onAuth }) {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "jobseeker", // ✅ ค่าเริ่มต้น
    acceptTerms: false,
    acceptPrivacy: false,
  });
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false); // ✅ เพิ่ม loading state สำหรับ social login
  const [error, setError] = useState("");
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);

  const navigate = useNavigate();

  // ✅ ถ้ามี token อยู่แล้ว ไม่ให้เข้าหน้า login ซ้ำ -> เด้งกลับหน้าแรก
  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    
    if (token && user) {
      try {
        const userData = JSON.parse(user);
        if (userData && userData.email) {
          navigate("/", { replace: true });
        }
      } catch (e) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }
  }, [navigate]);

  // ❌ ตัด useEffect ปลุก backend ออกไปก่อน เพื่อตัดปัญหา error ทั้งหมด
  // ถ้าอยากใส่ทีหลังค่อยมาเพิ่มใหม่ได้

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : type === "radio" ? value : value,
    }));
  };

  // ✅ ตรวจสอบความแข็งแกร่งของรหัสผ่าน
  const validatePassword = (password) => {
    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };
    
    const score = Object.values(requirements).filter(Boolean).length;
    return { requirements, score, isStrong: score >= 4 };
  };

  // ✅ ตรวจสอบอีเมลที่ปลอดภัย
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(email);
    
    // ✅ รายการอีเมลชั่วคราว/ปลอมที่ครอบคลุมมากขึ้น
    const disposableDomains = [
      '10minutemail.com', 'tempmail.org', 'guerrillamail.com', 'mailinator.com',
      'yopmail.com', 'temp-mail.org', 'throwaway.email', 'maildrop.cc',
      'sharklasers.com', 'grr.la', 'guerrillamailblock.com', 'pokemail.net',
      'spam4.me', 'bccto.me', 'chacuo.net', 'dispostable.com', 'fakeinbox.com',
      'hidemail.de', 'mytrashmail.com', 'no-spam.ws', 'nospam.ze.tc',
      'nowmymail.com', 'objectmail.com', 'protonmail.com', 'sogetthis.com',
      'spamherald.com', 'spamhole.com', 'speed.1s.fr', 'temporary.email',
      'trashmail.at', 'trashmail.com', 'trashmail.io', 'trashmail.me',
      'trashmail.net', 'trashmail.org', 'wegwerfmail.de', 'wegwerfmail.net',
      'wegwerfmail.org', 'wh4f.org', 'whatpaas.com', 'willhackforfood.biz',
      'wronghead.com', 'wuzupmail.net', 'xoxy.net', 'yoggm.com', 'zehnminutenmail.de'
    ];
    
    const isDisposable = disposableDomains.some(domain => 
      email.toLowerCase().includes(domain.toLowerCase())
    );
    
    // ✅ ตรวจสอบรูปแบบอีเมลที่น่าสงสัย
    const suspiciousPatterns = [
      /^[a-z]+\d{4,}@/i,           // เช่น user12345@
      /^test\d*@/i,                // เช่น test123@
      /^fake\d*@/i,                // เช่น fake@
      /^temp\d*@/i,                // เช่น temp@
      /^spam\d*@/i,                // เช่น spam@
      /^\d+@/,                     // เช่น 123456@
      /^[a-z]{1,2}\d+@/i,          // เช่น a1@, ab123@
    ];
    
    const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(email));
    
    return { 
      isValid, 
      isDisposable, 
      isSuspicious,
      domain: email.split('@')[1]?.toLowerCase() || ''
    };
  };

  // ⭐ Handler สำหรับ Social Login สำเร็จ
  const handleSocialSuccess = async (data) => {
    setSocialLoading(true);
    
    try {
      if (!data || !data.user || !data.token) {
        setError("รูปแบบข้อมูลตอบกลับไม่ถูกต้อง");
        return;
      }

      const token = data.token;

      const profile = await fetchMyProfile(token);

      const user = {
        ...data.user,
        role: (data.user.role || "jobseeker").toLowerCase(),
        profile: profile || data.user.profile || null,
      };

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      if (typeof onAuth === "function") {
        onAuth(user, token);
      }

      window.dispatchEvent(new Event("auth-change"));
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      navigate("/", { replace: true });
      
    } catch (err) {
      setError(`เกิดข้อผิดพลาดในการเข้าสู่ระบบ: ${err.message}`);
    } finally {
      setSocialLoading(false);
    }
  };

  // ⭐ Handler สำหรับ Social Login ล้มเหลว
  const handleSocialError = (errorMessage) => {
    setSocialLoading(false);
    setError(errorMessage);
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
        return null;
      }

      const data = await res.json().catch(() => null);
      return data || null;
    } catch (err) {
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // ✅ การตรวจสอบเพิ่มเติมสำหรับการสมัครสมาชิก
      if (mode === "register") {
        // ตรวจสอบชื่อ
        if (form.name.trim().length < 2) {
          setError("ชื่อผู้ใช้ต้องมีอย่างน้อย 2 ตัวอักษร");
          setLoading(false);
          return;
        }

        // ตรวจสอบอีเมล
        const emailValidation = validateEmail(form.email);
        if (!emailValidation.isValid) {
          setError("รูปแบบอีเมลไม่ถูกต้อง");
          setLoading(false);
          return;
        }
        if (emailValidation.isDisposable) {
          setError(`🚫 ไม่สามารถใช้อีเมลชั่วคราวได้\n\nDomain: ${emailValidation.domain}\n\nกรุณาใช้อีเมลจริงเพื่อความปลอดภัยและการติดต่อ`);
          setLoading(false);
          return;
        }
        if (emailValidation.isSuspicious) {
          setError(`⚠️ รูปแบบอีเมลน่าสงสัย\n\nกรุณาใช้อีเมลจริงที่สามารถติดต่อได้`);
          setLoading(false);
          return;
        }

        // ตรวจสอบรหัสผ่าน
        const passwordValidation = validatePassword(form.password);
        if (!passwordValidation.isStrong) {
          setError("รหัสผ่านไม่ปลอดภัยเพียงพอ กรุณาตรวจสอบข้อกำหนด");
          setLoading(false);
          return;
        }

        // ตรวจสอบรหัสผ่านตรงกัน
        if (form.password !== form.confirmPassword) {
          setError("รหัสผ่านไม่ตรงกัน");
          setLoading(false);
          return;
        }

        // ตรวจสอบการยอมรับเงื่อนไข
        if (!form.acceptTerms) {
          setError("กรุณายอมรับเงื่อนไขการใช้งาน");
          setLoading(false);
          return;
        }
        if (!form.acceptPrivacy) {
          setError("กรุณายอมรับนโยบายความเป็นส่วนตัว");
          setLoading(false);
          return;
        }
      }

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
              registrationMetadata: {
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString(),
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                language: navigator.language,
              }
            };

      const url = `${API_BASE}${endpoint}`;

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

      // ✅ แสดงข้อความต้อนรับสำหรับสมาชิกใหม่
      if (mode === "register") {
        // ✅ ไม่ต้อง alert แต่แสดงข้อความใน UI แทน
        setError(""); // ล้าง error
        
        if (data.mockMode) {
          // ✅ Mock mode - แสดงลิงก์ทดสอบ
          const confirmTest = window.confirm(`📧 ส่งลิงก์ยืนยันอีเมลแล้ว! (โหมดทดสอบ)

✅ สมัครสมาชิกเรียบร้อย
📧 อีเมล: ${user.email}
👤 สถานะ: ${user.role === 'employer' ? 'นายจ้าง' : 'ผู้หางาน'}

🧪 โหมดทดสอบ: ${data.testInstructions}

กดตกลงเพื่อไปหน้ายืนยันอีเมลทันที`);
          
          if (confirmTest) {
            // เปิดลิงก์ยืนยันในแท็บใหม่
            window.open(data.verificationLink, '_blank');
          }
        } else {
          alert(`📧 ส่งลิงก์ยืนยันอีเมลแล้ว!

✅ สมัครสมาชิกเรียบร้อย
📧 ตรวจสอบอีเมล: ${user.email}
👤 สถานะ: ${user.role === 'employer' ? 'นายจ้าง' : 'ผู้หางาน'}

💡 ขั้นตอนต่อไป:
1. เปิดอีเมลของคุณ
2. กดลิงก์ยืนยันในอีเมล
3. เข้าสู่ระบบได้ทันที

⏰ ลิงก์จะหมดอายุใน 24 ชั่วโมง
📁 หากไม่พบอีเมล ให้ตรวจสอบในโฟลเดอร์ Spam`);
        }
        
        // ✅ เปลี่ยนไปหน้า login พร้อมข้อความ
        setMode("login");
        setForm({
          name: "",
          email: form.email, // เก็บอีเมลไว้
          password: "",
          confirmPassword: "",
          role: "jobseeker",
          acceptTerms: false,
          acceptPrivacy: false,
        });
        return; // ไม่ต้อง navigate เพราะยังไม่ได้ token
      }

      // ✅ เรียก onAuth callback เพื่อแจ้ง parent component
      if (typeof onAuth === "function") {
        onAuth(user, token);
      }

      navigate("/", { replace: true });
    } catch (err) {
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
                <label htmlFor="name" className="block text-sm mb-1">ชื่อผู้ใช้</label>
                <input
                  id="name"
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="ชื่อจริง นามสกุล"
                  required
                  minLength={2}
                  autoComplete="name"
                />
                <p className="text-xs text-gray-500 mt-1">
                  ใช้ชื่อจริงเพื่อความน่าเชื่อถือ
                </p>
              </div>

              {/* ✅ เลือก Role */}
              <div>
                <label className="block text-sm mb-1">สมัครในฐานะ</label>
                <div className="flex gap-4 mt-1">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      id="role-jobseeker"
                      type="radio"
                      name="role"
                      value="jobseeker"
                      checked={form.role === "jobseeker"}
                      onChange={handleChange}
                      autoComplete="off"
                    />
                    ผู้หางาน
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      id="role-employer"
                      type="radio"
                      name="role"
                      value="employer"
                      checked={form.role === "employer"}
                      onChange={handleChange}
                      autoComplete="off"
                    />
                    นายจ้าง
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {form.role === "employer" 
                    ? "สำหรับบริษัท/ผู้ประกอบการที่ต้องการรับสมัครงาน" 
                    : "สำหรับผู้ที่กำลังมองหางาน"
                  }
                </p>
              </div>
            </>
          )}

          <div>
            <label htmlFor="email" className="block text-sm mb-1">อีเมล</label>
            <input
              id="email"
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="example@email.com"
              required
              autoComplete="email"
            />
            {mode === "register" && (
              <p className="text-xs text-gray-500 mt-1">
                ใช้อีเมลจริงเพื่อรับการแจ้งเตือนและยืนยันตัวตน
              </p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm mb-1">รหัสผ่าน</label>
            <input
              id="password"
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              onFocus={() => mode === "register" && setShowPasswordRequirements(true)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder={mode === "register" ? "สร้างรหัสผ่านที่แข็งแกร่ง" : "รหัสผ่าน"}
              required
              minLength={mode === "register" ? 8 : undefined}
              autoComplete={mode === "register" ? "new-password" : "current-password"}
            />
            
            {/* ✅ แสดงข้อกำหนดรหัสผ่านสำหรับการสมัคร */}
            {mode === "register" && showPasswordRequirements && (
              <div className="mt-2 p-3 bg-gray-50 border rounded-lg">
                <p className="text-xs font-semibold text-gray-700 mb-2">ข้อกำหนดรหัสผ่าน:</p>
                {(() => {
                  const validation = validatePassword(form.password);
                  return (
                    <div className="space-y-1">
                      <div className={`text-xs flex items-center gap-2 ${validation.requirements.length ? 'text-green-600' : 'text-gray-500'}`}>
                        <span>{validation.requirements.length ? '✅' : '⭕'}</span>
                        <span>อย่างน้อย 8 ตัวอักษร</span>
                      </div>
                      <div className={`text-xs flex items-center gap-2 ${validation.requirements.uppercase ? 'text-green-600' : 'text-gray-500'}`}>
                        <span>{validation.requirements.uppercase ? '✅' : '⭕'}</span>
                        <span>ตัวพิมพ์ใหญ่ (A-Z)</span>
                      </div>
                      <div className={`text-xs flex items-center gap-2 ${validation.requirements.lowercase ? 'text-green-600' : 'text-gray-500'}`}>
                        <span>{validation.requirements.lowercase ? '✅' : '⭕'}</span>
                        <span>ตัวพิมพ์เล็ก (a-z)</span>
                      </div>
                      <div className={`text-xs flex items-center gap-2 ${validation.requirements.number ? 'text-green-600' : 'text-gray-500'}`}>
                        <span>{validation.requirements.number ? '✅' : '⭕'}</span>
                        <span>ตัวเลข (0-9)</span>
                      </div>
                      <div className={`text-xs flex items-center gap-2 ${validation.requirements.special ? 'text-green-600' : 'text-gray-500'}`}>
                        <span>{validation.requirements.special ? '✅' : '⭕'}</span>
                        <span>อักขระพิเศษ (!@#$%^&*)</span>
                      </div>
                      <div className="mt-2 pt-2 border-t">
                        <div className={`text-xs font-medium ${validation.score >= 4 ? 'text-green-600' : validation.score >= 3 ? 'text-yellow-600' : 'text-red-600'}`}>
                          ความปลอดภัย: {validation.score >= 4 ? 'แข็งแกร่ง' : validation.score >= 3 ? 'ปานกลาง' : 'อ่อนแอ'} ({validation.score}/5)
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ✅ ยืนยันรหัสผ่านสำหรับการสมัคร */}
            {mode === "register" && (
              <div className="mt-3">
                <label htmlFor="confirmPassword" className="block text-sm mb-1">ยืนยันรหัสผ่าน</label>
                <input
                  id="confirmPassword"
                  type="password"
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  className={`w-full border rounded-lg px-3 py-2 text-sm ${
                    form.confirmPassword && form.password !== form.confirmPassword 
                      ? 'border-red-300 bg-red-50' 
                      : form.confirmPassword && form.password === form.confirmPassword 
                      ? 'border-green-300 bg-green-50' 
                      : ''
                  }`}
                  placeholder="พิมพ์รหัสผ่านอีกครั้ง"
                  required
                  autoComplete="new-password"
                />
                {form.confirmPassword && form.password !== form.confirmPassword && (
                  <p className="text-xs text-red-600 mt-1">รหัสผ่านไม่ตรงกัน</p>
                )}
                {form.confirmPassword && form.password === form.confirmPassword && (
                  <p className="text-xs text-green-600 mt-1">✅ รหัสผ่านตรงกัน</p>
                )}
              </div>
            )}

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

          {/* ✅ เงื่อนไขการใช้งานสำหรับการสมัคร */}
          {mode === "register" && (
            <div className="space-y-3 pt-2">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-sm font-semibold text-blue-800 mb-2">📋 ข้อมูลสำคัญ</h4>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• ข้อมูลส่วนตัวจะถูกเข้ารหัสและปกป้องตามมาตรฐาน</li>
                  <li>• สามารถขอลบข้อมูลได้ตามกฎหมาย PDPA</li>
                  <li>• ระบบจะส่งอีเมลแจ้งเตือนเกี่ยวกับงานและกิจกรรม</li>
                  <li>• ข้อมูลจะใช้เฉพาะการจับคู่งานและการติดต่อ</li>
                </ul>
              </div>

              <div className="space-y-2">
                <label className="flex items-start gap-3 text-sm cursor-pointer">
                  <input
                    id="acceptTerms"
                    type="checkbox"
                    name="acceptTerms"
                    checked={form.acceptTerms}
                    onChange={handleChange}
                    className="mt-0.5"
                    required
                    autoComplete="off"
                  />
                  <span>
                    ฉันยอมรับ{" "}
                    <button
                      type="button"
                      className="text-blue-600 hover:underline"
                      onClick={() => window.open("/terms", "_blank")}
                    >
                      เงื่อนไขการใช้งาน
                    </button>{" "}
                    และ{" "}
                    <button
                      type="button"
                      className="text-blue-600 hover:underline"
                      onClick={() => window.open("/privacy", "_blank")}
                    >
                      นโยบายความเป็นส่วนตัว
                    </button>
                  </span>
                </label>

                <label className="flex items-start gap-3 text-sm cursor-pointer">
                  <input
                    id="acceptPrivacy"
                    type="checkbox"
                    name="acceptPrivacy"
                    checked={form.acceptPrivacy}
                    onChange={handleChange}
                    className="mt-0.5"
                    required
                    autoComplete="off"
                  />
                  <span>
                    ฉันยินยอมให้ประมวลผลข้อมูลส่วนบุคคลเพื่อการให้บริการ
                  </span>
                </label>
              </div>
            </div>
          )}

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

        {/* ✅ Social Login Section */}
        <div className="mt-6">
          {socialLoading && (
            <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
              <p className="text-sm text-blue-700">🔄 กำลังเข้าสู่ระบบ...</p>
            </div>
          )}
          <SocialLogin 
            onSuccess={handleSocialSuccess}
            onError={handleSocialError}
          />
        </div>
      </div>
    </div>
  );
}

// src/RoleSelection.jsx
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { API_BASE } from "./api";

export default function RoleSelection() {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedRole, setSelectedRole] = useState("jobseeker");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ✅ รับข้อมูลจาก social login
  const urlParams = new URLSearchParams(location.search);
  const dataParam = urlParams.get('data');
  
  let socialData = null;
  let provider = "google";
  
  if (dataParam) {
    try {
      const parsedData = JSON.parse(decodeURIComponent(dataParam));
      socialData = parsedData.socialData;
      provider = parsedData.provider || "google";
    } catch (e) {
      console.error('Error parsing URL data:', e);
    }
  }
  
  // ✅ ถ้าไม่มีข้อมูล social ให้กลับไปหน้า login
  if (!socialData) {
    navigate("/login", { replace: true });
    return null;
  }

  const handleRoleSubmit = async () => {
    setLoading(true);
    setError("");

    try {
      // ✅ ส่งข้อมูล social + role ที่เลือกไปยัง backend
      const res = await fetch(`${API_BASE}/api/auth/complete-social-registration`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          socialData: socialData,
          role: selectedRole,
          provider: provider,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "เกิดข้อผิดพลาดในการสมัครสมาชิก");
      }

      if (!data.user || !data.token) {
        throw new Error("รูปแบบข้อมูลตอบกลับไม่ถูกต้อง");
      }

      // ✅ เก็บข้อมูลและเข้าสู่ระบบ
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      
      // ✅ Dispatch event เพื่อให้ App.js อัปเดต auth state
      window.dispatchEvent(new Event("auth-change"));

      // ✅ แสดงข้อความต้อนรับ
      alert(`🎉 ยินดีต้อนรับ ${data.user.name}!

✅ เข้าสู่ระบบด้วย ${provider === 'google' ? 'Google' : provider} สำเร็จ
👤 สถานะ: ${selectedRole === 'employer' ? 'นายจ้าง' : 'ผู้หางาน'}
📧 อีเมล: ${data.user.email}

💡 ขั้นตอนต่อไป:
${selectedRole === 'employer' 
  ? '• กรอกข้อมูลบริษัท\n• เริ่มโพสต์งาน\n• จัดการใบสมัคร' 
  : '• กรอกข้อมูลส่วนตัว\n• อัปโหลดเรซูเม่\n• เริ่มสมัครงาน'
}

🚀 เริ่มใช้งานได้เลย!`);

      // ✅ เข้าสู่ระบบ
      navigate("/", { replace: true });

    } catch (err) {
      console.error("Complete social registration error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center px-4">
      <div className="bg-white/95 rounded-3xl shadow-2xl max-w-md w-full p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            เข้าสู่ระบบสำเร็จ! 🎉
          </h1>
          <p className="text-sm text-gray-600">
            ยินดีต้อนรับ <strong>{socialData.name}</strong>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {socialData.email}
          </p>
        </div>

        {/* Social Provider Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            {provider === 'google' && (
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            <div>
              <p className="text-sm font-medium text-blue-800">
                เข้าสู่ระบบด้วย {provider === 'google' ? 'Google' : provider}
              </p>
              <p className="text-xs text-blue-600">
                ข้อมูลได้รับการยืนยันแล้ว
              </p>
            </div>
          </div>
        </div>

        {/* Role Selection */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            เลือกประเภทการใช้งาน
          </h2>
          
          <div className="space-y-3">
            {/* JobSeeker Option */}
            <label className={`block p-4 border-2 rounded-xl cursor-pointer transition-all ${
              selectedRole === "jobseeker" 
                ? "border-blue-500 bg-blue-50" 
                : "border-gray-200 hover:border-gray-300"
            }`}>
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  name="role"
                  value="jobseeker"
                  checked={selectedRole === "jobseeker"}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">👤</span>
                    <h3 className="font-semibold text-gray-800">ผู้หางาน</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    สำหรับผู้ที่กำลังมองหางาน สมัครงาน และสร้างโปรไฟล์
                  </p>
                  <ul className="text-xs text-gray-500 mt-2 space-y-1">
                    <li>• สร้างโปรไฟล์และอัปโหลดเรซูเม่</li>
                    <li>• ค้นหาและสมัครงาน</li>
                    <li>• แชทกับนายจ้าง</li>
                  </ul>
                </div>
              </div>
            </label>

            {/* Employer Option */}
            <label className={`block p-4 border-2 rounded-xl cursor-pointer transition-all ${
              selectedRole === "employer" 
                ? "border-purple-500 bg-purple-50" 
                : "border-gray-200 hover:border-gray-300"
            }`}>
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  name="role"
                  value="employer"
                  checked={selectedRole === "employer"}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">🏢</span>
                    <h3 className="font-semibold text-gray-800">นายจ้าง</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    สำหรับบริษัท/ผู้ประกอบการที่ต้องการรับสมัครพนักงาน
                  </p>
                  <ul className="text-xs text-gray-500 mt-2 space-y-1">
                    <li>• โพสต์ประกาศรับสมัครงาน</li>
                    <li>• จัดการใบสมัครและคัดเลือกผู้สมัคร</li>
                    <li>• แชทกับผู้สมัครงาน</li>
                  </ul>
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleRoleSubmit}
          disabled={loading}
          className={`w-full py-3 rounded-xl text-white font-medium transition-all ${
            selectedRole === "employer"
              ? "bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
              : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
          } ${loading ? "opacity-70 cursor-not-allowed" : ""}`}
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              กำลังดำเนินการ...
            </div>
          ) : (
            `เริ่มใช้งานในฐานะ${selectedRole === "employer" ? "นายจ้าง" : "ผู้หางาน"}`
          )}
        </button>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-500">
            คุณสามารถเปลี่ยนประเภทการใช้งานได้ในภายหลัง
          </p>
        </div>
      </div>
    </div>
  );
}
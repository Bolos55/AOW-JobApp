// src/components/JobSeekerProfileView.jsx
import { useEffect, useState } from "react";
import { X, FileText, User as UserIcon, MapPin, Phone, Mail, Briefcase, Award } from "lucide-react";
import { API_BASE, authHeader } from "../api";

/* ========= helper แปลง path จาก backend -> URL เต็ม ========= */
// รับค่าเช่น "https://res.cloudinary.com/..." หรือ "uploads/profile/xxx.png" แล้วคืนเป็น URL ที่เปิดได้จริง
const resolveFileUrl = (url) => {
  if (!url) return "";
  // ✅ If it's already a full URL (Cloudinary), return as-is
  if (url.startsWith("http")) return url;
  // ✅ Legacy local files - add /uploads prefix
  const FILE_BASE = API_BASE.replace(/\/api\/?$/, "");
  const cleanUrl = url.replace(/^\/+/, "");
  return `${FILE_BASE.replace(/\/+$/, "")}/uploads/${cleanUrl}`;
};

export default function JobSeekerProfileView({ open, onClose, userId, userName }) {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [showImageModal, setShowImageModal] = useState(false); // ⭐ เพิ่ม state สำหรับดูรูปขนาดใหญ่

  // โหลดข้อมูลโปรไฟล์เมื่อเปิด modal
  useEffect(() => {
    if (!open || !userId) return;

    const loadProfile = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API_BASE}/api/profile/${userId}`, {
          headers: authHeader(),
        });

        if (!res.ok) {
          if (res.status === 404) {
            setError("ไม่พบข้อมูลโปรไฟล์");
          } else if (res.status === 403) {
            setError("ไม่มีสิทธิ์ดูโปรไฟล์นี้");
          } else {
            setError("เกิดข้อผิดพลาดในการโหลดโปรไฟล์");
          }
          return;
        }

        const data = await res.json().catch(() => ({}));
        console.log("📥 Profile data:", data);
        setProfile(data);
      } catch (e) {
        console.error("loadProfile error:", e);
        setError("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [open, userId]);

  if (!open) return null;

  const profilePhoto = resolveFileUrl(profile?.profile?.photoUrl || "");

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative p-6">
        <button
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
          onClick={onClose}
        >
          <X className="w-5 h-5" />
        </button>

        {/* ⭐ ส่วนหัว + รูปโปรไฟล์ */}
        <div className="flex items-center gap-4 mb-6">
          <div 
            className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center cursor-pointer hover:ring-4 hover:ring-blue-200 transition-all"
            onClick={() => profilePhoto && setShowImageModal(true)}
            title={profilePhoto ? "กดเพื่อดูรูปขนาดใหญ่" : "ไม่มีรูปโปรไฟล์"}
          >
            {profilePhoto ? (
              <img
                src={profilePhoto}
                alt="โปรไฟล์ผู้สมัคร"
                className="w-full h-full object-cover"
              />
            ) : (
              <UserIcon className="w-10 h-10 text-blue-400" />
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold mb-1">
              {profile?.profile?.fullName || profile?.name || userName || "ผู้สมัครงาน"}
            </h2>
            {profile?.profile?.headline && (
              <p className="text-blue-600 font-medium mb-1">{profile?.profile?.headline}</p>
            )}
            <p className="text-sm text-gray-500">ข้อมูลผู้สมัครงาน</p>
            {profilePhoto && (
              <p className="text-xs text-blue-500 mt-1">💡 กดที่รูปเพื่อดูขนาดใหญ่</p>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-500">กำลังโหลดโปรไฟล์...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-500">{error}</p>
          </div>
        ) : profile ? (
          <div className="space-y-6">
            {/* ข้อมูลติดต่อ */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Phone className="w-4 h-4" />
                วิธีติดต่อ
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span>{profile.email || "—"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span>{profile?.profile?.phone || "—"}</span>
                </div>
                <div className="flex items-center gap-2 md:col-span-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span>{profile?.profile?.location || "—"}</span>
                </div>
              </div>
            </div>

            {/* ทักษะ */}
            {profile?.profile?.skillsText && (
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  ความสามารถพิเศษ
                </h3>
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-sm text-gray-700 whitespace-pre-line">
                    {profile?.profile?.skillsText}
                  </p>
                </div>
              </div>
            )}

            {/* ประสบการณ์ */}
            {profile?.profile?.experience && (
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  ประสบการณ์ / ผลงาน
                </h3>
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-sm text-gray-700 whitespace-pre-line">
                    {profile?.profile?.experience}
                  </p>
                </div>
              </div>
            )}

            {/* เรซูเม่ */}
            {profile?.profile?.resumeUrl && (
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  ไฟล์เรซูเม่
                </h3>
                <a
                  href={resolveFileUrl(profile?.profile?.resumeUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm font-medium"
                >
                  <FileText className="w-4 h-4" />
                  เปิดดูเรซูเม่
                </a>
              </div>
            )}

            {/* ปุ่มปิด */}
            <div className="flex justify-end pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 rounded-lg text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium"
              >
                ปิด
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">ไม่พบข้อมูลโปรไฟล์</p>
          </div>
        )}
      </div>

      {/* ⭐ Modal ดูรูปโปรไฟล์ขนาดใหญ่ */}
      {showImageModal && profilePhoto && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] px-4"
          onClick={() => setShowImageModal(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center">
            <button
              className="absolute top-4 right-4 text-white hover:text-gray-300 bg-black/50 rounded-full p-2 z-10"
              onClick={() => setShowImageModal(false)}
            >
              <X className="w-6 h-6" />
            </button>
            
            <img
              src={profilePhoto}
              alt="โปรไฟล์ผู้สมัคร - ขนาดใหญ่"
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-lg">
              <p className="text-sm font-medium">
                {profile?.profile?.fullName || profile?.name || userName || "ผู้สมัครงาน"}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
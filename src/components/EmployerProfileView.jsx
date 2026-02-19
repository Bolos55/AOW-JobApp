// src/components/EmployerProfileView.jsx
import React, { useEffect, useState } from "react";
import { X, Building2, MapPin, Phone, Globe, Users, Award } from "lucide-react";
import { API_BASE, authHeader } from "../api";
import { getPhotoUrl } from "../utils/imageUtils";

/* ========= helper แปลง path จาก backend -> URL เต็ม ========= */
const FILE_BASE = API_BASE.replace(/\/api\/?$/, "");

export default function EmployerProfileView({ open, onClose, userId, companyName }) {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [showImageModal, setShowImageModal] = useState(false);

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
            setError("ไม่พบข้อมูลบริษัท");
          } else if (res.status === 403) {
            setError("ไม่มีสิทธิ์ดูข้อมูลนี้");
          } else {
            setError("เกิดข้อผิดพลาดในการโหลดข้อมูล");
          }
          return;
        }

        const data = await res.json().catch(() => ({}));
        setProfile(data);
      } catch (e) {
        console.error("loadEmployerProfile error:", e);
        setError("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [open, userId]);

  if (!open) return null;

  const logoUrl = getPhotoUrl(profile?.profile, "logoUrl");

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative p-6">
        <button
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
          onClick={onClose}
        >
          <X className="w-5 h-5" />
        </button>

        {/* ส่วนหัว + โลโก้บริษัท */}
        <div className="flex items-center gap-4 mb-6">
          <div 
            className="w-20 h-20 rounded-xl overflow-hidden bg-gradient-to-br from-green-100 to-blue-100 flex items-center justify-center cursor-pointer hover:ring-4 hover:ring-green-200 transition-all"
            onClick={() => logoUrl && setShowImageModal(true)}
            title={logoUrl ? "กดเพื่อดูโลโก้ขนาดใหญ่" : "ไม่มีโลโก้"}
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="โลโก้บริษัท"
                className="w-full h-full object-cover"
              />
            ) : (
              <Building2 className="w-10 h-10 text-green-400" />
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold mb-1">
              {profile?.profile?.companyName || profile?.name || companyName || "บริษัท"}
            </h2>
            {profile?.profile?.businessType && (
              <p className="text-green-600 font-medium mb-1">{profile.profile.businessType}</p>
            )}
            <p className="text-sm text-gray-500">ข้อมูลบริษัท</p>
            {logoUrl && (
              <p className="text-xs text-green-500 mt-1">💡 กดที่โลโก้เพื่อดูขนาดใหญ่</p>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-500">กำลังโหลดข้อมูล...</p>
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
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span>{profile.profile?.phone || "—"}</span>
                </div>
                {profile.profile?.website && (
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-gray-400" />
                    <a 
                      href={profile.profile.website} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      เว็บไซต์
                    </a>
                  </div>
                )}
                <div className="flex items-start gap-2 md:col-span-2">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                  <span>{profile.profile?.address || "—"}</span>
                </div>
              </div>
            </div>

            {/* ข้อมูลบริษัท */}
            {profile.profile?.employeeCount && (
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  ขนาดบริษัท
                </h3>
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-sm text-gray-700">
                    จำนวนพนักงาน: {profile.profile.employeeCount}
                  </p>
                </div>
              </div>
            )}

            {/* เกี่ยวกับบริษัท */}
            {profile.profile?.description && (
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  เกี่ยวกับเรา
                </h3>
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-sm text-gray-700 whitespace-pre-line">
                    {profile.profile.description}
                  </p>
                </div>
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
            <p className="text-gray-500">ไม่พบข้อมูลบริษัท</p>
          </div>
        )}
      </div>

      {/* Modal ดูโลโก้ขนาดใหญ่ */}
      {showImageModal && logoUrl && (
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
              src={logoUrl}
              alt="โลโก้บริษัท - ขนาดใหญ่"
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-lg">
              <p className="text-sm font-medium">
                {profile?.profile?.companyName || profile?.name || companyName || "บริษัท"}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
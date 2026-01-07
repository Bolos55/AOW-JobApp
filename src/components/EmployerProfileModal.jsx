// src/components/EmployerProfileModal.jsx
import React, { useEffect, useState } from "react";
import { X, Upload, Building2, MapPin, Phone, Globe, Users, Award } from "lucide-react";
import { API_BASE, authHeader } from "../api";
import { updateProfileInStorage } from "../utils/authUtils";

/* ========= helper แปลง path จาก backend -> URL เต็ม ========= */
const FILE_BASE = API_BASE.replace(/\/api\/?$/, "");

const resolveFileUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `${FILE_BASE.replace(/\/+$/, "")}/${url.replace(/^\/+/, "")}`;
};

export default function EmployerProfileModal({ open, onClose, user, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [profile, setProfile] = useState({
    companyName: "",
    businessType: "",
    description: "",
    address: "",
    phone: "",
    website: "",
    employeeCount: "",
    logoUrl: "",
  });

  // เก็บ error ของแต่ละช่อง
  const [errors, setErrors] = useState({});

  // โหลดข้อมูลโปรไฟล์เมื่อเปิด modal
  useEffect(() => {
    if (!open) return;

    const loadProfile = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/profile/me`, {
          headers: authHeader(),
        });

        if (!res.ok) {
          // ถ้า 404 / error อื่น ๆ ให้ใส่ชื่อจาก user ไว้ให้
          setProfile((prev) => ({
            ...prev,
            companyName: user?.name || "",
          }));
          return;
        }

        const data = await res.json().catch(() => ({}));
        console.log("📥 Employer profile data:", data);

        // รองรับทั้งแบบ { ... } และ { profile: { ... } }
        const p = data.profile || data || {};

        setProfile((prev) => ({
          ...prev,
          companyName: p.companyName ?? user?.name ?? "",
          businessType: p.businessType ?? "",
          description: p.description ?? "",
          address: p.address ?? "",
          phone: p.phone ?? "",
          website: p.website ?? "",
          employeeCount: p.employeeCount ?? "",
          logoUrl: p.logoUrl ?? "",
        }));
      } catch (e) {
        console.error("loadEmployerProfile error:", e);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [open, user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));

    // เคลียร์ error ช่องนั้น ๆ ถ้าพิมพ์แล้ว
    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));
  };

  // validate ก่อนบันทึก
  const validateProfile = () => {
    const newErrors = {};

    if (!profile.companyName.trim()) {
      newErrors.companyName = "กรุณากรอกชื่อบริษัท/ร้าน";
    }
    if (!profile.businessType.trim()) {
      newErrors.businessType = "กรุณาระบุประเภทธุรกิจ";
    }
    if (!profile.description.trim()) {
      newErrors.description = "กรุณาเขียนรายละเอียดเกี่ยวกับบริษัท";
    }
    if (!profile.address.trim()) {
      newErrors.address = "กรุณากรอกที่อยู่บริษัท";
    }
    if (!profile.phone.trim()) {
      newErrors.phone = "กรุณากรอกเบอร์โทรติดต่อ";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // บันทึกข้อมูลโปรไฟล์
  const handleSaveProfile = async () => {
    if (!user) {
      alert("กรุณาเข้าสู่ระบบก่อนแก้ไขโปรไฟล์");
      return;
    }

    if (!validateProfile()) {
      alert("กรุณากรอกข้อมูลให้ครบก่อนบันทึก");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        companyName: profile.companyName || "",
        businessType: profile.businessType || "",
        description: profile.description || "",
        address: profile.address || "",
        phone: profile.phone || "",
        website: profile.website || "",
        employeeCount: profile.employeeCount || "",
        logoUrl: profile.logoUrl || "",
      };

      console.log("📤 PUT /api/profile/me payload:", payload);

      const res = await fetch(`${API_BASE}/api/profile/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...authHeader(),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      console.log("📥 PUT /api/profile/me response:", data);

      if (!res.ok) {
        throw new Error(
          data.message || `บันทึกโปรไฟล์ไม่สำเร็จ (code ${res.status})`
        );
      }

      alert("บันทึกโปรไฟล์บริษัทเรียบร้อยแล้ว");

      // อัปเดต localStorage
      updateProfileInStorage(payload);

      // อัปเดต state
      const p = data.profile || data;
      if (p && typeof p === 'object') {
        setProfile((prev) => ({
          ...prev,
          companyName: p.companyName ?? payload.companyName,
          businessType: p.businessType ?? payload.businessType,
          description: p.description ?? payload.description,
          address: p.address ?? payload.address,
          phone: p.phone ?? payload.phone,
          website: p.website ?? payload.website,
          employeeCount: p.employeeCount ?? payload.employeeCount,
          logoUrl: p.logoUrl ?? prev.logoUrl,
        }));
      }

      // ให้ parent reload โปรไฟล์
      if (typeof onSaved === "function") {
        onSaved();
      }
    } catch (e) {
      console.error("saveEmployerProfile error:", e);
      alert(e.message || "บันทึกโปรไฟล์ไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  // อัปโหลดโลโก้บริษัท
  const handleUploadLogo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const form = new FormData();
      form.append("photo", file); // ใช้ endpoint เดียวกับ photo

      const res = await fetch(`${API_BASE}/api/profile/me/photo`, {
        method: "POST",
        headers: {
          ...authHeader(),
        },
        body: form,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || "อัปโหลดโลโก้ไม่สำเร็จ");
      }

      const url = data.photoUrl || data.profilePhotoUrl || "";
      if (url) {
        setProfile((prev) => ({
          ...prev,
          logoUrl: url,
        }));
        
        updateProfileInStorage({ logoUrl: url });
      }

      alert("อัปโหลดโลโก้บริษัทเรียบร้อยแล้ว");
    } catch (e) {
      console.error("uploadLogo error:", e);
      alert(e.message || "อัปโหลดโลโก้ไม่สำเร็จ");
    } finally {
      setUploadingLogo(false);
      e.target.value = "";
    }
  };

  if (!open) return null;

  const logoUrl = resolveFileUrl(profile.logoUrl || "");

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
        <div className="flex items-center gap-4 mb-4">
          <label className="relative w-20 h-20 rounded-xl overflow-hidden bg-gradient-to-br from-green-100 to-blue-100 flex items-center justify-center cursor-pointer hover:shadow-lg transition-all group border-2 border-dashed border-green-300 hover:border-green-500">
            {logoUrl ? (
              <>
                <img
                  src={logoUrl}
                  alt="โลโก้บริษัท"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="text-center text-white">
                    <Upload className="w-4 h-4 mx-auto mb-1" />
                    <span className="text-xs font-medium">
                      {uploadingLogo ? "กำลังอัปโหลด..." : "เปลี่ยนโลโก้"}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="text-center">
                  <Building2 className="w-8 h-8 text-green-400 mx-auto mb-1" />
                  <span className="text-xs text-green-600 font-medium">ใส่โลโก้</span>
                </div>
                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="text-center text-green-600">
                    <Upload className="w-5 h-5 mx-auto mb-1" />
                    <span className="text-xs font-medium">
                      {uploadingLogo ? "กำลังอัปโหลด..." : "ใส่โลโก้"}
                    </span>
                  </div>
                </div>
              </>
            )}
            
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUploadLogo}
              disabled={uploadingLogo}
            />
          </label>

          <div className="flex-1">
            <h2 className="text-xl font-bold mb-1">ข้อมูลบริษัท/ร้าน</h2>
            <p className="text-sm text-gray-500 mb-2">
              กรอกข้อมูลบริษัทให้ครบถ้วน เพื่อให้ผู้สมัครงานเข้าใจและเชื่อถือ
            </p>
            
            <p className="text-xs text-green-600">
              💡 {logoUrl ? "กดที่โลโก้เพื่อเปลี่ยนใหม่" : "กดเพื่อใส่โลโก้บริษัท"}
            </p>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">กำลังโหลดข้อมูล...</p>
        ) : (
          <div className="space-y-4">
            {/* ข้อมูลพื้นฐาน */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  ชื่อบริษัท/ร้าน <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="companyName"
                  value={profile.companyName}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="เช่น บริษัท ABC จำกัด"
                />
                {errors.companyName && (
                  <p className="text-[11px] text-red-500 mt-1">{errors.companyName}</p>
                )}
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  ประเภทธุรกิจ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="businessType"
                  value={profile.businessType}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="เช่น เทคโนโลยี, ร้านอาหาร, การศึกษา"
                />
                {errors.businessType && (
                  <p className="text-[11px] text-red-500 mt-1">{errors.businessType}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  เบอร์โทรติดต่อ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="phone"
                  value={profile.phone}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="เช่น 02-xxx-xxxx"
                />
                {errors.phone && (
                  <p className="text-[11px] text-red-500 mt-1">{errors.phone}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  จำนวนพนักงาน
                </label>
                <select
                  name="employeeCount"
                  value={profile.employeeCount}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">เลือกจำนวนพนักงาน</option>
                  <option value="1-10">1-10 คน</option>
                  <option value="11-50">11-50 คน</option>
                  <option value="51-200">51-200 คน</option>
                  <option value="201-500">201-500 คน</option>
                  <option value="500+">มากกว่า 500 คน</option>
                </select>
              </div>
            </div>

            {/* เว็บไซต์ */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                เว็บไซต์บริษัท
              </label>
              <input
                type="url"
                name="website"
                value={profile.website}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="เช่น https://www.company.com"
              />
            </div>

            {/* ที่อยู่ */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                ที่อยู่บริษัท <span className="text-red-500">*</span>
              </label>
              <textarea
                name="address"
                value={profile.address}
                onChange={handleChange}
                rows={2}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="ที่อยู่ครบถ้วน รวมรหัสไปรษณีย์"
              />
              {errors.address && (
                <p className="text-[11px] text-red-500 mt-1">{errors.address}</p>
              )}
            </div>

            {/* รายละเอียดบริษัท */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                เกี่ยวกับบริษัท <span className="text-red-500">*</span>
              </label>
              <textarea
                name="description"
                value={profile.description}
                onChange={handleChange}
                rows={4}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="แนะนำบริษัท วิสัยทัศน์ ผลิตภัณฑ์/บริการ และสิ่งที่ทำให้บริษัทพิเศษ"
              />
              {errors.description && (
                <p className="text-[11px] text-red-500 mt-1">{errors.description}</p>
              )}
            </div>

            {/* ปุ่มบันทึก */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                ปิด
              </button>
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-xs bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
              >
                {saving ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
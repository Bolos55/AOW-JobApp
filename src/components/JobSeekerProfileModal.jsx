// src/components/JobSeekerProfileModal.jsx
import { useEffect, useState } from "react";
import { X, Upload, FileText, User as UserIcon } from "lucide-react";
import { API_BASE, authHeader } from "../api";
import { updateProfileInStorage } from "../utils/authUtils";

/* ========= helper แปลง path จาก backend -> URL เต็ม ========= */
const FILE_BASE = API_BASE.replace(/\/api\/?$/, "");

// รับค่าเช่น "uploads/profile/xxx.png" หรือ "http://..." แล้วคืนเป็น URL ที่เปิดได้จริง
const resolveFileUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  // ✅ Add /uploads prefix if not present
  const cleanUrl = url.replace(/^\/+/, "");
  return `${FILE_BASE.replace(/\/+$/, "")}/uploads/${cleanUrl}`;
};

export default function JobSeekerProfileModal({ open, onClose, user, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [profile, setProfile] = useState({
    fullName: "",
    headline: "",
    location: "",
    phone: "",
    skillsText: "",
    experience: "",
    resumeUrl: "",
    photoUrl: "",
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
            fullName: user?.name || "",
          }));
          return;
        }

        const data = await res.json().catch(() => ({}));

        console.log("📥 /api/profile/me ->", data);

        // รองรับทั้งแบบ { ... } และ { profile: { ... } }
        const p = data.profile || data || {};

        setProfile((prev) => ({
          ...prev,
          fullName: p.fullName ?? user?.name ?? "",
          headline: p.headline ?? "",
          location: p.location ?? "",
          phone: p.phone ?? "",
          skillsText: p.skillsText ?? "",
          experience: p.experience ?? "",
          resumeUrl: p.resumeUrl ?? "",
          photoUrl: p.photoUrl ?? "",
        }));
      } catch (e) {
        console.error("loadProfile error:", e);
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

    if (!profile.fullName.trim()) {
      newErrors.fullName = "กรุณากรอกชื่อ–นามสกุล";
    }
    if (!profile.phone.trim()) {
      newErrors.phone = "กรุณากรอกเบอร์โทรติดต่อ";
    }
    if (!profile.location.trim()) {
      newErrors.location = "กรุณากรอกพื้นที่ที่สนใจทำงาน";
    }
    if (!profile.skillsText.trim()) {
      newErrors.skillsText = "กรุณาระบุทักษะที่ถนัด";
    }
    if (!profile.experience.trim()) {
      newErrors.experience = "กรุณาเขียนประสบการณ์ / โปรเจกต์ที่เคยทำ";
    }
    if (!profile.resumeUrl) {
      newErrors.resumeUrl = "กรุณาอัปโหลดเรซูเม่ (PDF / DOC) ก่อน";
    }

    setErrors(newErrors);
    // ถ้าไม่มี key ใน newErrors แปลว่า valid
    return Object.keys(newErrors).length === 0;
  };

  // บันทึกข้อมูลโปรไฟล์ (ไม่รวมไฟล์อัปโหลด)
  const handleSaveProfile = async () => {
    if (!user) {
      alert("กรุณาเข้าสู่ระบบก่อนแก้ไขโปรไฟล์");
      return;
    }

    // ✅ เช็กให้ครบก่อนยิง API
    if (!validateProfile()) {
      alert("กรุณากรอกข้อมูลโปรไฟล์ให้ครบก่อนบันทึก");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        fullName: profile.fullName || "",
        headline: profile.headline || "",
        location: profile.location || "",
        phone: profile.phone || "",
        skillsText: profile.skillsText || "",
        experience: profile.experience || "",
        // ⭐ สำคัญ: ส่ง resumeUrl และ photoUrl ไปด้วย
        resumeUrl: profile.resumeUrl || "",
        photoUrl: profile.photoUrl || "",
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

      alert("บันทึกโปรไฟล์เรียบร้อยแล้ว");

      // ✅ อัปเดต localStorage ด้วยข้อมูลใหม่ (เก็บ resumeUrl และ photoUrl เดิมไว้)
      const updatedProfile = {
        fullName: payload.fullName,
        headline: payload.headline,
        location: payload.location,
        phone: payload.phone,
        skillsText: payload.skillsText,
        experience: payload.experience,
        resumeUrl: profile.resumeUrl, // เก็บ resumeUrl ที่มีอยู่
        photoUrl: profile.photoUrl,   // เก็บ photoUrl ที่มีอยู่
      };
      
      // อัปเดต localStorage
      updateProfileInStorage(updatedProfile);

      // ถ้า backend ส่ง profile กลับมา ก็อัปเดต state ตามนั้นอีกที
      const p = data.profile || data;
      if (p && typeof p === 'object') {
        setProfile((prev) => ({
          ...prev,
          fullName: p.fullName ?? payload.fullName,
          headline: p.headline ?? payload.headline,
          location: p.location ?? payload.location,
          phone: p.phone ?? payload.phone,
          skillsText: p.skillsText ?? payload.skillsText,
          experience: p.experience ?? payload.experience,
          // ⭐ สำคัญ: ใช้ค่าจาก backend หรือค่าเดิม
          resumeUrl: p.resumeUrl ?? prev.resumeUrl,
          photoUrl: p.photoUrl ?? prev.photoUrl,
        }));
      } else {
        // ถ้าไม่มีข้อมูลจาก backend ให้ใช้ payload ที่ส่งไป + เก็บไฟล์เดิม
        setProfile((prev) => ({
          ...prev,
          fullName: payload.fullName,
          headline: payload.headline,
          location: payload.location,
          phone: payload.phone,
          skillsText: payload.skillsText,
          experience: payload.experience,
          // ⭐ สำคัญ: เก็บ resumeUrl และ photoUrl เดิมไว้
          resumeUrl: prev.resumeUrl,
          photoUrl: prev.photoUrl,
        }));
      }

      // ให้ parent reload โปรไฟล์ (เช่น avatar ด้านบน)
      if (typeof onSaved === "function") {
        onSaved();
      }
    } catch (e) {
      console.error("saveProfile error:", e);
      alert(e.message || "บันทึกโปรไฟล์ไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  // อัปโหลดรูปโปรไฟล์
  const handleUploadProfilePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const form = new FormData();
      form.append("photo", file);

      const res = await fetch(`${API_BASE}/api/profile/me/photo`, {
        method: "POST",
        headers: {
          ...authHeader(),
        },
        body: form,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || "อัปโหลดรูปโปรไฟล์ไม่สำเร็จ");
      }

      const url = data.photoUrl || data.profilePhotoUrl || "";
      if (url) {
        setProfile((prev) => ({
          ...prev,
          photoUrl: url,
        }));
        
        // ✅ อัปเดต localStorage ด้วย photoUrl ใหม่
        updateProfileInStorage({ photoUrl: url });
      }

      alert("อัปโหลดรูปโปรไฟล์เรียบร้อยแล้ว");
    } catch (e) {
      console.error("uploadProfilePhoto error:", e);
      alert(e.message || "อัปโหลดรูปโปรไฟล์ไม่สำเร็จ");
    } finally {
      setUploadingPhoto(false);
      e.target.value = "";
    }
  };

  // อัปโหลดเรซูเม่
  const handleUploadResume = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingResume(true);
    try {
      const form = new FormData();
      form.append("resume", file);

      const res = await fetch(`${API_BASE}/api/profile/me/resume`, {
        method: "POST",
        headers: {
          ...authHeader(),
        },
        body: form,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || "อัปโหลดเรซูเม่ไม่สำเร็จ");
      }

      setProfile((prev) => ({
        ...prev,
        resumeUrl: data.resumeUrl || prev.resumeUrl,
      }));

      // ✅ อัปเดต localStorage ด้วย resumeUrl ใหม่
      updateProfileInStorage({ resumeUrl: data.resumeUrl || "" });

      // อัปโหลดแล้วเคลียร์ error เรซูเม่
      setErrors((prev) => ({
        ...prev,
        resumeUrl: "",
      }));

      alert("อัปโหลดเรซูเม่เรียบร้อยแล้ว");
    } catch (e) {
      console.error("uploadResume error:", e);
      alert(e.message || "อัปโหลดเรซูเม่ไม่สำเร็จ");
    } finally {
      setUploadingResume(false);
      e.target.value = "";
    }
  };

  if (!open) return null;

  const rawPhoto =
    profile.photoUrl ||
    user?.profilePhotoUrl ||
    user?.photoUrl ||
    user?.avatarUrl ||
    "";

  const profilePhoto = resolveFileUrl(rawPhoto);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative p-6">
        <button
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
          onClick={onClose}
        >
          <X className="w-5 h-5" />
        </button>

        {/* ⭐ ส่วนหัว + รูปโปรไฟล์ + ปุ่มอัปโหลดรูป */}
        <div className="flex items-center gap-4 mb-4">
          {/* รูปโปรไฟล์ที่คลิกได้ */}
          <label className="relative w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center cursor-pointer hover:shadow-lg transition-all group border-2 border-dashed border-blue-300 hover:border-blue-500">
            {profilePhoto ? (
              <>
                <img
                  src={profilePhoto}
                  alt="โปรไฟล์ผู้สมัคร"
                  className="w-full h-full object-cover"
                />
                {/* Overlay เมื่อ hover - แสดงเฉพาะเมื่อมีรูปแล้ว */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="text-center text-white">
                    <Upload className="w-4 h-4 mx-auto mb-1" />
                    <span className="text-xs font-medium">
                      {uploadingPhoto ? "กำลังอัปโหลด..." : "เปลี่ยนรูป"}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="text-center">
                  <UserIcon className="w-8 h-8 text-blue-400 mx-auto mb-1" />
                  <span className="text-xs text-blue-600 font-medium">ใส่รูป</span>
                </div>
                {/* Overlay เมื่อ hover - แสดงเฉพาะเมื่อยังไม่มีรูป */}
                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="text-center text-blue-600">
                    <Upload className="w-5 h-5 mx-auto mb-1" />
                    <span className="text-xs font-medium">
                      {uploadingPhoto ? "กำลังอัปโหลด..." : "ใส่รูป"}
                    </span>
                  </div>
                </div>
              </>
            )}
            
            <input
              id="profile-photo-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUploadProfilePhoto}
              disabled={uploadingPhoto}
              autoComplete="photo"
            />
          </label>

          <div className="flex-1">
            <h2 className="text-xl font-bold mb-1">แก้ไขข้อมูลส่วนตัว</h2>
            <p className="text-sm text-gray-500 mb-2">
              กรอกข้อมูลของคุณให้ครบถ้วน เพื่อให้นายจ้างสามารถติดต่อคุณได้
            </p>
            
            {/* คำแนะนำการอัปโหลดรูป */}
            <p className="text-xs text-blue-600">
              💡 {profilePhoto ? "กดที่รูปเพื่อเปลี่ยนรูปใหม่" : "กดที่รูปเพื่อใส่รูปของคุณ"}
            </p>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">กำลังโหลดโปรไฟล์...</p>
        ) : (
          <div className="space-y-4">
            {/* ข้อมูลส่วนตัว */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="fullName" className="block text-xs font-semibold text-gray-600 mb-1">
                  ชื่อ–นามสกุล <span className="text-red-500">*</span>
                </label>
                <input
                  id="fullName"
                  type="text"
                  name="fullName"
                  value={profile.fullName}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="เช่น นาย ชัยวัฒน์ สมบูรณ์"
                  autoComplete="name"
                />
                {errors.fullName && (
                  <p className="text-[11px] text-red-500 mt-1">
                    {errors.fullName}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="phone" className="block text-xs font-semibold text-gray-600 mb-1">
                  เบอร์โทรติดต่อ <span className="text-red-500">*</span>
                </label>
                <input
                  id="phone"
                  type="tel"
                  name="phone"
                  value={profile.phone}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="เช่น 08x-xxx-xxxx"
                  autoComplete="tel"
                />
                {errors.phone && (
                  <p className="text-[11px] text-red-500 mt-1">
                    {errors.phone}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="location" className="block text-xs font-semibold text-gray-600 mb-1">
                  พื้นที่ที่สนใจทำงาน <span className="text-red-500">*</span>
                </label>
                <input
                  id="location"
                  type="text"
                  name="location"
                  value={profile.location}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="เช่น กรุงเทพ, นนทบุรี, ทำงานจากบ้าน"
                  autoComplete="address-level1"
                />
                {errors.location && (
                  <p className="text-[11px] text-red-500 mt-1">
                    {errors.location}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="headline" className="block text-xs font-semibold text-gray-600 mb-1">
                  หัวข้อแนะนำตัวสั้น ๆ (Headline)
                </label>
                <input
                  id="headline"
                  type="text"
                  name="headline"
                  value={profile.headline}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="เช่น พนักงานออฟฟิศ ประสบการณ์ 3 ปี กำลังหางาน"
                  autoComplete="organization-title"
                />
              </div>
            </div>

            {/* ลิงก์รูปโปรไฟล์ (ซ่อนไว้ - ใช้อัปโหลดไฟล์แทน) 
            {false && (
            <div>
              <label htmlFor="photoUrl" className="block text-xs font-semibold text-gray-600 mb-1">
                ลิงก์รูปโปรไฟล์ (ไม่บังคับ)
              </label>
              <input
                id="photoUrl"
                type="url"
                name="photoUrl"
                value={profile.photoUrl}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="เช่น https://... (ลิงก์รูปที่เปิดสาธารณะได้)"
                autoComplete="url"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                วางลิงก์รูปจาก Google Drive, Cloud, หรือโฮสต์อื่นที่ตั้งค่าให้แชร์สาธารณะ
              </p>
            </div>
            )}
            */}

            {/* ทักษะ & ประสบการณ์ */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                ทักษะที่ถนัด <span className="text-red-500">*</span>
              </label>
              <textarea
                name="skillsText"
                value={profile.skillsText}
                onChange={handleChange}
                rows={3}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="เช่น งานขาย, ใช้คอมพื้นฐาน, ดูแลลูกค้า, ขับรถ, ทำอาหาร, ภาษาอังกฤษ"
              />
              {errors.skillsText && (
                <p className="text-[11px] text-red-500 mt-1">
                  {errors.skillsText}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                ประสบการณ์ทำงาน / โปรเจกต์ที่เคยทำ{" "}
                <span className="text-red-500">*</span>
              </label>
              <textarea
                name="experience"
                value={profile.experience}
                onChange={handleChange}
                rows={4}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="เช่น เคยทำงานขายของในห้าง 2 ปี ดูแลลูกค้า จัดการสต๊อกสินค้า หรือ เคยช่วยงานร้านอาหารครอบครัว รับออเดอร์ เสิร์ฟอาหาร"
              />
              {errors.experience && (
                <p className="text-[11px] text-red-500 mt-1">
                  {errors.experience}
                </p>
              )}
            </div>

            {/* เรซูเม่ */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-3">
                ไฟล์เรซูเม่ของคุณ <span className="text-red-500">*</span>
              </h3>

              {/* กล่องอัปโหลดเรซูเม่แบบ drag & drop */}
              <label className="block w-full p-6 border-2 border-dashed border-blue-300 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all group">
                <div className="text-center">
                  {profile.resumeUrl ? (
                    <div className="space-y-2">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                        <FileText className="w-6 h-6 text-green-600" />
                      </div>
                      <p className="text-sm font-medium text-green-700">มีเรซูเม่แล้ว!</p>
                      <p className="text-xs text-gray-500">กดเพื่อเปลี่ยนไฟล์ใหม่</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto group-hover:bg-blue-200 transition-colors">
                        <Upload className="w-6 h-6 text-blue-600" />
                      </div>
                      <p className="text-sm font-medium text-gray-700">ใส่ไฟล์เรซูเม่</p>
                      <p className="text-xs text-gray-500">กดหรือลากไฟล์ PDF, DOC มาวางที่นี่</p>
                    </div>
                  )}
                  
                  {uploadingResume && (
                    <p className="text-xs text-blue-600 mt-2 font-medium">กำลังอัปโหลด...</p>
                  )}
                </div>
                
                <input
                  id="resume-upload"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  onChange={handleUploadResume}
                  disabled={uploadingResume}
                  autoComplete="off"
                />
              </label>

              {/* ปุ่มดูเรซูเม่ */}
              {profile.resumeUrl && (
                <div className="mt-3 text-center">
                  <a
                    href={resolveFileUrl(profile.resumeUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    <FileText className="w-4 h-4" />
                    เปิดดูเรซูเม่ที่อัปโหลดไว้
                  </a>
                </div>
              )}

              {errors.resumeUrl && (
                <p className="text-[11px] text-red-500 mt-2 text-center">
                  {errors.resumeUrl}
                </p>
              )}
            </div>

            {/* ปุ่มบันทึก */}
            <div className="flex justify-end gap-2 pt-2">
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
                className="px-4 py-2 rounded-lg text-xs bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? "กำลังบันทึก..." : "บันทึกโปรไฟล์"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

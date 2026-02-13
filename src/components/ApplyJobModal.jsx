// src/components/ApplyJobModal.jsx
import React, { useState, useEffect } from "react";
import { X, Upload, FileText, User, CheckCircle } from "lucide-react";
import { API_BASE, authHeader } from "../api";

export default function ApplyJobModal({ open, onClose, job }) {
  const [coverLetter, setCoverLetter] = useState("");
  const [profile, setProfile] = useState("");
  const [resume, setResume] = useState(null);
  const [resumeName, setResumeName] = useState("");
  
  // ✅ เพิ่มสำหรับเรซูเม่จากโปรไฟล์
  const [userProfile, setUserProfile] = useState(null);
  const [useProfileResume, setUseProfileResume] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // ✅ เพิ่มสำหรับบัตรประชาชน
  const [idCard, setIdCard] = useState(null);
  const [idCardName, setIdCardName] = useState("");

  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ โหลดข้อมูลโปรไฟล์เมื่อเปิด modal
  useEffect(() => {
    if (!open) return;

    const loadUserProfile = async () => {
      setLoadingProfile(true);
      try {
        const res = await fetch(`${API_BASE}/api/profile/me`, {
          headers: authHeader(),
        });

        if (res.ok) {
          const data = await res.json();
          const profileData = data.profile || data || {};
          setUserProfile(profileData);
          
          // ถ้ามีเรซูเม่ในโปรไฟล์ ให้เลือกใช้เป็นค่าเริ่มต้น
          if (profileData.resumeUrl) {
            setUseProfileResume(true);
          }
          
          // ใส่ข้อมูลโปรไฟล์ลงในช่อง profile
          if (profileData.experience || profileData.skillsText) {
            const profileText = [
              profileData.headline && `🎯 ${profileData.headline}`,
              profileData.skillsText && `💼 ทักษะ: ${profileData.skillsText}`,
              profileData.experience && `📋 ประสบการณ์: ${profileData.experience}`,
              profileData.location && `📍 พื้นที่: ${profileData.location}`
            ].filter(Boolean).join('\n\n');
            
            setProfile(profileText);
          }
        }
      } catch (e) {
        console.error("Load profile error:", e);
      } finally {
        setLoadingProfile(false);
      }
    };

    loadUserProfile();
  }, [open]);

  if (!open || !job) return null;

  const onPickResume = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setMsg("ไฟล์ต้องไม่เกิน 5MB");
      return;
    }
    const allowed = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/jpeg",
      "image/png",
    ];
    if (!allowed.includes(file.type)) {
      setMsg("รองรับเฉพาะ PDF, DOC, DOCX, JPG, PNG");
      return;
    }
    setResume(file);
    setResumeName(file.name);
    setMsg("");
  };

  // ✅ handler สำหรับไฟล์บัตรประชาชน (เฉพาะรูป)
  const onPickIdCard = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setMsg("รูปบัตรประชาชนต้องไม่เกิน 5MB");
      return;
    }
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setMsg("รูปบัตรประชาชนรองรับเฉพาะ JPG / PNG");
      return;
    }

    // ✅ ไม่ตรวจสอบขนาดรูปภาพ - รับทุกขนาด
    setIdCard(file);
    setIdCardName(file.name);
    setMsg("");
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!coverLetter.trim() || coverLetter.length < 50) {
      setMsg("กรุณาเขียนจดหมายสมัครงานอย่างน้อย 50 ตัวอักษร");
      return;
    }
    
    // ✅ ตรวจสอบเรซูเม่ - ใช้จากโปรไฟล์หรืออัปโหลดใหม่
    if (!useProfileResume && !resume) {
      setMsg("กรุณาแนบไฟล์เรซูเม่ หรือเลือกใช้เรซูเม่จากโปรไฟล์");
      return;
    }
    if (useProfileResume && !userProfile?.resumeUrl) {
      setMsg("ไม่พบเรซูเม่ในโปรไฟล์ กรุณาอัปโหลดไฟล์เรซูเม่");
      return;
    }
    
    if (!idCard) {
      setMsg("กรุณาอัปโหลดรูปบัตรประชาชนเพื่อยืนยันสิทธิ์");
      return;
    }

    // ✅ เพิ่มการยืนยันข้อมูลก่อนส่ง
    const resumeInfo = useProfileResume 
      ? `เรซูเม่จากโปรไฟล์ (${userProfile?.resumeUrl?.split('/').pop() || 'ไฟล์โปรไฟล์'})`
      : resumeName;

    const confirmMessage = `
🔍 ยืนยันการส่งใบสมัคร

ตำแหน่ง: ${job.title}
บริษัท: ${job.company}

📋 เอกสารที่แนบ:
• จดหมายสมัครงาน: ${coverLetter.length} ตัวอักษร
• เรซูเม่: ${resumeInfo}
• บัตรประชาชน: ${idCardName}

⚠️ หมายเหตุสำคัญ:
- ข้อมูลจะถูกส่งให้นายจ้างและแอดมินตรวจสอบ
- บัตรประชาชนจะใช้สำหรับยืนยันตัวตนเท่านั้น
- ไม่สามารถแก้ไขหลังส่งแล้ว

ยืนยันการส่งใบสมัครหรือไม่?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setLoading(true);
    setMsg("");
    try {
      const fd = new FormData();
      fd.append("jobId", job._id);
      fd.append("message", coverLetter);
      fd.append("profile", profile);
      
      // ✅ ส่งเรซูเม่ตามที่เลือก
      if (useProfileResume && userProfile?.resumeUrl) {
        fd.append("useProfileResume", "true");
        fd.append("profileResumeUrl", userProfile.resumeUrl);
      } else if (resume) {
        fd.append("resume", resume);
      }
      
      fd.append("idCard", idCard); // ✅ แนบไฟล์บัตร ปชช.

      // ✅ เพิ่มข้อมูล metadata สำหรับการตรวจสอบ
      const screenWidth = window.innerWidth || 0;
      const screenHeight = window.innerHeight || 0;
      
      fd.append("applicationMetadata", JSON.stringify({
        submittedAt: new Date().toISOString(),
        userAgent: navigator.userAgent,
        screenResolution: `${screenWidth}x${screenHeight}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        resumeSource: useProfileResume ? "profile" : "upload"
      }));

      // ❗ เปลี่ยนตรงนี้ให้ตรงกับ backend
      const res = await fetch(`${API_BASE}/api/applications`, {
        method: "POST",
        headers: { ...authHeader() }, // ห้าม set Content-Type เอง
        body: fd,
      });

      const data = await res.json();
      if (!res.ok) {
        setMsg(data.message || "ส่งใบสมัครไม่สำเร็จ");
        setLoading(false);
        return;
      }
      setLoading(false);

      // เคลียร์ฟอร์ม
      setCoverLetter("");
      setProfile("");
      setResume(null);
      setResumeName("");
      setIdCard(null);
      setIdCardName("");
      setUseProfileResume(false);

      onClose();
      
      // ✅ ข้อความแจ้งเตือนที่ชัดเจนขึ้น
      alert(`✅ ส่งใบสมัครสำเร็จ!

📋 รหัสใบสมัคร: ${data.applicationId || 'กำลังสร้าง'}

🔄 ขั้นตอนต่อไป:
1. แอดมินจะตรวจสอบบัตรประชาชน (1-3 วันทำการ)
2. นายจ้างจะพิจารณาใบสมัคร
3. คุณจะได้รับการติดต่อกลับ

💡 คุณสามารถติดตามสถานะได้ในหน้า "งานที่เคยสมัครแล้ว"`);
    } catch (err) {
      setLoading(false);
      setMsg("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 relative shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold mb-1">สมัครงาน: {job.title}</h2>
        <p className="text-xs text-gray-500 mb-4">
          {job.company} • {job.jobCode}
        </p>

        {/* ✅ เพิ่มข้อมูลความปลอดภัยและขั้นตอน */}
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-sm font-semibold text-blue-800 mb-2">🛡️ ระบบความปลอดภัย</h3>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• ข้อมูลส่วนตัวจะถูกเข้ารหัสและปกป้องตามมาตรฐาน</li>
            <li>• บัตรประชาชนใช้เฉพาะการยืนยันตัวตนโดยแอดมิน</li>
            <li>• ไม่เปิดเผยข้อมูลให้บุคคลที่สาม</li>
            <li>• สามารถขอลบข้อมูลได้ตามกฎหมาย PDPA</li>
          </ul>
        </div>

        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="text-sm font-semibold text-green-800 mb-2">📋 ขั้นตอนการสมัคร</h3>
          <div className="text-xs text-green-700 space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 bg-green-600 text-white rounded-full flex items-center justify-center text-[10px]">1</span>
              <span>กรอกข้อมูลและแนบเอกสาร</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 bg-yellow-500 text-white rounded-full flex items-center justify-center text-[10px]">2</span>
              <span>แอดมินตรวจสอบบัตรประชาชน (1-3 วันทำการ)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px]">3</span>
              <span>นายจ้างพิจารณาใบสมัคร</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 bg-purple-600 text-white rounded-full flex items-center justify-center text-[10px]">4</span>
              <span>ได้รับการติดต่อกลับ</span>
            </div>
          </div>
        </div>

        {msg && (
          <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg mb-3">
            {msg}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-gray-600">
              จดหมายสมัครงาน (≥ 50 ตัวอักษร) *
            </label>
            <textarea
              className="w-full border rounded-lg px-3 py-2 mt-1 min-h-[90px]"
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              placeholder="เล่าความสนใจ ประสบการณ์ และเหตุผลที่เหมาะกับตำแหน่งนี้"
            />
          </div>

          <div>
            <label className="text-sm text-gray-600">
              โปรไฟล์/สรุปประสบการณ์ (optional)
            </label>
            <textarea
              className="w-full border rounded-lg px-3 py-2 mt-1 min-h-[70px]"
              value={profile}
              onChange={(e) => setProfile(e.target.value)}
              placeholder="ทักษะเด่น, โครงการ, ผลงาน, ลิงก์พอร์ต ฯลฯ"
            />
          </div>

          {/* ✅ เลือกเรซูเม่ */}
          <div>
            <label className="text-sm text-gray-600 mb-2 block">
              เรซูเม่ *
            </label>
            
            {loadingProfile ? (
              <div className="p-4 border rounded-lg bg-gray-50">
                <p className="text-sm text-gray-500">กำลังโหลดข้อมูลโปรไฟล์...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* ตัวเลือกใช้เรซูเม่จากโปรไฟล์ */}
                {userProfile?.resumeUrl && (
                  <div className="border rounded-lg p-3">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        id="useProfileResume"
                        type="radio"
                        name="resumeChoice"
                        checked={useProfileResume}
                        onChange={() => {
                          setUseProfileResume(true);
                          setResume(null);
                          setResumeName("");
                        }}
                        className="mt-1"
                        autoComplete="off"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-medium text-green-700">
                            ใช้เรซูเม่จากโปรไฟล์
                          </span>
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        </div>
                        <p className="text-xs text-gray-600">
                          ไฟล์: {userProfile.resumeUrl.split('/').pop() || 'เรซูเม่โปรไฟล์'}
                        </p>
                        <a
                          href={`${API_BASE.replace(/\/api\/?$/, "")}/${userProfile.resumeUrl}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          ดูเรซูเม่ที่อัปโหลดไว้
                        </a>
                      </div>
                    </label>
                  </div>
                )}

                {/* ตัวเลือกอัปโหลดเรซูเม่ใหม่ */}
                <div className="border rounded-lg p-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      id="uploadNewResume"
                      type="radio"
                      name="resumeChoice"
                      checked={!useProfileResume}
                      onChange={() => setUseProfileResume(false)}
                      className="mt-1"
                      autoComplete="off"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Upload className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-gray-700">
                          อัปโหลดเรซูเม่ใหม่
                        </span>
                      </div>
                      
                      {!useProfileResume && (
                        <div className="space-y-2">
                          <p className="text-xs text-gray-500">
                            รองรับ PDF, DOC, DOCX, JPG, PNG ≤ 5MB
                          </p>
                          <div className="flex items-center gap-3">
                            <label className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                              <Upload className="w-4 h-4" />
                              <span className="text-sm">เลือกไฟล์</span>
                              <input 
                                id="resumeFileUpload"
                                type="file" 
                                className="hidden" 
                                onChange={onPickResume}
                                accept=".pdf,.doc,.docx"
                                autoComplete="off"
                              />
                            </label>
                            {resumeName && (
                              <span className="text-xs text-gray-600 flex items-center gap-1">
                                <FileText className="w-4 h-4" />
                                {resumeName}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </label>
                </div>

                {/* แสดงข้อความแนะนำถ้าไม่มีเรซูเม่ในโปรไฟล์ */}
                {!userProfile?.resumeUrl && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-blue-700">
                      💡 <strong>เคล็ดลับ:</strong> อัปโหลดเรซูเม่ในโปรไฟล์เพื่อใช้สมัครงานได้สะดวกขึ้น
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ✅ แนบรูปบัตรประชาชน */}
          <div>
            <label className="text-sm text-gray-600">
              รูปบัตรประชาชน (JPG/PNG ≤ 5MB) *
            </label>
            
            <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="text-xs font-semibold text-yellow-800 mb-1">⚠️ คำแนะนำความปลอดภัย</h4>
              <ul className="text-xs text-yellow-700 space-y-1">
                <li>• <strong>แนะนำ:</strong> ปิดบังเลขท้าย 4 หลักของบัตรประชาชน</li>
                <li>• <strong>ห้าม:</strong> ส่งรูปบัตรที่เห็นข้อมูลครบทุกหลัก</li>
                <li>• <strong>ตัวอย่าง:</strong> 1-2345-67890-XX-X (ปิดบัง XX)</li>
                <li>• <strong>วัตถุประสงค์:</strong> ใช้เฉพาะยืนยันตัวตนโดยแอดมิน</li>
              </ul>
            </div>

            <div className="mt-2 flex items-center gap-3">
              <label className="inline-flex items-center gap-2 px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                <Upload className="w-4 h-4" />
                <span className="text-sm">อัปโหลดรูปบัตรประชาชน</span>
                <input
                  id="idCardUpload"
                  type="file"
                  accept="image/jpeg,image/png"
                  className="hidden"
                  onChange={onPickIdCard}
                  autoComplete="off"
                />
              </label>
              {idCardName && (
                <span className="text-xs text-green-600 flex items-center gap-1 bg-green-50 px-2 py-1 rounded">
                  <FileText className="w-4 h-4" />
                  {idCardName}
                </span>
              )}
            </div>

            {idCard && (
              <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                <p className="text-xs text-green-700">
                  ✅ อัปโหลดสำเร็จ - ตรวจสอบให้แน่ใจว่าได้ปิดบังข้อมูลสำคัญแล้ว
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-medium disabled:opacity-60"
            >
              {loading ? "กำลังส่ง..." : "ส่งใบสมัคร"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 rounded-xl border text-gray-600"
            >
              ยกเลิก
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

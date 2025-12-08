// src/components/ApplyJobModal.jsx
import React, { useState } from "react";
import { X, Upload, FileText } from "lucide-react";
import { API_BASE, authHeader } from "../api";

export default function ApplyJobModal({ open, onClose, job }) {
  const [coverLetter, setCoverLetter] = useState("");
  const [profile, setProfile] = useState("");
  const [resume, setResume] = useState(null);
  const [resumeName, setResumeName] = useState("");

  // ✅ เพิ่มสำหรับบัตรประชาชน
  const [idCard, setIdCard] = useState(null);
  const [idCardName, setIdCardName] = useState("");

  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

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
    if (!resume) {
      setMsg("กรุณาแนบไฟล์เรซูเม่");
      return;
    }
    if (!idCard) {
      setMsg("กรุณาอัปโหลดรูปบัตรประชาชนเพื่อยืนยันสิทธิ์");
      return;
    }

    setLoading(true);
    setMsg("");
    try {
      const fd = new FormData();
      fd.append("jobId", job._id);
      fd.append("message", coverLetter);
      fd.append("profile", profile);
      fd.append("resume", resume);
      fd.append("idCard", idCard); // ✅ แนบไฟล์บัตร ปชช.

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

      onClose();
      alert("✅ ส่งใบสมัครสำเร็จ! รอแอดมินตรวจสอบยืนยันตัวตน");
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

          {/* แนบเรซูเม่ */}
          <div>
            <label className="text-sm text-gray-600">
              แนบเรซูเม่ (PDF/DOC/DOCX/JPG/PNG ≤ 5MB) *
            </label>
            <div className="mt-1 flex items-center gap-3">
              <label className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                <Upload className="w-4 h-4" />
                <span className="text-sm">อัปโหลดไฟล์</span>
                <input type="file" className="hidden" onChange={onPickResume} />
              </label>
              {resumeName && (
                <span className="text-xs text-gray-600 flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  {resumeName}
                </span>
              )}
            </div>
          </div>

          {/* ✅ แนบรูปบัตรประชาชน */}
          <div>
            <label className="text-sm text-gray-600">
              รูปบัตรประชาชน (JPG/PNG ≤ 5MB) *
            </label>
            <p className="text-xs text-gray-500 mt-1">
              ใช้สำหรับยืนยันสิทธิ์โดยแอดมิน แนะนำให้ปิดบังเลขท้ายบางส่วนเพื่อความปลอดภัย
            </p>
            <div className="mt-1 flex items-center gap-3">
              <label className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                <Upload className="w-4 h-4" />
                <span className="text-sm">อัปโหลดรูปบัตรประชาชน</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  className="hidden"
                  onChange={onPickIdCard}
                />
              </label>
              {idCardName && (
                <span className="text-xs text-gray-600 flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  {idCardName}
                </span>
              )}
            </div>
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

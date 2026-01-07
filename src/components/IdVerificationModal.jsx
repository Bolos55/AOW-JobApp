// src/components/IdVerificationModal.jsx
import React, { useState, useEffect } from "react";
import { X, Eye, Check, AlertTriangle, User, Calendar, MapPin, Hash } from "lucide-react";
import { API_BASE, authHeader } from "../api";

export default function IdVerificationModal({ open, onClose, application, onVerified }) {
  const [loading, setLoading] = useState(false);
  const [idCardData, setIdCardData] = useState({
    idNumber: "",
    fullName: "",
    birthDate: "",
    address: "",
    issueDate: "",
    expiryDate: "",
  });
  const [verificationNotes, setVerificationNotes] = useState("");
  const [verificationResult, setVerificationResult] = useState(""); // "approved", "rejected", ""

  // เคลียร์ข้อมูลเมื่อเปิด modal ใหม่
  useEffect(() => {
    if (open) {
      setIdCardData({
        idNumber: "",
        fullName: "",
        birthDate: "",
        address: "",
        issueDate: "",
        expiryDate: "",
      });
      setVerificationNotes("");
      setVerificationResult("");
    }
  }, [open]);

  if (!open || !application) return null;

  const openIdCardImage = () => {
    if (!application.idCardPath) {
      alert("ไม่พบรูปบัตรประชาชน");
      return;
    }
    
    const base = API_BASE.replace(/\/api\/?$/, "");
    const url = `${base}/${application.idCardPath}`;
    
    // ✅ ตรวจสอบว่าไฟล์มีอยู่จริงหรือไม่ก่อนเปิด
    fetch(url, { method: 'HEAD' })
      .then(response => {
        if (response.ok) {
          window.open(url, "_blank");
        } else {
          alert("❌ ไฟล์บัตรประชาชนไม่พบในระบบ\n\nอาจเป็นเพราะ:\n- ไฟล์ถูกลบหรือย้ายแล้ว\n- ระบบอัปโหลดมีปัญหา\n\nกรุณาให้ผู้สมัครอัปโหลดบัตรใหม่");
        }
      })
      .catch(() => {
        alert("❌ ไม่สามารถเข้าถึงไฟล์บัตรประชาชนได้\n\nกรุณาตรวจสอบการเชื่อมต่อเครือข่าย หรือให้ผู้สมัครอัปโหลดบัตรใหม่");
      });
  };

  const handleVerify = async () => {
    if (!verificationResult) {
      alert("กรุณาเลือกผลการตรวจสอบ");
      return;
    }

    if (verificationResult === "approved") {
      // ตรวจสอบข้อมูลที่จำเป็น
      if (!idCardData.idNumber.trim()) {
        alert("กรุณากรอกเลขบัตรประชาชน");
        return;
      }
      if (!idCardData.fullName.trim()) {
        alert("กรุณากรอกชื่อ-นามสกุลจากบัตร");
        return;
      }
      if (!idCardData.birthDate) {
        alert("กรุณากรอกวันเกิดจากบัตร");
        return;
      }
    }

    if (!verificationNotes.trim()) {
      alert("กรุณากรอกหมายเหตุการตรวจสอบ");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        verified: verificationResult === "approved",
        idCardData: verificationResult === "approved" ? idCardData : null,
        verificationNotes,
        verificationResult,
      };

      const res = await fetch(
        `${API_BASE}/api/admin/applications/${application._id}/verify-detailed`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...authHeader(),
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "บันทึกการตรวจสอบไม่สำเร็จ");
      }

      alert(
        verificationResult === "approved"
          ? "✅ ยืนยันตัวตนเรียบร้อยแล้ว"
          : "❌ ปฏิเสธการยืนยันตัวตนแล้ว"
      );

      if (typeof onVerified === "function") {
        onVerified(data);
      }
      onClose();
    } catch (e) {
      console.error("Verification error:", e);
      alert(e.message || "เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative p-6">
        <button
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
          onClick={onClose}
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <User className="w-5 h-5" />
          ตรวจสอบยืนยันตัวตน
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ข้อมูลผู้สมัคร */}
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-2">ข้อมูลผู้สมัคร</h3>
              <div className="space-y-2 text-sm">
                <div><strong>ชื่อ:</strong> {application.applicantName}</div>
                <div><strong>อีเมล:</strong> {application.applicantEmail}</div>
                <div><strong>ตำแหน่ง:</strong> {application.jobTitle}</div>
                <div><strong>วันที่สมัคร:</strong> {new Date(application.createdAt).toLocaleDateString('th-TH')}</div>
              </div>
            </div>

            {/* รูปบัตรประชาชน */}
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Eye className="w-4 h-4" />
                รูปบัตรประชาชน
              </h3>
              {application.idCardPath ? (
                <button
                  onClick={openIdCardImage}
                  className="w-full p-4 border-2 border-dashed border-blue-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <div className="text-center">
                    <Eye className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                    <p className="text-sm font-medium text-blue-700">กดเพื่อดูรูปบัตรประชาชน</p>
                    <p className="text-xs text-gray-500 mt-1">เปิดในแท็บใหม่</p>
                  </div>
                </button>
              ) : (
                <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                  <p className="text-red-600 text-sm">ไม่พบรูปบัตรประชาชน</p>
                </div>
              )}
            </div>
          </div>

          {/* ฟอร์มตรวจสอบ */}
          <div className="space-y-4">
            <div className="bg-yellow-50 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-800 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                คำแนะนำการตรวจสอบ
              </h3>
              <ul className="text-xs text-yellow-700 space-y-1">
                <li>• ตรวจสอบความชัดเจนของรูปบัตร</li>
                <li>• เปรียบเทียบชื่อ-นามสกุลกับข้อมูลผู้สมัคร</li>
                <li>• ตรวจสอบวันหมดอายุของบัตร</li>
                <li>• ระวังบัตรปลอมหรือแก้ไข</li>
              </ul>
            </div>

            {/* ผลการตรวจสอบ */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                ผลการตรวจสอบ *
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-green-50">
                  <input
                    type="radio"
                    name="verificationResult"
                    value="approved"
                    checked={verificationResult === "approved"}
                    onChange={(e) => setVerificationResult(e.target.value)}
                    className="text-green-600"
                  />
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700">อนุมัติ - บัตรถูกต้องและน่าเชื่อถือ</span>
                </label>
                <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-red-50">
                  <input
                    type="radio"
                    name="verificationResult"
                    value="rejected"
                    checked={verificationResult === "rejected"}
                    onChange={(e) => setVerificationResult(e.target.value)}
                    className="text-red-600"
                  />
                  <X className="w-4 h-4 text-red-600" />
                  <span className="text-sm font-medium text-red-700">ปฏิเสธ - บัตรไม่ชัด หรือมีปัญหา</span>
                </label>
              </div>
            </div>

            {/* ข้อมูลจากบัตร (แสดงเฉพาะเมื่ออนุมัติ) */}
            {verificationResult === "approved" && (
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-700">ข้อมูลจากบัตรประชาชน</h4>
                
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    <Hash className="w-3 h-3 inline mr-1" />
                    เลขบัตรประชาชน *
                  </label>
                  <input
                    type="text"
                    value={idCardData.idNumber}
                    onChange={(e) => setIdCardData(prev => ({ ...prev, idNumber: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="1-xxxx-xxxxx-xx-x"
                    maxLength={17}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    <User className="w-3 h-3 inline mr-1" />
                    ชื่อ-นามสกุล (จากบัตร) *
                  </label>
                  <input
                    type="text"
                    value={idCardData.fullName}
                    onChange={(e) => setIdCardData(prev => ({ ...prev, fullName: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="ชื่อ-นามสกุลตามบัตร"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    <Calendar className="w-3 h-3 inline mr-1" />
                    วันเกิด *
                  </label>
                  <input
                    type="date"
                    value={idCardData.birthDate}
                    onChange={(e) => setIdCardData(prev => ({ ...prev, birthDate: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    <MapPin className="w-3 h-3 inline mr-1" />
                    ที่อยู่ (ไม่บังคับ)
                  </label>
                  <textarea
                    value={idCardData.address}
                    onChange={(e) => setIdCardData(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    rows={2}
                    placeholder="ที่อยู่ตามบัตร"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">วันออกบัตร</label>
                    <input
                      type="date"
                      value={idCardData.issueDate}
                      onChange={(e) => setIdCardData(prev => ({ ...prev, issueDate: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">วันหมดอายุ</label>
                    <input
                      type="date"
                      value={idCardData.expiryDate}
                      onChange={(e) => setIdCardData(prev => ({ ...prev, expiryDate: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* หมายเหตุ */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                หมายเหตุการตรวจสอบ *
              </label>
              <textarea
                value={verificationNotes}
                onChange={(e) => setVerificationNotes(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                rows={3}
                placeholder={
                  verificationResult === "approved"
                    ? "เช่น: บัตรชัดเจน ข้อมูลตรงกับผู้สมัคร ยืนยันตัวตนได้"
                    : verificationResult === "rejected"
                    ? "เช่น: รูปไม่ชัด / ข้อมูลไม่ตรงกัน / บัตรหมดอายุ"
                    : "บันทึกรายละเอียดการตรวจสอบ"
                }
              />
            </div>

            {/* ปุ่มดำเนินการ */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={handleVerify}
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-60"
              >
                {loading ? "กำลังบันทึก..." : "บันทึกผลการตรวจสอบ"}
              </button>
              <button
                onClick={onClose}
                className="px-6 py-3 rounded-lg border text-gray-600 hover:bg-gray-50"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
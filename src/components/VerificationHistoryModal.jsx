// src/components/VerificationHistoryModal.jsx
import React, { useState, useEffect } from "react";
import { X, Clock, User, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { API_BASE, authHeader } from "../api";

export default function VerificationHistoryModal({ open, onClose }) {
  const [loading, setLoading] = useState(false);
  const [verifications, setVerifications] = useState([]);
  const [filter, setFilter] = useState("all"); // all, approved, rejected, pending

  useEffect(() => {
    if (open) {
      loadVerificationHistory();
    }
  }, [open]);

  const loadVerificationHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/verification-history`, {
        headers: authHeader(),
      });

      if (!res.ok) {
        throw new Error("โหลดประวัติการตรวจสอบไม่สำเร็จ");
      }

      const data = await res.json();
      setVerifications(data.verifications || []);
    } catch (e) {
      console.error("Load verification history error:", e);
      alert(e.message || "เกิดข้อผิดพลาดในการโหลดข้อมูล");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const filteredVerifications = verifications.filter(v => {
    if (filter === "all") return true;
    if (filter === "approved") return v.idVerified === true;
    if (filter === "rejected") return v.verificationResult === "rejected";
    if (filter === "pending") return !v.idVerified && v.verificationResult !== "rejected";
    return true;
  });

  const getStatusIcon = (verification) => {
    if (verification.idVerified) return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (verification.verificationResult === "rejected") return <XCircle className="w-4 h-4 text-red-600" />;
    return <AlertCircle className="w-4 h-4 text-yellow-600" />;
  };

  const getStatusText = (verification) => {
    if (verification.idVerified) return "อนุมัติ";
    if (verification.verificationResult === "rejected") return "ปฏิเสธ";
    return "รอตรวจสอบ";
  };

  const getStatusColor = (verification) => {
    if (verification.idVerified) return "text-green-700 bg-green-100";
    if (verification.verificationResult === "rejected") return "text-red-700 bg-red-100";
    return "text-yellow-700 bg-yellow-100";
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto relative p-6">
        <button
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
          onClick={onClose}
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          ประวัติการตรวจสอบบัตรประชาชน
        </h2>

        {/* Filter */}
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1 rounded-lg text-sm ${
              filter === "all" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"
            }`}
          >
            ทั้งหมด ({verifications.length})
          </button>
          <button
            onClick={() => setFilter("approved")}
            className={`px-3 py-1 rounded-lg text-sm ${
              filter === "approved" ? "bg-green-600 text-white" : "bg-gray-100 text-gray-700"
            }`}
          >
            อนุมัติ ({verifications.filter(v => v.idVerified).length})
          </button>
          <button
            onClick={() => setFilter("rejected")}
            className={`px-3 py-1 rounded-lg text-sm ${
              filter === "rejected" ? "bg-red-600 text-white" : "bg-gray-100 text-gray-700"
            }`}
          >
            ปฏิเสธ ({verifications.filter(v => v.verificationResult === "rejected").length})
          </button>
          <button
            onClick={() => setFilter("pending")}
            className={`px-3 py-1 rounded-lg text-sm ${
              filter === "pending" ? "bg-yellow-600 text-white" : "bg-gray-100 text-gray-700"
            }`}
          >
            รอตรวจสอบ ({verifications.filter(v => !v.idVerified && v.verificationResult !== "rejected").length})
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-500">กำลังโหลดประวัติ...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 px-3 py-2 text-left text-xs font-semibold">วันที่</th>
                  <th className="border border-gray-200 px-3 py-2 text-left text-xs font-semibold">ผู้สมัคร</th>
                  <th className="border border-gray-200 px-3 py-2 text-left text-xs font-semibold">ตำแหน่ง</th>
                  <th className="border border-gray-200 px-3 py-2 text-left text-xs font-semibold">สถานะ</th>
                  <th className="border border-gray-200 px-3 py-2 text-left text-xs font-semibold">ผู้ตรวจสอบ</th>
                  <th className="border border-gray-200 px-3 py-2 text-left text-xs font-semibold">หมายเหตุ</th>
                  <th className="border border-gray-200 px-3 py-2 text-left text-xs font-semibold">ข้อมูลจากบัตร</th>
                </tr>
              </thead>
              <tbody>
                {filteredVerifications.map((verification) => (
                  <tr key={verification._id} className="hover:bg-gray-50">
                    <td className="border border-gray-200 px-3 py-2 text-xs">
                      <div>
                        <div>{new Date(verification.createdAt).toLocaleDateString('th-TH')}</div>
                        {verification.verifiedAt && (
                          <div className="text-gray-500">
                            ตรวจ: {new Date(verification.verifiedAt).toLocaleDateString('th-TH')}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="border border-gray-200 px-3 py-2 text-xs">
                      <div>
                        <div className="font-medium">{verification.applicantName}</div>
                        <div className="text-gray-500">{verification.applicantEmail}</div>
                      </div>
                    </td>
                    <td className="border border-gray-200 px-3 py-2 text-xs">
                      {verification.jobTitle}
                    </td>
                    <td className="border border-gray-200 px-3 py-2 text-xs">
                      <div className="flex items-center gap-1">
                        {getStatusIcon(verification)}
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(verification)}`}>
                          {getStatusText(verification)}
                        </span>
                      </div>
                    </td>
                    <td className="border border-gray-200 px-3 py-2 text-xs">
                      {verification.verifierName ? (
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {verification.verifierName}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="border border-gray-200 px-3 py-2 text-xs">
                      {verification.verificationNotes ? (
                        <div className="max-w-xs">
                          <p className="truncate" title={verification.verificationNotes}>
                            {verification.verificationNotes}
                          </p>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="border border-gray-200 px-3 py-2 text-xs">
                      {verification.idCardData ? (
                        <div className="space-y-1">
                          <div><strong>เลขบัตร:</strong> {verification.idCardData.idNumber || "-"}</div>
                          <div><strong>ชื่อ:</strong> {verification.idCardData.fullName || "-"}</div>
                          <div><strong>เกิด:</strong> {verification.idCardData.birthDate ? new Date(verification.idCardData.birthDate).toLocaleDateString('th-TH') : "-"}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredVerifications.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">ไม่พบข้อมูลการตรวจสอบ</p>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end pt-4 border-t mt-4">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
}
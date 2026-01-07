// src/components/PrivacySettings.jsx
import { useState, useEffect } from "react";
import { Shield, Download, Trash2, Edit, AlertTriangle, CheckCircle, X } from "lucide-react";
import { API_BASE, authHeader } from "../api";

export default function PrivacySettings({ open, onClose }) {
  const [loading, setLoading] = useState(false);
  const [privacySettings, setPrivacySettings] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDataExport, setShowDataExport] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  const [exportData, setExportData] = useState(null);

  useEffect(() => {
    if (open) {
      fetchPrivacySettings();
    }
  }, [open]);

  const fetchPrivacySettings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/pdpa/privacy-settings`, {
        headers: authHeader()
      });
      
      if (res.ok) {
        const data = await res.json();
        setPrivacySettings(data);
      }
    } catch (err) {
      console.error("Fetch privacy settings error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/pdpa/my-data`, {
        headers: authHeader()
      });
      
      if (res.ok) {
        const data = await res.json();
        setExportData(data);
        setShowDataExport(true);
        
        // สร้างไฟล์ดาวน์โหลด
        const blob = new Blob([JSON.stringify(data.data, null, 2)], {
          type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.downloadInfo.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        alert("✅ ดาวน์โหลดข้อมูลส่วนบุคคลเรียบร้อย");
      } else {
        const error = await res.json();
        alert(`❌ ${error.message}`);
      }
    } catch (err) {
      console.error("Export data error:", err);
      alert("❌ เกิดข้อผิดพลาดในการส่งออกข้อมูล");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword.trim()) {
      alert("กรุณาใส่รหัสผ่านเพื่อยืนยัน");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/pdpa/delete-account`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader()
        },
        body: JSON.stringify({
          confirmPassword: deletePassword,
          reason: deleteReason
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        alert("✅ ลบบัญชีเรียบร้อยแล้ว");
        
        // ลบข้อมูลจาก localStorage และ redirect
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        window.location.href = '/login';
      } else {
        const error = await res.json();
        alert(`❌ ${error.message}`);
      }
    } catch (err) {
      console.error("Delete account error:", err);
      alert("❌ เกิดข้อผิดพลาดในการลบบัญชี");
    } finally {
      setLoading(false);
    }
  };

  const handleObjectProcessing = async (processingType) => {
    try {
      const res = await fetch(`${API_BASE}/api/pdpa/object-processing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader()
        },
        body: JSON.stringify({
          processingType: processingType,
          reason: `ผู้ใช้คัดค้านการประมวลผล ${processingType}`
        })
      });
      
      if (res.ok) {
        alert(`✅ บันทึกการคัดค้าน ${processingType} เรียบร้อย`);
        fetchPrivacySettings(); // รีเฟรชข้อมูล
      } else {
        const error = await res.json();
        alert(`❌ ${error.message}`);
      }
    } catch (err) {
      console.error("Object processing error:", err);
      alert("❌ เกิดข้อผิดพลาดในการบันทึกการคัดค้าน");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold">การตั้งค่าความเป็นส่วนตัว</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {loading && (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">กำลังโหลด...</p>
          </div>
        )}

        {privacySettings && (
          <div className="p-6 space-y-6">
            {/* PDPA Rights */}
            <div>
              <h3 className="text-lg font-semibold mb-4">สิทธิตาม PDPA</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {/* Data Export */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Download className="w-5 h-5 text-blue-600" />
                    <h4 className="font-medium">ดาวน์โหลดข้อมูลส่วนบุคคล</h4>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    ดาวน์โหลดข้อมูลส่วนบุคคลทั้งหมดในรูปแบบ JSON
                  </p>
                  <button
                    onClick={handleExportData}
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    ดาวน์โหลดข้อมูล
                  </button>
                </div>

                {/* Data Correction */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Edit className="w-5 h-5 text-green-600" />
                    <h4 className="font-medium">แก้ไขข้อมูล</h4>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    แก้ไขข้อมูลส่วนบุคคลที่ไม่ถูกต้อง
                  </p>
                  <button
                    onClick={() => alert("ไปที่หน้าโปรไฟล์เพื่อแก้ไขข้อมูล")}
                    className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
                  >
                    แก้ไขโปรไฟล์
                  </button>
                </div>

                {/* Object Processing */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    <h4 className="font-medium">คัดค้านการประมวลผล</h4>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    คัดค้านการใช้ข้อมูลเพื่อการตลาดหรือวิเคราะห์
                  </p>
                  <div className="space-y-2">
                    <button
                      onClick={() => handleObjectProcessing('marketing')}
                      className="w-full bg-yellow-600 text-white py-1 px-3 rounded text-sm hover:bg-yellow-700"
                    >
                      คัดค้านการตลาด
                    </button>
                    <button
                      onClick={() => handleObjectProcessing('analytics')}
                      className="w-full bg-yellow-600 text-white py-1 px-3 rounded text-sm hover:bg-yellow-700"
                    >
                      คัดค้านการวิเคราะห์
                    </button>
                  </div>
                </div>

                {/* Delete Account */}
                <div className="border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Trash2 className="w-5 h-5 text-red-600" />
                    <h4 className="font-medium text-red-600">ลบบัญชี</h4>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    ลบบัญชีและข้อมูลทั้งหมดอย่างถาวร
                  </p>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700"
                  >
                    ลบบัญชี
                  </button>
                </div>
              </div>
            </div>

            {/* Current Privacy Settings */}
            <div>
              <h3 className="text-lg font-semibold mb-4">การตั้งค่าปัจจุบัน</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid md:grid-cols-2 gap-4">
                  {Object.entries(privacySettings.privacySettings).map(([key, value]) => {
                    if (key === 'lastUpdated') return null;
                    
                    const labels = {
                      marketing: 'การตลาด',
                      analytics: 'การวิเคราะห์',
                      profiling: 'การสร้างโปรไฟล์',
                      automated_decision: 'การตัดสินใจอัตโนมัติ',
                      data_sharing: 'การแบ่งปันข้อมูล'
                    };
                    
                    return (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-sm">{labels[key] || key}</span>
                        <div className="flex items-center gap-2">
                          {value ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <X className="w-4 h-4 text-red-600" />
                          )}
                          <span className="text-sm">
                            {value ? 'อนุญาต' : 'ไม่อนุญาต'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 text-xs text-gray-500">
                  อัปเดตล่าสุด: {new Date(privacySettings.privacySettings.lastUpdated).toLocaleString('th-TH')}
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4">ติดต่อเรื่องความเป็นส่วนตัว</h3>
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="space-y-2 text-sm">
                  <p><strong>เจ้าหน้าที่คุ้มครองข้อมูล:</strong> {privacySettings.contactInfo.dpo}</p>
                  <p><strong>ฝ่ายกฎหมาย:</strong> {privacySettings.contactInfo.legal}</p>
                  <p><strong>ฝ่ายสนับสนุน:</strong> {privacySettings.contactInfo.support}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Account Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
                <h3 className="text-lg font-bold text-red-600">ยืนยันการลบบัญชี</h3>
              </div>
              
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-800">
                    ⚠️ การลบบัญชีจะไม่สามารถย้อนกลับได้ ข้อมูลทั้งหมดจะถูกลบอย่างถาวร
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">
                    รหัสผ่านเพื่อยืนยัน:
                  </label>
                  <input
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="ใส่รหัสผ่านของคุณ"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">
                    เหตุผลในการลบบัญชี (ไม่บังคับ):
                  </label>
                  <textarea
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 h-20"
                    placeholder="เช่น ไม่ใช้งานแล้ว, ไม่พอใจบริการ, ฯลฯ"
                  />
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={loading || !deletePassword.trim()}
                    className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    {loading ? 'กำลังลบ...' : 'ลบบัญชี'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Data Export Modal */}
        {showDataExport && exportData && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">ข้อมูลส่วนบุคคลของคุณ</h3>
                <button
                  onClick={() => setShowDataExport(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-800">
                    ✅ ไฟล์ได้ถูกดาวน์โหลดแล้ว: {exportData.downloadInfo.filename}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    ขนาดไฟล์: {exportData.downloadInfo.size}
                  </p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium mb-2">สรุปข้อมูลที่ส่งออก:</h4>
                  <div className="text-sm space-y-1">
                    <p>• ข้อมูลบัญชี: {exportData.data.personalData.account.email}</p>
                    <p>• งานทั้งหมด: {exportData.data.personalData.statistics.totalJobs} งาน</p>
                    <p>• ใบสมัครงาน: {exportData.data.personalData.statistics.totalApplications} ใบ</p>
                    <p>• การชำระเงิน: {exportData.data.personalData.statistics.totalPayments} รายการ</p>
                    <p>• อายุบัญชี: {exportData.data.personalData.statistics.accountAge}</p>
                  </div>
                </div>
                
                <button
                  onClick={() => setShowDataExport(false)}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                >
                  ปิด
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
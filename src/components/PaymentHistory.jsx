// src/components/PaymentHistory.jsx
import { useState, useEffect, useCallback } from "react";
import { X, CreditCard, Clock, CheckCircle, XCircle, Eye } from "lucide-react";
import { API_BASE, authHeader } from "../api";

export default function PaymentHistory({ open, onClose }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedPayment, setSelectedPayment] = useState(null);

  // Load payment history
  const loadPayments = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      console.log("🔍 Loading payments with filter:", filter);
      
      const res = await fetch(`${API_BASE}/api/payments/my-payments?status=${filter === "all" ? "" : filter}`, {
        headers: authHeader()
      });

      console.log("🔍 Payment API response status:", res.status);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error("🔍 Payment API error:", errorData);
        
        // ✅ Handle specific error types
        if (res.status === 429) {
          throw new Error("คำขอมากเกินไป กรุณารอสักครู่แล้วลองใหม่");
        } else if (res.status === 401) {
          throw new Error("กรุณาเข้าสู่ระบบใหม่");
        } else if (res.status === 403) {
          throw new Error("ไม่มีสิทธิ์เข้าถึงข้อมูลนี้");
        } else {
          throw new Error(errorData.message || "ไม่สามารถโหลดประวัติการชำระเงินได้");
        }
      }

      const data = await res.json();
      console.log("🔍 Payment API response data:", data);
      
      // ✅ Validate response structure
      if (!data || typeof data !== 'object') {
        throw new Error("ข้อมูลที่ได้รับไม่ถูกต้อง");
      }
      
      setPayments(Array.isArray(data.payments) ? data.payments : []);

    } catch (err) {
      console.error("🔍 Payment loading error:", err);
      setError(err.message || "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (open) {
      loadPayments();
    }
  }, [open, filter, loadPayments]);

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status info
  const getStatusInfo = (status) => {
    const statusMap = {
      pending: { label: "รอชำระเงิน", color: "yellow", icon: Clock },
      paid: { label: "ชำระแล้ว", color: "green", icon: CheckCircle },
      failed: { label: "ชำระไม่สำเร็จ", color: "red", icon: XCircle },
      expired: { label: "หมดเวลา", color: "gray", icon: XCircle }
    };
    return statusMap[status] || statusMap.pending;
  };

  // Get package name
  const getPackageName = (packageType) => {
    const packages = {
      standard: "งานปกติ",
      premium: "งานพรีเมียม", 
      featured: "งานเด่น"
    };
    return packages[packageType] || packageType;
  };

  // Get boost names
  const getBoostNames = (boostFeatures) => {
    const boosts = {
      featured: "แสดงในหน้าแรก",
      urgent: "งานเร่งด่วน",
      highlighted: "เน้นสีพื้นหลัง",
      extended: "ขยายเวลา"
    };
    return boostFeatures?.map(b => boosts[b] || b).join(", ") || "";
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold">💳 ประวัติการชำระเงิน</h2>
            <p className="text-sm text-gray-600">รายการการชำระเงินทั้งหมด</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Filter */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="flex gap-2">
            {[
              { key: "all", label: "ทั้งหมด" },
              { key: "pending", label: "รอชำระ" },
              { key: "paid", label: "ชำระแล้ว" },
              { key: "failed", label: "ไม่สำเร็จ" }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === key
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-100"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">กำลังโหลด...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600">{error}</p>
              <button
                onClick={loadPayments}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                ลองใหม่
              </button>
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">ไม่มีประวัติการชำระเงิน</p>
            </div>
          ) : (
            <div className="space-y-4">
              {payments.map((payment) => {
                const statusInfo = getStatusInfo(payment.status);
                const StatusIcon = statusInfo.icon;

                return (
                  <div key={payment.paymentId} className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold">{payment.job?.title || "งานที่ถูกลบ"}</h3>
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            statusInfo.color === "green" ? "bg-green-100 text-green-700" :
                            statusInfo.color === "yellow" ? "bg-yellow-100 text-yellow-700" :
                            statusInfo.color === "red" ? "bg-red-100 text-red-700" :
                            "bg-gray-100 text-gray-700"
                          }`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusInfo.label}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">รหัสการชำระ</p>
                            <p className="font-mono">{payment.paymentId}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">จำนวนเงิน</p>
                            <p className="font-semibold text-blue-600">{payment.amount} ฿</p>
                          </div>
                          <div>
                            <p className="text-gray-500">แพ็กเกจ</p>
                            <p>{getPackageName(payment.packageType)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">วิธีชำระ</p>
                            <p>{payment.paymentMethod === "promptpay" ? "PromptPay" : "โอนธนาคาร"}</p>
                          </div>
                        </div>

                        {payment.boostFeatures?.length > 0 && (
                          <div className="mt-2">
                            <p className="text-gray-500 text-sm">ฟีเจอร์เพิ่มเติม</p>
                            <p className="text-sm text-purple-600">{getBoostNames(payment.boostFeatures)}</p>
                          </div>
                        )}

                        <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                          <span>สร้างเมื่อ: {formatDate(payment.createdAt)}</span>
                          {payment.paidAt && (
                            <span>ชำระเมื่อ: {formatDate(payment.paidAt)}</span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => setSelectedPayment(payment)}
                        className="ml-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                        title="ดูรายละเอียด"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              แสดง {payments.length} รายการ
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              ปิด
            </button>
          </div>
        </div>
      </div>

      {/* Payment Detail Modal */}
      {selectedPayment && (
        <PaymentDetailModal
          payment={selectedPayment}
          onClose={() => setSelectedPayment(null)}
        />
      )}
    </div>
  );
}

// Payment Detail Modal Component
function PaymentDetailModal({ payment, onClose }) {
  const statusInfo = {
    pending: { label: "รอชำระเงิน", color: "yellow", icon: Clock },
    paid: { label: "ชำระแล้ว", color: "green", icon: CheckCircle },
    failed: { label: "ชำระไม่สำเร็จ", color: "red", icon: XCircle },
    expired: { label: "หมดเวลา", color: "gray", icon: XCircle }
  }[payment.status];

  const StatusIcon = statusInfo.icon;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-bold">รายละเอียดการชำระเงิน</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Status */}
          <div className="text-center">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
              statusInfo.color === "green" ? "bg-green-100 text-green-700" :
              statusInfo.color === "yellow" ? "bg-yellow-100 text-yellow-700" :
              statusInfo.color === "red" ? "bg-red-100 text-red-700" :
              "bg-gray-100 text-gray-700"
            }`}>
              <StatusIcon className="w-4 h-4" />
              {statusInfo.label}
            </div>
          </div>

          {/* Payment Info */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">รหัสการชำระ:</span>
              <span className="font-mono text-sm">{payment.paymentId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">งาน:</span>
              <span className="font-medium">{payment.job?.title || "งานที่ถูกลบ"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">จำนวนเงิน:</span>
              <span className="font-bold text-blue-600">{payment.amount} ฿</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">แพ็กเกจ:</span>
              <span>{payment.packageType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">วิธีชำระ:</span>
              <span>{payment.paymentMethod === "promptpay" ? "PromptPay" : "โอนธนาคาร"}</span>
            </div>
            {payment.boostFeatures?.length > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">ฟีเจอร์เพิ่มเติม:</span>
                <span className="text-purple-600">{payment.boostFeatures.join(", ")}</span>
              </div>
            )}
          </div>

          {/* Timestamps */}
          <div className="pt-4 border-t space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">สร้างเมื่อ:</span>
              <span>{new Date(payment.createdAt).toLocaleString('th-TH')}</span>
            </div>
            {payment.paidAt && (
              <div className="flex justify-between">
                <span className="text-gray-600">ชำระเมื่อ:</span>
                <span>{new Date(payment.paidAt).toLocaleString('th-TH')}</span>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t">
          <button
            onClick={onClose}
            className="w-full py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
}
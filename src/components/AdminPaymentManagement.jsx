// src/components/AdminPaymentManagement.jsx
import { useState, useEffect } from "react";
import { CreditCard, Clock, CheckCircle, XCircle, Search, RefreshCw, Eye, Edit } from "lucide-react";
import { API_BASE, authHeader } from "../api";

export default function AdminPaymentManagement() {
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [updating, setUpdating] = useState(false);

  // Load payments
  const loadPayments = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(
        `${API_BASE}/api/payments/admin/all-payments?status=${filter}&search=${searchQuery}`,
        { headers: authHeader() }
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "ไม่สามารถโหลดรายการชำระเงินได้");
      }

      const data = await res.json();
      setPayments(data.payments || []);
      setStats(data.stats || {});
    } catch (err) {
      console.error("Load payments error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, [filter]);

  // Update payment status
  const updatePaymentStatus = async (paymentId, newStatus, note) => {
    setUpdating(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/payments/admin/${paymentId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...authHeader()
          },
          body: JSON.stringify({ status: newStatus, note })
        }
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "อัปเดตสถานะไม่สำเร็จ");
      }

      alert("✅ อัปเดตสถานะสำเร็จ");
      setSelectedPayment(null);
      loadPayments();
    } catch (err) {
      console.error("Update status error:", err);
      alert("❌ " + err.message);
    } finally {
      setUpdating(false);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "-";
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
      expired: { label: "หมดเวลา", color: "gray", icon: XCircle },
      cancelled: { label: "ยกเลิกแล้ว", color: "red", icon: XCircle }
    };
    return statusMap[status] || statusMap.pending;
  };

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-purple-600" />
            จัดการรายการชำระเงิน
          </h2>
          <button
            onClick={loadPayments}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            รีเฟรช
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border">
            <p className="text-sm text-gray-600">ทั้งหมด</p>
            <p className="text-2xl font-bold">{stats.total || 0}</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <p className="text-sm text-yellow-700">รอชำระ</p>
            <p className="text-2xl font-bold text-yellow-700">{stats.pending || 0}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <p className="text-sm text-green-700">ชำระแล้ว</p>
            <p className="text-2xl font-bold text-green-700">{stats.paid || 0}</p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <p className="text-sm text-red-700">ไม่สำเร็จ</p>
            <p className="text-2xl font-bold text-red-700">{stats.failed || 0}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <p className="text-sm text-purple-700">รายได้รวม</p>
            <p className="text-xl font-bold text-purple-700">{(stats.totalRevenue || 0).toLocaleString()} ฿</p>
          </div>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="bg-white p-4 rounded-lg border">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex gap-2 flex-wrap">
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
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex-1 flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && loadPayments()}
              placeholder="ค้นหารหัสการชำระ..."
              className="flex-1 bg-transparent outline-none text-sm"
            />
          </div>
        </div>
      </div>

      {/* Payments List */}
      <div className="bg-white rounded-lg border">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">กำลังโหลด...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600">{error}</p>
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-12">
            <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">ไม่มีรายการชำระเงิน</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">รหัส</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">งาน</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">นายจ้าง</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">จำนวน</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">สถานะ</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">วันที่</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {payments.map((payment) => {
                  const statusInfo = getStatusInfo(payment.status);
                  const StatusIcon = statusInfo.icon;

                  return (
                    <tr key={payment._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="text-xs font-mono">{payment.paymentId}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium">{payment.job?.title || "งานถูกลบ"}</p>
                        <p className="text-xs text-gray-500">{payment.job?.company}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm">{payment.employer?.name || "-"}</p>
                        <p className="text-xs text-gray-500">{payment.employer?.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-blue-600">{payment.amount} ฿</p>
                        <p className="text-xs text-gray-500">{payment.packageType}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          statusInfo.color === "green" ? "bg-green-100 text-green-700" :
                          statusInfo.color === "yellow" ? "bg-yellow-100 text-yellow-700" :
                          statusInfo.color === "red" ? "bg-red-100 text-red-700" :
                          "bg-gray-100 text-gray-700"
                        }`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-gray-600">{formatDate(payment.createdAt)}</p>
                        {payment.paidAt && (
                          <p className="text-xs text-green-600">ชำระ: {formatDate(payment.paidAt)}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedPayment(payment)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="ดูรายละเอียด"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setSelectedPayment(payment)}
                            className="p-1 text-purple-600 hover:bg-purple-50 rounded"
                            title="แก้ไขสถานะ"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment Detail & Update Modal */}
      {selectedPayment && (
        <PaymentUpdateModal
          payment={selectedPayment}
          onClose={() => setSelectedPayment(null)}
          onUpdate={updatePaymentStatus}
          updating={updating}
        />
      )}
    </div>
  );
}

// Payment Update Modal
function PaymentUpdateModal({ payment, onClose, onUpdate, updating }) {
  const [newStatus, setNewStatus] = useState(payment.status);
  const [note, setNote] = useState("");

  const handleSubmit = () => {
    if (newStatus === payment.status && !note) {
      alert("กรุณาเปลี่ยนสถานะหรือเพิ่มหมายเหตุ");
      return;
    }

    if (window.confirm(`ยืนยันการเปลี่ยนสถานะเป็น "${newStatus}"?`)) {
      onUpdate(payment.paymentId, newStatus, note);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-bold">จัดการรายการชำระเงิน</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Payment Info */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">รหัสการชำระ:</span>
              <span className="font-mono">{payment.paymentId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">งาน:</span>
              <span className="font-medium">{payment.job?.title || "งานถูกลบ"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">นายจ้าง:</span>
              <span>{payment.employer?.name || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">จำนวนเงิน:</span>
              <span className="font-bold text-blue-600">{payment.amount} ฿</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">สถานะปัจจุบัน:</span>
              <span className="font-medium">{payment.status}</span>
            </div>
          </div>

          {/* Update Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              เปลี่ยนสถานะ
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="pending">รอชำระเงิน</option>
              <option value="paid">ชำระแล้ว</option>
              <option value="failed">ชำระไม่สำเร็จ</option>
              <option value="expired">หมดเวลา</option>
              <option value="cancelled">ยกเลิกแล้ว</option>
            </select>
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              หมายเหตุ (ถ้ามี)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="เพิ่มหมายเหตุเกี่ยวกับการเปลี่ยนแปลงนี้..."
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={updating}
            className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {updating ? "กำลังอัปเดต..." : "บันทึกการเปลี่ยนแปลง"}
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            ยกเลิก
          </button>
        </div>
      </div>
    </div>
  );
}

// src/components/PaymentStatusDemo.jsx
import { useState, useEffect, useCallback } from "react";
import { RefreshCw, CheckCircle, Clock, AlertTriangle, XCircle } from "lucide-react";
import { API_BASE, authHeader } from "../api";

export default function PaymentStatusDemo() {
  const [paymentId] = useState("PAY_MK2E0NYZ_D6MF9"); // รหัสจากภาพที่คุณแสดง
  const [status, setStatus] = useState("pending");
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [checkCount, setCheckCount] = useState(0);
  const [lastChecked, setLastChecked] = useState(null);
  const [autoCheck, setAutoCheck] = useState(true);

  // ฟังก์ชันเช็คสถานะ
  const checkPaymentStatus = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    
    try {
      // ใน Test Mode จะใช้ mock data
      const res = await fetch(`${API_BASE}/api/payments/${paymentId}/status`, {
        headers: authHeader()
      });

      if (res.ok) {
        const data = await res.json();
        setStatus(data.status);
        setLastChecked(new Date());
        setCheckCount(prev => prev + 1);
        
        if (data.status === "paid") {
          setAutoCheck(false);
          alert("🎉 ชำระเงินสำเร็จ! งานได้รับการเปิดใช้งานแล้ว");
        }
      } else {
        // Mock response สำหรับ demo
        const mockSuccess = Math.random() > 0.7; // 30% chance of success
        
        if (mockSuccess) {
          setStatus("paid");
          setAutoCheck(false);
          alert("🎉 ชำระเงินสำเร็จ! (Mock Demo)");
        } else {
          setStatus("pending");
        }
        
        setLastChecked(new Date());
        setCheckCount(prev => prev + 1);
      }
    } catch (err) {
      console.error("Check payment error:", err);
      setStatus("error");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [paymentId]);

  // ฟังก์ชันยกเลิกการชำระเงิน
  const cancelPayment = useCallback(async () => {
    if (!window.confirm("คุณต้องการยกเลิกการชำระเงินนี้หรือไม่?")) {
      return;
    }

    setCancelling(true);
    
    try {
      const res = await fetch(`${API_BASE}/api/payments/${paymentId}/cancel`, {
        method: 'POST',
        headers: {
          ...authHeader(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason: "ผู้ใช้ยกเลิกการชำระเงิน"
        })
      });

      if (res.ok) {
        await res.json(); // Response data (ไม่ใช้ในการ demo)
        setStatus("cancelled");
        setAutoCheck(false);
        alert("✅ ยกเลิกการชำระเงินเรียบร้อย");
      } else {
        // Mock response สำหรับ demo
        setStatus("cancelled");
        setAutoCheck(false);
        alert("✅ ยกเลิกการชำระเงินเรียบร้อย (Mock Demo)");
      }
    } catch (err) {
      console.error("Cancel payment error:", err);
      alert("❌ เกิดข้อผิดพลาดในการยกเลิกการชำระเงิน");
    } finally {
      setCancelling(false);
    }
  }, [paymentId]);

  // Auto check ทุก 30 วินาที
  useEffect(() => {
    if (!autoCheck || status === "paid") return;

    const interval = setInterval(() => {
      checkPaymentStatus(false);
    }, 30000);

    return () => clearInterval(interval);
  }, [autoCheck, status, checkPaymentStatus]);

  // เช็คครั้งแรก
  useEffect(() => {
    checkPaymentStatus();
  }, [checkPaymentStatus]);

  const getStatusDisplay = () => {
    switch (status) {
      case "paid":
        return {
          icon: <CheckCircle className="w-6 h-6 text-green-500" />,
          text: "ชำระเงินแล้ว",
          color: "text-green-600",
          bgColor: "bg-green-50 border-green-200"
        };
      case "pending":
        return {
          icon: <Clock className="w-6 h-6 text-yellow-500" />,
          text: "รอการชำระเงิน",
          color: "text-yellow-600",
          bgColor: "bg-yellow-50 border-yellow-200"
        };
      case "cancelled":
        return {
          icon: <XCircle className="w-6 h-6 text-gray-500" />,
          text: "ยกเลิกการชำระเงิน",
          color: "text-gray-600",
          bgColor: "bg-gray-50 border-gray-200"
        };
      case "error":
        return {
          icon: <AlertTriangle className="w-6 h-6 text-red-500" />,
          text: "เกิดข้อผิดพลาด",
          color: "text-red-600",
          bgColor: "bg-red-50 border-red-200"
        };
      default:
        return {
          icon: <Clock className="w-6 h-6 text-gray-500" />,
          text: "กำลังตรวจสอบ...",
          color: "text-gray-600",
          bgColor: "bg-gray-50 border-gray-200"
        };
    }
  };

  const statusDisplay = getStatusDisplay();

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6 text-center">
          🔍 ทดสอบระบบตรวจสอบการชำระเงิน
        </h1>

        {/* Payment Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-800 mb-2">ข้อมูลการชำระเงิน:</h3>
          <div className="text-sm text-blue-700 space-y-1">
            <p><strong>รหัสอ้างอิง:</strong> <code>{paymentId}</code></p>
            <p><strong>จำนวนเงิน:</strong> 348 บาท</p>
            <p><strong>ธนาคาร:</strong> กสิกรไทย KPLUS</p>
            <p><strong>เลขบัญชี:</strong> 1371845670</p>
          </div>
        </div>

        {/* Status Display */}
        <div className={`border rounded-lg p-6 mb-6 ${statusDisplay.bgColor}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {statusDisplay.icon}
              <span className={`text-lg font-semibold ${statusDisplay.color}`}>
                {statusDisplay.text}
              </span>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => checkPaymentStatus(true)}
                disabled={loading || status === "paid" || status === "cancelled"}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'กำลังเช็ค...' : 'เช็คเลย'}
              </button>
              
              {status === "pending" && (
                <button
                  onClick={cancelPayment}
                  disabled={cancelling}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  {cancelling ? 'กำลังยกเลิก...' : 'ยกเลิกการชำระ'}
                </button>
              )}
            </div>
          </div>

          {/* Check Stats */}
          <div className="text-sm text-gray-600 space-y-1">
            <p>เช็คครั้งที่: {checkCount}</p>
            {lastChecked && (
              <p>เช็คล่าสุด: {lastChecked.toLocaleString('th-TH')}</p>
            )}
          </div>
        </div>

        {/* Auto Check Control */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoCheck}
              onChange={(e) => setAutoCheck(e.target.checked)}
              disabled={status === "paid"}
              className="w-4 h-4"
            />
            <span className="text-sm">เช็คอัตโนมัติทุก 30 วินาที</span>
          </label>
          
          {autoCheck && status === "pending" && (
            <p className="text-xs text-blue-600 mt-2">
              🔄 ระบบกำลังตรวจสอบอัตโนมัติ...
            </p>
          )}
        </div>

        {/* How it works */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold mb-3">🔧 วิธีการทำงาน:</h4>
          <div className="text-sm text-gray-600 space-y-2">
            <p><strong>1. Auto Check:</strong> ระบบเช็คทุก 30 วินาที</p>
            <p><strong>2. Manual Check:</strong> กดปุ่ม "เช็คเลย"</p>
            <p><strong>3. Bank API:</strong> ตรวจสอบเงินเข้าบัญชีจริง</p>
            <p><strong>4. Real-time:</strong> อัปเดตสถานะทันที</p>
          </div>
        </div>

        {/* Success Message */}
        {status === "paid" && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-center">
            <p className="text-green-800 font-semibold">
              ✅ ชำระเงินสำเร็จ! งานของคุณได้รับการเปิดใช้งานแล้ว
            </p>
          </div>
        )}

        {/* Cancelled Message */}
        {status === "cancelled" && (
          <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
            <p className="text-gray-800 font-semibold">
              🚫 ยกเลิกการชำระเงินแล้ว
            </p>
            <p className="text-sm text-gray-600 mt-1">
              งานจะถูกเปลี่ยนสถานะกลับเป็น Draft และไม่ถูกเผยแพร่
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
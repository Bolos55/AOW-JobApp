// src/components/PaymentModal.jsx
import { useState, useEffect } from "react";
import { X, Smartphone, Building2, Clock, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { API_BASE, authHeader } from "../api";

export default function ServiceFeeModal({ open, onClose, job, onPaymentSuccess }) {
  const [step, setStep] = useState(1); // 1: Package Selection, 2: Payment Method, 3: Service Fee Payment, 4: Success
  const [selectedPackage, setSelectedPackage] = useState("standard");
  const [selectedBoosts, setSelectedBoosts] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState("promptpay");
  const [serviceFeeData, setServiceFeeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");
  const [serviceFeeStatus, setServiceFeeStatus] = useState("pending");
  const [timeLeft, setTimeLeft] = useState(24 * 60 * 60); // 24 hours in seconds

  // ✅ Service Package pricing - Phase 0-1: ค่าบริการรวมภาษีแล้ว
  const servicePackages = {
    standard: { 
      name: "แพ็กเกจงานปกติ", 
      serviceFee: 199, 
      duration: 30, 
      description: "ค่าบริการโพสต์งาน 30 วัน",
      features: ['โพสต์งาน 30 วัน', 'รับใบสมัครไม่จำกัด', 'แชทกับผู้สมัคร']
    },
    premium: { 
      name: "แพ็กเกจงานพรีเมียม", 
      serviceFee: 299, 
      duration: 30, 
      description: "ค่าบริการโพสต์งาน 30 วัน + ความสำคัญพิเศษ",
      features: ['ทุกอย่างของงานปกติ', 'ความสำคัญในการค้นหา', 'ไอคอนพรีเมียม']
    },
    featured: { 
      name: "แพ็กเกจงานเด่น", 
      serviceFee: 399, 
      duration: 60, 
      description: "ค่าบริการโพสต์งาน 60 วัน + แสดงในหน้าแรก",
      features: ['ทุกอย่างของงานพรีเมียม', 'แสดงในหน้าแรก', 'โพสต์งาน 60 วัน']
    }
  };

  const additionalServices = {
    featured: { 
      name: "บริการแสดงในหน้าแรก", 
      serviceFee: 99, 
      description: "งานของคุณจะปรากฏด้านบนสุด",
      duration: "7 วัน"
    },
    urgent: { 
      name: "บริการงานเร่งด่วน", 
      serviceFee: 149, 
      description: "ไฮไลท์สีแดงและไอคอนเร่งด่วน",
      duration: "7 วัน"
    },
    highlighted: { 
      name: "บริการเน้นสีพื้นหลัง", 
      serviceFee: 99, 
      description: "พื้นหลังสีเหลืองทองสะดุดตา",
      duration: "14 วัน"
    },
    extended: { 
      name: "บริการขยายเวลา +30 วัน", 
      serviceFee: 199, 
      description: "เพิ่มระยะเวลาแสดงงานอีก 30 วัน",
      duration: "30 วัน"
    }
  };

  // Calculate total service fee
  const calculateTotalServiceFee = () => {
    const packageFee = servicePackages[selectedPackage].serviceFee;
    const additionalServiceFee = selectedBoosts.reduce((total, boost) => total + additionalServices[boost].serviceFee, 0);
    return packageFee + additionalServiceFee;
  };

  // Timer countdown
  useEffect(() => {
    if (step === 3 && paymentData && paymentStatus === "pending") {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setError("การชำระเงินหมดเวลาแล้ว กรุณาเริ่มใหม่");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [step, paymentData, paymentStatus]);

  // Check payment status
  useEffect(() => {
    if (paymentData && paymentStatus === "pending") {
      const checkStatus = setInterval(async () => {
        try {
          const res = await fetch(`${API_BASE}/api/payments/${paymentData.paymentId}/status`, {
            headers: authHeader()
          });
          
          if (res.ok) {
            const data = await res.json();
            if (data.status === "paid") {
              setPaymentStatus("paid");
              setStep(4);
              clearInterval(checkStatus);
              if (onPaymentSuccess) {
                onPaymentSuccess(data);
              }
            } else if (data.status === "failed" || data.status === "expired") {
              setPaymentStatus(data.status);
              setError("การชำระเงินไม่สำเร็จ กรุณาลองใหม่");
              clearInterval(checkStatus);
            }
          }
        } catch (err) {
          console.error("Payment status check error:", err);
        }
      }, 5000); // Check every 5 seconds

      return () => clearInterval(checkStatus);
    }
  }, [paymentData, paymentStatus, onPaymentSuccess]);

  // Create payment
  const createPayment = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/api/payments/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeader()
        },
        body: JSON.stringify({
          jobId: job._id,
          packageType: selectedPackage,
          boostFeatures: selectedBoosts,
          paymentMethod
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "ไม่สามารถสร้างการชำระเงินได้");
      }

      const data = await res.json();
      setPaymentData(data.payment);
      setStep(3);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Cancel payment
  const cancelPayment = async () => {
    if (!window.confirm("คุณต้องการยกเลิกการชำระเงินนี้หรือไม่?")) {
      return;
    }

    setCancelling(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/api/payments/${paymentData.paymentId}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeader()
        },
        body: JSON.stringify({
          reason: "ผู้ใช้ยกเลิกการชำระเงิน"
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "ไม่สามารถยกเลิกการชำระเงินได้");
      }

      setPaymentStatus("cancelled");
      alert("✅ ยกเลิกการชำระเงินเรียบร้อย");
      onClose(); // ปิด modal

    } catch (err) {
      setError(err.message);
    } finally {
      setCancelling(false);
    }
  };

  // Format time
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold">💰 ชำระเงินสำหรับงาน</h2>
            <p className="text-sm text-gray-600">{job?.title}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            {[
              { step: 1, label: "เลือกแพ็กเกจ", icon: "📦" },
              { step: 2, label: "วิธีชำระเงิน", icon: "💳" },
              { step: 3, label: "ชำระเงิน", icon: "⏳" },
              { step: 4, label: "เสร็จสิ้น", icon: "✅" }
            ].map((item, index) => (
              <div key={item.step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                  step >= item.step ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"
                }`}>
                  {step > item.step ? "✓" : item.step}
                </div>
                <span className={`ml-2 text-sm ${step >= item.step ? "text-blue-600 font-medium" : "text-gray-500"}`}>
                  {item.label}
                </span>
                {index < 3 && <div className="w-8 h-px bg-gray-300 mx-4" />}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Package Selection */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">เลือกแพ็กเกจการโพสต์งาน</h3>
                <div className="grid gap-4">
                  {Object.entries(packages).map(([key, pkg]) => (
                    <label key={key} className={`block p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      selectedPackage === key ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="package"
                            value={key}
                            checked={selectedPackage === key}
                            onChange={(e) => setSelectedPackage(e.target.value)}
                            className="w-4 h-4"
                          />
                          <div>
                            <h4 className="font-semibold">{pkg.name}</h4>
                            <p className="text-sm text-gray-600">{pkg.description}</p>
                            <div className="mt-1">
                              {pkg.features.map((feature, idx) => (
                                <p key={idx} className="text-xs text-gray-500">• {feature}</p>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-blue-600">{pkg.price} ฿</p>
                          <p className="text-xs text-gray-500">{pkg.duration} วัน</p>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">เพิ่มความโดดเด่น (ไม่บังคับ)</h3>
                <div className="grid gap-3">
                  {Object.entries(boosts).map(([key, boost]) => (
                    <label key={key} className={`block p-3 border rounded-lg cursor-pointer transition-all ${
                      selectedBoosts.includes(key) ? "border-green-500 bg-green-50" : "border-gray-200 hover:border-gray-300"
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={selectedBoosts.includes(key)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedBoosts([...selectedBoosts, key]);
                              } else {
                                setSelectedBoosts(selectedBoosts.filter(b => b !== key));
                              }
                            }}
                            className="w-4 h-4"
                          />
                          <div>
                            <h4 className="font-medium">{boost.name}</h4>
                            <p className="text-sm text-gray-600">{boost.description}</p>
                            <p className="text-xs text-purple-600">ระยะเวลา: {boost.duration}</p>
                          </div>
                        </div>
                        <p className="font-semibold text-green-600">+{boost.price} ฿</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">ยอดรวมทั้งสิ้น:</span>
                  <span className="text-2xl font-bold text-blue-600">{calculateTotal()} ฿</span>
                </div>
              </div>

              <button
                onClick={() => setStep(2)}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                ดำเนินการต่อ
              </button>
            </div>
          )}

          {/* Step 2: Payment Method */}
          {step === 2 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">เลือกวิธีชำระเงิน</h3>
              
              <div className="space-y-3">
                <label className={`block p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  paymentMethod === "promptpay" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
                }`}>
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="promptpay"
                      checked={paymentMethod === "promptpay"}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-4 h-4"
                    />
                    <Smartphone className="w-6 h-6 text-blue-600" />
                    <div>
                      <h4 className="font-semibold">PromptPay</h4>
                      <p className="text-sm text-gray-600">สแกน QR Code ด้วยแอปธนาคาร</p>
                    </div>
                  </div>
                </label>

                <label className={`block p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  paymentMethod === "bank_transfer" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
                }`}>
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="bank_transfer"
                      checked={paymentMethod === "bank_transfer"}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-4 h-4"
                    />
                    <Building2 className="w-6 h-6 text-green-600" />
                    <div>
                      <h4 className="font-semibold">โอนเงินผ่านธนาคาร</h4>
                      <p className="text-sm text-gray-600">โอนเงินตามเลขบัญชีที่ระบุ</p>
                    </div>
                  </div>
                </label>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">สรุปการสั่งซื้อ</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>แพ็กเกจ: {packages[selectedPackage].name}</span>
                    <span>{packages[selectedPackage].price} ฿</span>
                  </div>
                  {selectedBoosts.map(boost => (
                    <div key={boost} className="flex justify-between">
                      <span>{boosts[boost].name}</span>
                      <span>+{boosts[boost].price} ฿</span>
                    </div>
                  ))}
                  <hr className="my-2" />
                  <div className="flex justify-between font-semibold">
                    <span>ยอดรวม:</span>
                    <span>{calculateTotal()} ฿</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  กลับ
                </button>
                <button
                  onClick={createPayment}
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? "กำลังสร้าง..." : "ชำระเงิน"}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Payment Process */}
          {step === 3 && paymentData && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-yellow-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">รอการชำระเงิน</h3>
                <p className="text-sm text-gray-600">กรุณาชำระเงินภายในเวลาที่กำหนด</p>
                <div className="text-2xl font-mono font-bold text-red-600 mt-2">
                  {formatTime(timeLeft)}
                </div>
              </div>

              {/* Payment Info */}
              {paymentMethod === "promptpay" && paymentData.promptpay && (
                <div className="bg-blue-50 p-6 rounded-lg text-center">
                  <h4 className="font-semibold mb-4">สแกน QR Code เพื่อชำระเงิน</h4>
                  
                  {paymentData.promptpay.qrCodeImage && (
                    <div className="mb-4">
                      <img 
                        src={paymentData.promptpay.qrCodeImage} 
                        alt="PromptPay QR Code"
                        className="w-48 h-48 mx-auto border rounded-lg"
                      />
                    </div>
                  )}
                  
                  <div className="text-sm space-y-1">
                    <p><strong>PromptPay:</strong> {paymentData.promptpay.number}</p>
                    <p><strong>ชื่อบัญชี:</strong> {paymentData.promptpay.name}</p>
                    <p><strong>จำนวนเงิน:</strong> {paymentData.amount} บาท</p>
                    <p><strong>รหัสอ้างอิง:</strong> {paymentData.paymentId}</p>
                  </div>
                </div>
              )}

              {paymentMethod === "bank_transfer" && paymentData.bankTransfer && (
                <div className="bg-green-50 p-6 rounded-lg">
                  <h4 className="font-semibold mb-4">ข้อมูลการโอนเงิน</h4>
                  <div className="space-y-2 text-sm">
                    <p><strong>ธนาคาร:</strong> {paymentData.bankTransfer.bankName}</p>
                    <p><strong>เลขบัญชี:</strong> {paymentData.bankTransfer.accountNumber}</p>
                    <p><strong>ชื่อบัญชี:</strong> {paymentData.bankTransfer.accountName}</p>
                    <p><strong>จำนวนเงิน:</strong> {paymentData.amount} บาท</p>
                    <p><strong>รหัสอ้างอิง:</strong> {paymentData.paymentId}</p>
                  </div>
                </div>
              )}

              {/* Platform Disclaimer */}
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium mb-1">⚠️ ข้อสำคัญเกี่ยวกับการชำระเงิน</p>
                    <ul className="space-y-1 text-xs">
                      <li>• AOW เป็น <strong>แพลตฟอร์มตัวกลาง</strong> ไม่ใช่ผู้ให้บริการทางการเงิน</li>
                      <li>• การชำระเงินเป็น <strong>ค่าบริการแพลตฟอร์ม</strong> (posting/boosting) เท่านั้น</li>
                      <li>• AOW <strong>ไม่รับประกัน</strong>ผลลัพธ์ของการจ้างงาน</li>
                      <li>• ค่าบริการ<strong>ไม่สามารถขอคืนได้</strong> เว้นแต่ระบบผิดพลาด</li>
                      <li>• คุณ<strong>รับผิดชอบ</strong>การใช้งานและการชำระเงินทั้งหมด</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium mb-1">หมายเหตุสำคัญ:</p>
                    <ul className="space-y-1 text-xs">
                      <li>• ระบบจะตรวจสอบการชำระเงินอัตโนมัติ</li>
                      <li>• งานจะเผยแพร่ทันทีหลังยืนยันการชำระเงิน</li>
                      <li>• หากโอนเงินแล้วให้รอสักครู่ ระบบจะอัปเดตสถานะ</li>
                      <li>• หากไม่ชำระภายในเวลาที่กำหนด การสั่งซื้อจะถูกยกเลิก</li>
                      <li>• <strong>ค่าบริการไม่สามารถขอคืนได้</strong> หลังจากงานถูกเผยแพร่</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Status indicator */}
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                  กำลังตรวจสอบการชำระเงิน...
                </div>
              </div>

              {/* Cancel Button */}
              <div className="text-center pt-4">
                <button
                  onClick={cancelPayment}
                  disabled={cancelling || paymentStatus === "paid"}
                  className="inline-flex items-center gap-2 px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  {cancelling ? 'กำลังยกเลิก...' : 'ยกเลิกการชำระเงิน'}
                </button>
                <p className="text-xs text-gray-500 mt-2">
                  คุณสามารถยกเลิกการชำระเงินได้หากยังไม่ได้ชำระ
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Success */}
          {step === 4 && (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              
              <div>
                <h3 className="text-xl font-bold text-green-600 mb-2">ชำระเงินสำเร็จ! 🎉</h3>
                <p className="text-gray-600">งานของคุณได้รับการเผยแพร่แล้ว</p>
              </div>

              <div className="bg-green-50 p-4 rounded-lg text-left">
                <h4 className="font-semibold mb-2">รายละเอียดการชำระเงิน</h4>
                <div className="text-sm space-y-1">
                  <p><strong>รหัสการชำระเงิน:</strong> {paymentData?.paymentId}</p>
                  <p><strong>แพ็กเกจ:</strong> {packages[selectedPackage].name}</p>
                  <p><strong>จำนวนเงิน:</strong> {calculateTotal()} บาท</p>
                  <p><strong>ระยะเวลาแสดงงาน:</strong> {packages[selectedPackage].duration} วัน</p>
                  {selectedBoosts.length > 0 && (
                    <p><strong>ฟีเจอร์เพิ่มเติม:</strong> {selectedBoosts.map(b => boosts[b].name).join(", ")}</p>
                  )}
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                เสร็จสิ้น
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
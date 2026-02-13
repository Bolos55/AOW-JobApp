// src/components/ServiceFeeModal.jsx
// ✅ Platform Service Fee Modal - ไม่ใช่ payment gateway หรือ escrow
import { useState, useEffect } from "react";
import { X, Smartphone, Building2, Clock, CheckCircle, AlertTriangle, Upload, FileText } from "lucide-react";
import { API_BASE, authHeader } from "../api";

export default function ServiceFeeModal({ open, onClose, job, onServiceFeeSuccess }) {
  const [step, setStep] = useState(1); // 1: Package Selection, 2: Payment Method, 3: Service Fee Payment, 4: Success
  const [selectedPackage, setSelectedPackage] = useState("standard");
  const [selectedServices, setSelectedServices] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState("promptpay");
  const [serviceFeeData, setServiceFeeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");
  const [serviceFeeStatus, setServiceFeeStatus] = useState("pending");
  const [timeLeft, setTimeLeft] = useState(24 * 60 * 60); // 24 hours in seconds
  
  // ✅ State สำหรับอัปโหลดสลิป
  const [paymentSlip, setPaymentSlip] = useState(null);
  const [slipPreview, setSlipPreview] = useState("");
  const [uploadingSlip, setUploadingSlip] = useState(false);

  // ✅ Platform Service Packages - Phase 0-1: ค่าบริการรวมภาษีแล้ว
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
    const additionalServiceFee = selectedServices.reduce((total, service) => total + additionalServices[service].serviceFee, 0);
    return packageFee + additionalServiceFee;
  };

  // Timer countdown
  useEffect(() => {
    if (step === 3 && serviceFeeData && serviceFeeStatus === "pending") {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setError("การชำระค่าบริการหมดเวลาแล้ว กรุณาเริ่มใหม่");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [step, serviceFeeData, serviceFeeStatus]);

  // Check service fee payment status
  useEffect(() => {
    if (serviceFeeData && serviceFeeStatus === "pending") {
      const checkStatus = setInterval(async () => {
        try {
          const res = await fetch(`${API_BASE}/api/payments/${serviceFeeData.paymentId}/status`, {
            headers: authHeader()
          });

          if (res.ok) {
            const data = await res.json();
            if (data.status === "paid") {
              setServiceFeeStatus("paid");
              setStep(4);
              clearInterval(checkStatus);
              if (onServiceFeeSuccess) {
                onServiceFeeSuccess(data);
              }
            } else if (data.status === "failed" || data.status === "expired") {
              setServiceFeeStatus(data.status);
              setError("การชำระค่าบริการไม่สำเร็จ กรุณาลองใหม่");
              clearInterval(checkStatus);
            }
          }
        } catch (err) {
          console.error("Service fee status check error:", err);
        }
      }, 5000); // Check every 5 seconds

      return () => clearInterval(checkStatus);
    }
  }, [serviceFeeData, serviceFeeStatus, onServiceFeeSuccess]);

  // Create service fee payment
  const createServiceFeePayment = async () => {
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
          boostFeatures: selectedServices,
          paymentMethod
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "ไม่สามารถสร้างการชำระค่าบริการได้");
      }

      const data = await res.json();
      setServiceFeeData(data.payment);
      setStep(3);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Cancel service fee payment
  const cancelServiceFeePayment = async () => {
    if (!window.confirm("คุณต้องการยกเลิกการชำระค่าบริการนี้หรือไม่?")) {
      return;
    }

    setCancelling(true);

    try {
      const res = await fetch(`${API_BASE}/api/payments/${serviceFeeData.paymentId}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeader()
        },
        body: JSON.stringify({
          reason: "ผู้ใช้ยกเลิกการชำระค่าบริการ"
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "ไม่สามารถยกเลิกการชำระค่าบริการได้");
      }

      setServiceFeeStatus("cancelled");
      alert("✅ ยกเลิกการชำระค่าบริการเรียบร้อย");
      onClose(); // ปิด modal

    } catch (err) {
      alert("❌ " + err.message);
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto relative">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold">ชำระค่าบริการแพลตฟอร์ม</h2>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full p-2 transition-colors"
            type="button"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Package Selection */}
          {step === 1 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">เลือกแพ็กเกจบริการ</h3>
              
              <div className="space-y-4 mb-6">
                {Object.entries(servicePackages).map(([key, pkg]) => (
                  <div
                    key={key}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedPackage === key ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedPackage(key)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            checked={selectedPackage === key}
                            onChange={() => setSelectedPackage(key)}
                            className="text-blue-600"
                          />
                          <div>
                            <h4 className="font-semibold">{pkg.name}</h4>
                            <p className="text-sm text-gray-600">{pkg.description}</p>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {pkg.features.map((feature, idx) => (
                                <span key={idx} className="text-xs bg-gray-100 px-2 py-1 rounded">
                                  {feature}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-blue-600">{pkg.serviceFee} ฿</p>
                        <p className="text-xs text-gray-500">{pkg.duration} วัน</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <h4 className="font-semibold mb-3">บริการเสริม (เลือกได้หลายรายการ)</h4>
              <div className="space-y-3 mb-6">
                {Object.entries(additionalServices).map(([key, service]) => (
                  <div
                    key={key}
                    className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                      selectedServices.includes(key) ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => {
                      if (selectedServices.includes(key)) {
                        setSelectedServices(selectedServices.filter(b => b !== key));
                      } else {
                        setSelectedServices([...selectedServices, key]);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedServices.includes(key)}
                          onChange={() => {}}
                          className="text-green-600"
                        />
                        <div>
                          <h5 className="font-medium">{service.name}</h5>
                          <p className="text-sm text-gray-600">{service.description}</p>
                          <p className="text-xs text-gray-500">ระยะเวลา: {service.duration}</p>
                        </div>
                      </div>
                      <p className="font-semibold text-green-600">+{service.serviceFee} ฿</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Service Fee Summary */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h4 className="font-semibold mb-2">สรุปค่าบริการ</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>{servicePackages[selectedPackage].name}</span>
                    <span>{servicePackages[selectedPackage].serviceFee} ฿</span>
                  </div>
                  {selectedServices.map(serviceKey => (
                    <div key={serviceKey} className="flex justify-between text-green-600">
                      <span>{additionalServices[serviceKey].name}</span>
                      <span>+{additionalServices[serviceKey].serviceFee} ฿</span>
                    </div>
                  ))}
                  <hr className="my-2" />
                  <div className="flex justify-between font-bold text-lg">
                    <span>ค่าบริการรวม</span>
                    <span className="text-blue-600">{calculateTotalServiceFee()} ฿</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    * ค่าบริการแพลตฟอร์มสำหรับการโพสต์งานและบริการเสริม
                  </p>
                </div>
              </div>

              <button
                onClick={() => setStep(2)}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                ดำเนินการต่อ
              </button>
            </div>
          )}

          {/* Step 2: Payment Method */}
          {step === 2 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">เลือกวิธีชำระค่าบริการ</h3>
              
              <div className="space-y-4 mb-6">
                <div
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    paymentMethod === 'promptpay' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setPaymentMethod('promptpay')}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      checked={paymentMethod === 'promptpay'}
                      onChange={() => setPaymentMethod('promptpay')}
                      className="text-blue-600"
                    />
                    <Smartphone className="w-6 h-6 text-blue-600" />
                    <div>
                      <h4 className="font-semibold">PromptPay</h4>
                      <p className="text-sm text-gray-600">สแกน QR Code ด้วยแอปธนาคาร</p>
                    </div>
                  </div>
                </div>

                <div
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    paymentMethod === 'bank_transfer' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setPaymentMethod('bank_transfer')}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      checked={paymentMethod === 'bank_transfer'}
                      onChange={() => setPaymentMethod('bank_transfer')}
                      className="text-blue-600"
                    />
                    <Building2 className="w-6 h-6 text-green-600" />
                    <div>
                      <h4 className="font-semibold">โอนเงินผ่านธนาคาร</h4>
                      <p className="text-sm text-gray-600">โอนเงินเข้าบัญชีธนาคาร</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  ย้อนกลับ
                </button>
                <button
                  onClick={createServiceFeePayment}
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? "กำลังสร้าง..." : "สร้างการชำระค่าบริการ"}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Service Fee Payment Process */}
          {step === 3 && serviceFeeData && (
            <div>
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold mb-2">ชำระค่าบริการแพลตฟอร์ม</h3>
                <div className="flex items-center justify-center gap-2 text-orange-600 mb-4">
                  <Clock className="w-5 h-5" />
                  <span>เหลือเวลา: {formatTime(timeLeft)}</span>
                </div>
              </div>

              {paymentMethod === 'promptpay' && serviceFeeData.qrCodeData && (
                <div className="text-center mb-6">
                  <div className="bg-white border-2 border-gray-200 rounded-lg p-4 inline-block">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(serviceFeeData.qrCodeData)}`}
                      alt="QR Code สำหรับชำระค่าบริการ"
                      className="w-48 h-48"
                    />
                  </div>
                  <p className="text-sm text-gray-600 mt-2">สแกน QR Code ด้วยแอปธนาคารของคุณ</p>
                </div>
              )}

              {/* ✅ ข้อมูลบัญชีธนาคาร */}
              {paymentMethod === 'bank_transfer' && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
                  <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                    🏦 ข้อมูลบัญชีสำหรับโอนเงิน
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center bg-white rounded p-2">
                      <span className="text-gray-600">ธนาคาร:</span>
                      <span className="font-semibold">ธนาคารกสิกรไทย</span>
                    </div>
                    <div className="flex justify-between items-center bg-white rounded p-2">
                      <span className="text-gray-600">ชื่อบัญชี:</span>
                      <span className="font-semibold">นาย ภูริวัฒน์ โภคสวัสดิ์</span>
                    </div>
                    <div className="flex justify-between items-center bg-white rounded p-2">
                      <span className="text-gray-600">เลขที่บัญชี:</span>
                      <span className="font-mono font-bold text-blue-600">137-1-84567-0</span>
                    </div>
                    <div className="flex justify-between items-center bg-white rounded p-2">
                      <span className="text-gray-600">ประเภทบัญชี:</span>
                      <span className="font-semibold">ออมทรัพย์</span>
                    </div>
                  </div>
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-xs text-yellow-800">
                      ⚠️ <strong>สำคัญ:</strong> โปรดระบุรหัสอ้างอิง <span className="font-mono font-bold">{serviceFeeData.paymentId}</span> ในช่องหมายเหตุเมื่อโอนเงิน
                    </p>
                  </div>
                  
                  {/* ✅ อัปโหลดสลิปการโอนเงิน */}
                  <div className="mt-4">
                    <label className="block text-sm font-semibold text-blue-900 mb-2">
                      📎 แนบสลิปการโอนเงิน
                    </label>
                    
                    {!paymentSlip ? (
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer bg-white hover:bg-blue-50 transition">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload className="w-8 h-8 text-blue-500 mb-2" />
                          <p className="text-sm text-blue-700 font-medium">คลิกเพื่ออัปโหลดสลิป</p>
                          <p className="text-xs text-gray-500 mt-1">รองรับ JPG, PNG (ไม่เกิน 5MB)</p>
                        </div>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/jpeg,image/png"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            
                            if (file.size > 5 * 1024 * 1024) {
                              alert("ไฟล์ต้องไม่เกิน 5MB");
                              return;
                            }
                            
                            setPaymentSlip(file);
                            setSlipPreview(URL.createObjectURL(file));
                          }}
                        />
                      </label>
                    ) : (
                      <div className="relative">
                        <img
                          src={slipPreview}
                          alt="สลิปการโอนเงิน"
                          className="w-full h-48 object-contain bg-gray-50 rounded-lg border"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setPaymentSlip(null);
                            setSlipPreview("");
                          }}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                          <CheckCircle className="w-4 h-4" />
                          <span>อัปโหลดสลิปแล้ว - รอแอดมินตรวจสอบ 5-10 นาที</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h4 className="font-semibold mb-2">รายละเอียดการชำระค่าบริการ</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>รหัสอ้างอิง:</span>
                    <span className="font-mono">{serviceFeeData.paymentId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ค่าบริการ:</span>
                    <span className="font-bold">{serviceFeeData.serviceFee} ฿</span>
                  </div>
                  <div className="flex justify-between">
                    <span>วิธีชำระ:</span>
                    <span>{paymentMethod === 'promptpay' ? 'PromptPay' : 'โอนเงินผ่านธนาคาร'}</span>
                  </div>
                </div>
              </div>

              {serviceFeeStatus === "pending" && (
                <div className="text-center mb-4">
                  {paymentSlip ? (
                    <>
                      <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-green-600">ได้รับสลิปการโอนเงินแล้ว</p>
                      <p className="text-xs text-gray-600 mt-1">
                        แอดมินจะตรวจสอบภายใน 5-10 นาที
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        คุณสามารถปิดหน้าต่างนี้ได้ เราจะแจ้งเตือนเมื่อการชำระเงินสำเร็จ
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      <p className="text-sm text-gray-600">
                        {paymentMethod === 'promptpay' 
                          ? 'กำลังตรวจสอบการชำระค่าบริการ...' 
                          : 'รอการแนบสลิปการโอนเงิน...'}
                      </p>
                    </>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={cancelServiceFeePayment}
                  disabled={cancelling}
                  className="flex-1 bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {cancelling ? "กำลังยกเลิก..." : "ยกเลิก"}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Success */}
          {step === 4 && (
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-green-600 mb-2">ชำระค่าบริการสำเร็จ!</h3>
              <p className="text-gray-600 mb-6">
                งานของคุณได้รับการอนุมัติและเผยแพร่แล้ว
              </p>
              <button
                onClick={onClose}
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
              >
                เสร็จสิ้น
              </button>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                <span className="text-sm">{error}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
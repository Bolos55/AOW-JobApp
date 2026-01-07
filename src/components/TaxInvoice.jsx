// src/components/TaxInvoice.jsx
import { useState } from "react";
import { Download, Printer, X } from "lucide-react";

/**
 * Tax Invoice Component
 * เตรียมไว้สำหรับ Phase 2+ เมื่อมี VAT
 * Phase 0-1: แสดงเป็น Receipt ธรรมดา
 */
export default function TaxInvoice({ payment, onClose }) {
  const [loading, setLoading] = useState(false);

  if (!payment) return null;

  const isVatEnabled = payment.pricing?.vatEnabled || false;
  const hasVatNumber = payment.pricing?.vatNumber;

  // Format date
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Download invoice
  const downloadInvoice = async () => {
    setLoading(true);
    try {
      // TODO: Implement PDF generation
      alert("ฟีเจอร์ดาวน์โหลดใบกำกับภาษีจะพร้อมใช้งานในเร็วๆ นี้");
    } catch (err) {
      alert("ไม่สามารถดาวน์โหลดได้ กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  };

  // Print invoice
  const printInvoice = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b print:hidden">
          <div>
            <h2 className="text-xl font-bold">
              {isVatEnabled && hasVatNumber ? "🧾 ใบกำกับภาษี" : "🧾 ใบเสร็จรับเงิน"}
            </h2>
            <p className="text-sm text-gray-600">
              {payment.paymentId}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={downloadInvoice}
              disabled={loading}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              title="ดาวน์โหลด PDF"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={printInvoice}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              title="พิมพ์"
            >
              <Printer className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Invoice Content */}
        <div className="p-8 print:p-4">
          {/* Company Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-blue-600 mb-2">AOW Job Platform</h1>
            <p className="text-sm text-gray-600">แพลตฟอร์มหางานออนไลน์</p>
            {isVatEnabled && hasVatNumber && (
              <p className="text-sm text-gray-600">
                เลขประจำตัวผู้เสียภาษี: {payment.pricing.vatNumber}
              </p>
            )}
          </div>

          {/* Invoice Info */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="font-semibold mb-2">ข้อมูลการชำระเงิน</h3>
              <div className="text-sm space-y-1">
                <p><strong>เลขที่:</strong> {payment.paymentId}</p>
                <p><strong>วันที่:</strong> {formatDate(payment.paidAt || payment.createdAt)}</p>
                <p><strong>วิธีชำระ:</strong> {
                  payment.paymentMethod === 'promptpay' ? 'PromptPay' : 'โอนธนาคาร'
                }</p>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">ข้อมูลงาน</h3>
              <div className="text-sm space-y-1">
                <p><strong>ตำแหน่ง:</strong> {payment.job?.title || 'ไม่ระบุ'}</p>
                <p><strong>แพ็กเกจ:</strong> {payment.packageType}</p>
                <p><strong>ระยะเวลา:</strong> {payment.packageDuration} วัน</p>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-8">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 px-4 py-2 text-left">รายการ</th>
                  <th className="border border-gray-300 px-4 py-2 text-center">จำนวน</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">ราคาต่อหน่วย</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">จำนวนเงิน</th>
                </tr>
              </thead>
              <tbody>
                {payment.pricing?.breakdown?.map((item, index) => (
                  <tr key={index}>
                    <td className="border border-gray-300 px-4 py-2">{item.description}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center">{item.quantity}</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-right">
                      {formatCurrency(item.amount)}
                    </td>
                  </tr>
                )) || (
                  // Fallback for old payment structure
                  <>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">แพ็กเกจ {payment.packageType}</td>
                      <td className="border border-gray-300 px-4 py-2 text-center">1</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">
                        {formatCurrency(payment.basePrice || 0)}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-right">
                        {formatCurrency(payment.basePrice || 0)}
                      </td>
                    </tr>
                    {payment.boostPrice > 0 && (
                      <tr>
                        <td className="border border-gray-300 px-4 py-2">ฟีเจอร์เพิ่มเติม</td>
                        <td className="border border-gray-300 px-4 py-2 text-center">1</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">
                          {formatCurrency(payment.boostPrice)}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-right">
                          {formatCurrency(payment.boostPrice)}
                        </td>
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>รวมเป็นเงิน:</span>
                  <span>{formatCurrency(payment.pricing?.totalBeforeTax || payment.amount)}</span>
                </div>
                
                {/* VAT (เฉพาะเมื่อมี VAT) */}
                {isVatEnabled && payment.pricing?.taxAmount > 0 && (
                  <div className="flex justify-between">
                    <span>ภาษีมูลค่าเพิ่ม {(payment.pricing.taxRate * 100).toFixed(0)}%:</span>
                    <span>{formatCurrency(payment.pricing.taxAmount)}</span>
                  </div>
                )}
                
                <hr />
                <div className="flex justify-between font-bold text-lg">
                  <span>ยอดรวมทั้งสิ้น:</span>
                  <span>{formatCurrency(payment.pricing?.totalAfterTax || payment.amount)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t text-center text-sm text-gray-600">
            <p>ขอบคุณที่ใช้บริการ AOW Job Platform</p>
            {!isVatEnabled && (
              <p className="text-xs mt-2 text-gray-500">
                * ราคานี้รวมภาษีแล้ว (Phase 0-1)
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
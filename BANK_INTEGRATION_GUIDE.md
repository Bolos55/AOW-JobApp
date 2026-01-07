# 🏦 คู่มือเชื่อมต่อธนาคาร - กสิกรไทย

## 📋 ข้อมูลบัญชีปัจจุบัน
```
ธนาคาร: [YOUR_BANK_NAME]
เลขบัญชี: [YOUR_ACCOUNT_NUMBER]
ชื่อบัญชี: [YOUR_ACCOUNT_NAME]
PromptPay: [YOUR_PROMPTPAY_NUMBER]
```

## 🚀 ตัวเลือกการเชื่อมต่อ

### **Option 1: Kbank Open API (แนะนำสำหรับกสิกรไทย)**

#### **ขั้นตอนการสมัคร:**
1. **ไปที่**: https://developer.kasikornbank.com
2. **สมัครบัญชี**: Developer Account
3. **ยื่นเอกสาร**:
   - สำเนาบัตรประชาชน
   - สำเนาหน้าสมุดบัญชี
   - หนังสือรับรองบริษัท (ถ้ามี)
4. **รอการอนุมัติ**: 3-7 วันทำการ
5. **ได้ API Keys**:
   ```env
   KBANK_API_KEY=your-api-key
   KBANK_API_SECRET=your-api-secret
   KBANK_CLIENT_ID=your-client-id
   KBANK_CLIENT_SECRET=your-client-secret
   ```

#### **API Features:**
- ✅ ตรวจสอบเงินเข้าบัญชี real-time
- ✅ รองรับ PromptPay
- ✅ Webhook notifications
- ✅ Transaction history
- ✅ Balance inquiry

#### **การใช้งาน:**
```javascript
// ตรวจสอบเงินเข้าบัญชี
const verifyPayment = async (paymentId, amount) => {
  const response = await fetch('https://openapi.kasikornbank.com/v1/payment/inquiry', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${KBANK_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      accountNumber: '1371845670',
      reference: paymentId,
      amount: amount,
      transactionDate: new Date().toISOString().split('T')[0]
    })
  });
  
  const data = await response.json();
  return data.success; // true = เงินเข้าแล้ว
};
```

---

### **Option 2: SCB Easy API (ง่ายที่สุด)**

#### **ขั้นตอนการสมัคร:**
1. **ไปที่**: https://developer.scb.co.th
2. **สมัครบัญชี**: ใช้อีเมลและเบอร์โทร
3. **ยืนยันตัวตน**: OTP
4. **สร้าง Application**: ใส่ข้อมูลโปรเจค
5. **ได้ API Keys ทันที**:
   ```env
   SCB_API_KEY=your-api-key
   SCB_API_SECRET=your-api-secret
   SCB_PARTNER_ID=your-partner-id
   ```

#### **ข้อดี:**
- 🚀 สมัครได้ทันที ไม่ต้องรอ
- 📱 รองรับ PromptPay
- 🔄 Real-time verification
- 📊 Dashboard ดูสถิติ

#### **ข้อเสีย:**
- 🏦 ต้องใช้บัญชี SCB (ไม่ใช่กสิกรไทย)
- 💰 อาจมีค่าธรรมเนียม

---

### **Option 3: Third-party Gateway**

#### **2C2P (แนะนำ)**
- **Website**: https://2c2p.com/th
- **รองรับ**: ทุกธนาคารไทย รวมกสิกรไทย
- **Features**: PromptPay, QR Code, Bank Transfer
- **ค่าธรรมเนียม**: 2.9% + 3 บาท/รายการ

#### **Omise**
- **Website**: https://omise.co/th
- **รองรับ**: PromptPay, Internet Banking
- **Features**: API ดี, Documentation ครบ
- **ค่าธรรมเนียม**: 2.65% + 3 บาท/รายการ

#### **GBPrimePay**
- **Website**: https://gbprimepay.com
- **รองรับ**: ธนาคารไทยทุกแห่ง
- **Features**: ราคาถูก, API ง่าย
- **ค่าธรรมเนียม**: 2.5% + 2 บาท/รายการ

---

## 🔧 การตั้งค่าใน Code

### **1. อัปเดต Environment Variables**
```env
# เปลี่ยนจาก Test Mode เป็น Production
PAYMENT_TEST_MODE=false

# เลือก 1 ใน 3 options
# Option 1: Kbank
KBANK_API_KEY=your-api-key
KBANK_API_SECRET=your-api-secret

# Option 2: SCB
SCB_API_KEY=your-api-key
SCB_API_SECRET=your-api-secret

# Option 3: Gateway
PAYMENT_GATEWAY_API_KEY=your-api-key
PAYMENT_GATEWAY_SECRET=your-secret
PAYMENT_GATEWAY_URL=https://api.gateway.com
```

### **2. Code จะทำงานอัตโนมัติ**
ระบบจะเลือกใช้ API ตามที่มี keys:
```javascript
// ใน paymentUtils.js
if (process.env.KBANK_API_KEY) {
  return await verifyKbankPayment(payment);
} else if (process.env.SCB_API_KEY) {
  return await verifySCBPayment(payment);
} else if (process.env.PAYMENT_GATEWAY_API_KEY) {
  return await verifyGatewayPayment(payment);
}
```

---

## 🧪 การทดสอบ

### **Test Mode (ปัจจุบัน)**
```env
PAYMENT_TEST_MODE=true
```
- ใช้ mock data
- ไม่ต้องใส่ API keys
- เหมาะสำหรับ development

### **Production Mode**
```env
PAYMENT_TEST_MODE=false
```
- ใช้ API จริง
- ต้องใส่ API keys
- ตรวจสอบเงินเข้าจริง

---

## 💡 คำแนะนำ

### **สำหรับเริ่มต้น (Phase 0-1):**
1. **ใช้ Test Mode** ก่อนเพื่อทดสอบระบบ
2. **สมัคร SCB Easy API** เพราะง่ายที่สุด
3. **หรือใช้ 2C2P** ถ้าต้องการใช้บัญชีกสิกรไทย

### **สำหรับระยะยาว:**
1. **สมัคร Kbank Open API** เพื่อใช้บัญชีตัวเอง
2. **ใช้ Third-party Gateway** เพื่อรองรับหลายธนาคาร
3. **ตั้งค่า Webhook** เพื่อ real-time notification

---

## 🚨 ข้อควรระวัง

1. **API Keys**: เก็บใน environment variables เท่านั้น
2. **Webhook Security**: ใช้ signature verification
3. **Rate Limiting**: ไม่เรียก API บ่อยเกินไป
4. **Error Handling**: จัดการ error ให้ดี
5. **Logging**: เก็บ log การทำงานไว้

---

## 📞 ติดต่อสอบถาม

- **Kbank**: 02-888-8888
- **SCB**: 02-777-7777
- **2C2P**: support@2c2p.com
- **Omise**: support@omise.co

---

**สรุป**: ตอนนี้ระบบใช้ Test Mode ยังไม่ได้เชื่อมธนาคารจริง  
**แนะนำ**: เริ่มจาก SCB Easy API หรือ 2C2P เพื่อความง่าย
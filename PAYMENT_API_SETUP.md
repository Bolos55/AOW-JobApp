# 🏦 Payment API Setup Guide
## การตั้งค่า Auto Payment Verification

### 📋 **ข้อมูลบัญชีปัจจุบัน**
- **ธนาคาร**: [YOUR_BANK_NAME]
- **เลขบัญชี**: [YOUR_ACCOUNT_NUMBER]  
- **ชื่อบัญชี**: [YOUR_ACCOUNT_NAME]
- **เบอร์พร้อมเพย์**: [YOUR_PROMPTPAY_NUMBER]

---

## 🎯 **Option 1: Kbank Open API (แนะนำสำหรับกสิกร)**

### **ขั้นตอนการสมัคร:**
1. **เข้าไปที่**: https://developer.kasikornbank.com
2. **สมัครสมาชิก** ด้วยข้อมูลธุรกิจ
3. **ยื่นเอกสาร**:
   - สำเนาบัตรประชาชน
   - หนังสือรับรองบริษัท (ถ้ามี)
   - สำเนาสมุดบัญชีธนาคาร
4. **รอการอนุมัติ** (3-7 วันทำการ)
5. **รับ API Keys**

### **API Endpoints ที่ใช้:**
```javascript
// ตรวจสอบการโอนเงิน
POST https://openapi.kasikornbank.com/v1/payment/inquiry

// Headers
Authorization: Bearer {ACCESS_TOKEN}
X-API-Key: {API_KEY}
Content-Type: application/json

// Body
{
  "accountNumber": "1371845670",
  "reference": "PAY_MK2E0NYZ_D6MF9",
  "amount": 348,
  "transactionDate": "2024-01-06"
}
```

### **Environment Variables:**
```env
# Kbank API Configuration
KBANK_API_KEY=your-kbank-api-key
KBANK_API_SECRET=your-kbank-api-secret
KBANK_CLIENT_ID=your-client-id
KBANK_CLIENT_SECRET=your-client-secret
```

---

## 🏦 **Option 2: SCB Easy API**

### **ขั้นตอนการสมัคร:**
1. **เข้าไปที่**: https://developer.scb.co.th
2. **สมัครสมาชิก** (ฟรี)
3. **สร้าง Application**
4. **รับ API Keys ทันที**

### **ข้อดี:**
- ✅ สมัครง่าย ได้ API ทันที
- ✅ ใช้ได้กับทุกธนาคาร
- ✅ Documentation ครบถ้วน
- ✅ Sandbox สำหรับทดสอบ

### **Environment Variables:**
```env
# SCB Easy API Configuration  
SCB_API_KEY=your-scb-api-key
SCB_API_SECRET=your-scb-api-secret
SCB_PARTNER_ID=your-partner-id
```

---

## 🌐 **Option 3: Third-party Gateway (ง่ายที่สุด)**

### **A. 2C2P (แนะนำ)**
- **Website**: https://2c2p.com/th
- **ค่าธรรมเนียม**: 2.9% + 3 บาท/transaction
- **ข้อดี**: Setup ง่าย, รองรับทุกธนาคาร

### **B. Omise**  
- **Website**: https://omise.co/th
- **ค่าธรรมเนียม**: 2.65% + 3 บาท/transaction
- **ข้อดี**: API ดี, Documentation ชัด

### **C. GBPrimePay**
- **Website**: https://gbprimepay.com
- **ค่าธรรมเนียม**: 2.5% + 2 บาท/transaction  
- **ข้อดี**: ราคาถูก, รองรับ PromptPay

---

## 🚀 **Quick Start (แนะนำ SCB Easy)**

### **1. สมัคร SCB Developer Account**
```bash
# 1. ไปที่ https://developer.scb.co.th
# 2. กดสมัครสมาชิก
# 3. ยืนยันอีเมล
# 4. สร้าง Application ใหม่
# 5. Copy API Key และ Secret
```

### **2. อัปเดต Environment Variables**
```env
# เพิ่มใน backend/.env
SCB_API_KEY=SB-Mid-server-your-api-key-here
SCB_API_SECRET=your-api-secret-here
SCB_PARTNER_ID=your-partner-id
```

### **3. ทดสอบ API**
```javascript
// Test API connection
const testSCBAPI = async () => {
  const response = await fetch('https://api-sandbox.partners.scb/partners/sandbox/v1/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${Buffer.from(`${SCB_API_KEY}:${SCB_API_SECRET}`).toString('base64')}`
    },
    body: JSON.stringify({
      grant_type: 'client_credentials'
    })
  });
  
  const data = await response.json();
  console.log('SCB API Test:', data);
};
```

---

## 🔧 **Implementation Steps**

### **Phase 1: Setup API (วันนี้)**
1. เลือก API provider (แนะนำ SCB Easy)
2. สมัครและรับ API keys
3. อัปเดต .env file
4. ทดสอบ API connection

### **Phase 2: Integration (พรุ่งนี้)**  
1. อัปเดต paymentUtils.js
2. ทดสอบ payment verification
3. ทดสอบ end-to-end flow
4. Deploy และ monitor

### **Phase 3: Monitoring (สัปดาหน้า)**
1. ตั้งค่า logging และ alerts
2. Monitor payment success rate
3. Optimize verification timing
4. Handle edge cases

---

## 💡 **คำแนะนำ**

### **สำหรับ Phase 0-1 (เริ่มต้น):**
- ใช้ **SCB Easy API** (ง่ายที่สุด)
- ตั้งค่า verification ทุก 1 นาที
- เก็บ log ทุก API call

### **สำหรับ Phase 2+ (ขยายธุรกิจ):**
- เปลี่ยนไป **Kbank Direct API** (แม่นยำกว่า)
- ใช้ webhook แทน polling
- เพิ่ม redundancy (หลาย API)

---

## 🆘 **หากมีปัญหา**

### **API ไม่ทำงาน:**
1. เช็ค API keys ถูกต้องไหม
2. เช็ค network connectivity  
3. เช็ค API rate limits
4. ดู error logs

### **Payment ไม่ถูกตรวจพบ:**
1. เช็ค reference number ตรงกันไหม
2. เช็ค amount ตรงกันไหม  
3. เช็ค timing (อาจต้องรอ 1-2 นาที)
4. เช็ค account number

### **False Positive:**
1. เพิ่มการตรวจสอบ amount
2. เพิ่มการตรวจสอบ timestamp
3. เพิ่มการตรวจสอบ sender info

---

## 📞 **Support Contacts**

- **SCB Developer**: support@scb.co.th
- **Kbank Developer**: developer@kasikornbank.com  
- **2C2P Support**: support@2c2p.com
- **Omise Support**: support@omise.co

---

**คุณอยากเริ่มจากตัวเลือกไหนครับ?** 🤔
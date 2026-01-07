// backend/utils/paymentUtils.js
import QRCode from 'qrcode';
import crypto from 'crypto';

/**
 * ✅ Platform Service Fee Payment Utilities
 * เครื่องมือสำหรับการชำระค่าบริการแพลตฟอร์ม
 * ไม่ใช่ payment gateway หรือ escrow service
 */

/**
 * สร้าง QR Code สำหรับชำระค่าบริการแพลตฟอร์ม
 */
export const generateQRCode = async (data) => {
  try {
    const qrCodeDataURL = await QRCode.toDataURL(data, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    return qrCodeDataURL;
  } catch (err) {
    console.error('QR Code generation error:', err);
    throw new Error('ไม่สามารถสร้าง QR Code ได้');
  }
};

/**
 * สร้าง PromptPay QR Code สำหรับชำระค่าบริการแพลตฟอร์ม
 */
export const generatePromptPayQR = (phoneNumber, serviceFee, reference) => {
  // PromptPay QR Code format (simplified version)
  // ในการใช้งานจริงต้องใช้ library ที่รองรับ EMV QR Code standard
  
  const formattedPhone = phoneNumber.replace(/[^0-9]/g, '');
  const formattedAmount = parseFloat(serviceFee).toFixed(2);
  
  // Basic PromptPay format (ต้องปรับให้ตรงตาม EMV standard)
  return `00020101021129370016A000000677010111011300${formattedPhone.length}${formattedPhone}5204000053037645802TH5913${process.env.PAYMENT_PROMPTPAY_NAME || 'Platform Service'}6304${reference}`;
};

/**
 * ✅ ตรวจสอบการชำระค่าบริการแพลตฟอร์มอัตโนมัติ
 * ตรวจสอบว่าเงินเข้าบัญชีแพลตฟอร์มแล้วหรือยัง
 */
export const verifyServiceFeePayment = async (payment) => {
  try {
    const { paymentMethod, serviceFee, paymentId } = payment;
    
    // 🧪 Test Mode - ใช้ mock data
    if (process.env.PAYMENT_TEST_MODE === 'true') {
      return await verifyMockServiceFeePayment(payment);
    }
    
    if (paymentMethod === 'promptpay') {
      return await verifyPromptPayServiceFee(payment);
    } else if (paymentMethod === 'bank_transfer') {
      return await verifyBankTransferServiceFee(payment);
    }
    
    return { isPaid: false, message: 'Unsupported payment method' };
    
  } catch (err) {
    console.error('Service fee verification error:', err);
    return { isPaid: false, message: err.message };
  }
};

/**
 * Mock Service Fee Payment Verification สำหรับทดสอบ
 */
const verifyMockServiceFeePayment = async (payment) => {
  console.log(`🧪 Mock service fee verification for payment: ${payment.paymentId}`);
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Mock scenarios based on payment ID
  const paymentId = payment.paymentId;
  
  if (paymentId.includes('TEST_SUCCESS')) {
    return {
      isPaid: true,
      gatewayData: {
        transactionId: `MOCK_SVC_${Date.now()}`,
        gatewayStatus: 'success',
        gatewayMessage: 'Mock service fee payment verification successful',
        rawResponse: {
          serviceFee: payment.serviceFee,
          currency: payment.currency,
          verifiedAt: new Date().toISOString(),
          mockMode: true,
          paymentType: 'platform_service_fee'
        }
      }
    };
  } else if (paymentId.includes('TEST_FAIL')) {
    return {
      isPaid: false,
      message: 'Mock service fee payment verification failed'
    };
  } else {
    // Random success for other payments (70% success rate)
    const isSuccess = Math.random() > 0.3;
    
    if (isSuccess) {
      return {
        isPaid: true,
        gatewayData: {
          transactionId: `MOCK_SVC_${Date.now()}`,
          gatewayStatus: 'success',
          gatewayMessage: 'Mock service fee payment verification successful',
          rawResponse: {
            serviceFee: payment.serviceFee,
            currency: payment.currency,
            verifiedAt: new Date().toISOString(),
            mockMode: true,
            paymentType: 'platform_service_fee'
          }
        }
      };
    } else {
      return {
        isPaid: false,
        message: 'Mock service fee payment not found (simulated pending)'
      };
    }
  }
};

/**
 * ตรวจสอบการชำระค่าบริการผ่าน PromptPay
 */
const verifyPromptPayServiceFee = async (payment) => {
  try {
    // Option 1: ใช้ SCB Easy API
    if (process.env.SCB_API_KEY) {
      return await verifySCBServiceFee(payment);
    }
    
    // Option 2: ใช้ Kbank API
    if (process.env.KBANK_API_KEY) {
      return await verifyKbankServiceFee(payment);
    }
    
    // Option 3: ใช้ Third-party Gateway
    if (process.env.PAYMENT_GATEWAY_API_KEY) {
      return await verifyGatewayServiceFee(payment);
    }
    
    return { isPaid: false, message: 'No service fee verification method configured' };
    
  } catch (err) {
    console.error('PromptPay service fee verification error:', err);
    return { isPaid: false, message: err.message };
  }
};

/**
 * ตรวจสอบผ่าน SCB Easy API
 */
const verifySCBServiceFee = async (payment) => {
  try {
    const response = await fetch('https://api-sandbox.partners.scb/partners/sandbox/v1/payment/billpayment/inquiry', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SCB_API_KEY}`,
        'requestUId': generateRequestId(),
        'resourceOwnerId': process.env.SCB_API_SECRET
      },
      body: JSON.stringify({
        billerId: process.env.PAYMENT_PROMPTPAY_NUMBER,
        reference1: payment.paymentId,
        reference2: payment.serviceFee.toString(),
        transactionDate: new Date().toISOString().split('T')[0]
      })
    });
    
    const data = await response.json();
    
    if (data.status && data.status.code === '1000') {
      return {
        isPaid: true,
        gatewayData: {
          transactionId: data.data.transactionId,
          gatewayStatus: 'success',
          gatewayMessage: 'Service fee payment verified via SCB API',
          rawResponse: data,
          paymentType: 'platform_service_fee'
        }
      };
    }
    
    return { isPaid: false, message: data.status?.description || 'Service fee payment not found' };
    
  } catch (err) {
    console.error('SCB API service fee verification error:', err);
    return { isPaid: false, message: err.message };
  }
};

/**
 * ตรวจสอบผ่าน Kbank API
 */
const verifyKbankServiceFee = async (payment) => {
  try {
    // Implement Kbank API verification
    // This is a placeholder - actual implementation depends on Kbank API documentation
    
    const response = await fetch('https://openapi.kasikornbank.com/v1/payment/inquiry', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.KBANK_API_KEY}`,
        'X-API-Key': process.env.KBANK_API_SECRET
      },
      body: JSON.stringify({
        accountNumber: process.env.PAYMENT_PROMPTPAY_NUMBER,
        reference: payment.paymentId,
        amount: payment.serviceFee,
        transactionDate: new Date().toISOString().split('T')[0]
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      return {
        isPaid: true,
        gatewayData: {
          transactionId: data.transactionId,
          gatewayStatus: 'success',
          gatewayMessage: 'Service fee payment verified via Kbank API',
          rawResponse: data,
          paymentType: 'platform_service_fee'
        }
      };
    }
    
    return { isPaid: false, message: data.message || 'Service fee payment not found' };
    
  } catch (err) {
    console.error('Kbank API service fee verification error:', err);
    return { isPaid: false, message: err.message };
  }
};

/**
 * ตรวจสอบผ่าน Third-party Gateway
 */
const verifyGatewayServiceFee = async (payment) => {
  try {
    const response = await fetch(`${process.env.PAYMENT_GATEWAY_URL}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.PAYMENT_GATEWAY_API_KEY}`,
        'X-API-Secret': process.env.PAYMENT_GATEWAY_SECRET
      },
      body: JSON.stringify({
        paymentId: payment.paymentId,
        amount: payment.serviceFee,
        currency: payment.currency,
        method: payment.paymentMethod,
        paymentType: 'platform_service_fee'
      })
    });
    
    const data = await response.json();
    
    if (data.status === 'paid' || data.status === 'success') {
      return {
        isPaid: true,
        gatewayData: {
          transactionId: data.transactionId,
          gatewayStatus: data.status,
          gatewayMessage: data.message,
          rawResponse: data,
          paymentType: 'platform_service_fee'
        }
      };
    }
    
    return { isPaid: false, message: data.message || 'Service fee payment not verified' };
    
  } catch (err) {
    console.error('Gateway service fee verification error:', err);
    return { isPaid: false, message: err.message };
  }
};

/**
 * ตรวจสอบการโอนเงินผ่านธนาคาร
 */
const verifyBankTransferServiceFee = async (payment) => {
  try {
    // สำหรับการโอนธนาคาร อาจต้องใช้ API ของธนาคารโดยตรง
    // หรือใช้ third-party service ที่ตรวจสอบ bank statement
    
    return { isPaid: false, message: 'Bank transfer service fee verification not implemented yet' };
    
  } catch (err) {
    console.error('Bank transfer service fee verification error:', err);
    return { isPaid: false, message: err.message };
  }
};

/**
 * สร้าง Request ID สำหรับ API calls
 */
const generateRequestId = () => {
  return crypto.randomBytes(16).toString('hex');
};

/**
 * สร้าง Service Fee Payment Reference Number
 */
export const generateServiceFeeReference = (jobId) => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  const jobRef = jobId.toString().substr(-4);
  return `SVC${jobRef}${timestamp}${random}`.toUpperCase(); // SVC = Service Fee
};

/**
 * คำนวณค่าธรรมเนียมการชำระเงิน (ถ้ามี)
 */
export const calculatePaymentFees = (serviceFee, paymentMethod) => {
  const fees = {
    promptpay: 0, // PromptPay ไม่มีค่าธรรมเนียม
    bank_transfer: 0, // โอนธนาคารไม่มีค่าธรรมเนียม
    credit_card: Math.ceil(serviceFee * 0.029) // Credit card 2.9%
  };
  
  return fees[paymentMethod] || 0;
};

/**
 * ตรวจสอบว่าการชำระค่าบริการหมดเวลาหรือยัง
 */
export const isServiceFeePaymentExpired = (payment) => {
  return new Date() > new Date(payment.expiresAt);
};

/**
 * สร้าง Webhook signature
 */
export const generateWebhookSignature = (payload, secret) => {
  return crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
};

/**
 * ตรวจสอบ Webhook signature
 */
export const verifyWebhookSignature = (signature, payload, secret) => {
  const expectedSignature = generateWebhookSignature(payload, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
};

// ✅ Legacy compatibility functions
export const verifyPayment = verifyServiceFeePayment;
export const generatePaymentReference = generateServiceFeeReference;
export const calculateFees = calculatePaymentFees;
export const isPaymentExpired = isServiceFeePaymentExpired;
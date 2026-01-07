// backend/utils/testPaymentAPI.js
// ไฟล์สำหรับทดสอบ Payment API connections

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

/**
 * ทดสอบ SCB Easy API
 */
export const testSCBAPI = async () => {
  console.log('🧪 Testing SCB Easy API...');
  
  try {
    if (!process.env.SCB_API_KEY || !process.env.SCB_API_SECRET) {
      throw new Error('SCB API credentials not found in .env');
    }

    // Step 1: Get Access Token
    const authString = Buffer.from(`${process.env.SCB_API_KEY}:${process.env.SCB_API_SECRET}`).toString('base64');
    
    const tokenResponse = await fetch('https://api-sandbox.partners.scb/partners/sandbox/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`,
        'requestUId': generateRequestId()
      },
      body: JSON.stringify({
        grant_type: 'client_credentials'
      })
    });

    const tokenData = await tokenResponse.json();
    
    if (!tokenResponse.ok) {
      throw new Error(`SCB Token Error: ${JSON.stringify(tokenData)}`);
    }

    console.log('✅ SCB API Token received');
    
    // Step 2: Test Payment Inquiry (Mock)
    const inquiryResponse = await fetch('https://api-sandbox.partners.scb/partners/sandbox/v1/payment/billpayment/inquiry', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenData.access_token}`,
        'requestUId': generateRequestId(),
        'resourceOwnerId': process.env.SCB_API_SECRET
      },
      body: JSON.stringify({
        billerId: process.env.PAYMENT_PROMPTPAY_NUMBER || '0640913324',
        reference1: 'TEST_PAY_123456',
        reference2: '199.00',
        transactionDate: new Date().toISOString().split('T')[0]
      })
    });

    const inquiryData = await inquiryResponse.json();
    
    console.log('📋 SCB Payment Inquiry Response:', inquiryData);
    
    return {
      success: true,
      provider: 'SCB Easy API',
      message: 'API connection successful',
      data: inquiryData
    };

  } catch (err) {
    console.error('❌ SCB API Test Failed:', err.message);
    return {
      success: false,
      provider: 'SCB Easy API',
      error: err.message
    };
  }
};

/**
 * ทดสอบ Kbank API
 */
export const testKbankAPI = async () => {
  console.log('🧪 Testing Kbank Open API...');
  
  try {
    if (!process.env.KBANK_API_KEY || !process.env.KBANK_API_SECRET) {
      throw new Error('Kbank API credentials not found in .env');
    }

    // Mock Kbank API test (actual endpoint may differ)
    const response = await fetch('https://openapi.kasikornbank.com/v1/payment/inquiry', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.KBANK_API_KEY}`,
        'X-API-Key': process.env.KBANK_API_SECRET
      },
      body: JSON.stringify({
        accountNumber: process.env.PAYMENT_BANK_ACCOUNT || '1371845670',
        reference: 'TEST_PAY_123456',
        amount: 199,
        transactionDate: new Date().toISOString().split('T')[0]
      })
    });

    const data = await response.json();
    
    console.log('📋 Kbank API Response:', data);
    
    return {
      success: response.ok,
      provider: 'Kbank Open API',
      message: response.ok ? 'API connection successful' : 'API connection failed',
      data: data
    };

  } catch (err) {
    console.error('❌ Kbank API Test Failed:', err.message);
    return {
      success: false,
      provider: 'Kbank Open API',
      error: err.message
    };
  }
};

/**
 * ทดสอบ Third-party Gateway
 */
export const testGatewayAPI = async () => {
  console.log('🧪 Testing Payment Gateway API...');
  
  try {
    if (!process.env.PAYMENT_GATEWAY_API_KEY || !process.env.PAYMENT_GATEWAY_SECRET) {
      throw new Error('Payment Gateway credentials not found in .env');
    }

    const response = await fetch(`${process.env.PAYMENT_GATEWAY_URL}/test`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.PAYMENT_GATEWAY_API_KEY}`,
        'X-API-Secret': process.env.PAYMENT_GATEWAY_SECRET
      }
    });

    const data = await response.json();
    
    console.log('📋 Gateway API Response:', data);
    
    return {
      success: response.ok,
      provider: 'Payment Gateway',
      message: response.ok ? 'API connection successful' : 'API connection failed',
      data: data
    };

  } catch (err) {
    console.error('❌ Gateway API Test Failed:', err.message);
    return {
      success: false,
      provider: 'Payment Gateway',
      error: err.message
    };
  }
};

/**
 * ทดสอบทุก API ที่มี
 */
export const testAllPaymentAPIs = async () => {
  console.log('🚀 Testing All Payment APIs...\n');
  
  const results = [];
  
  // Test SCB API
  if (process.env.SCB_API_KEY) {
    const scbResult = await testSCBAPI();
    results.push(scbResult);
  }
  
  // Test Kbank API
  if (process.env.KBANK_API_KEY) {
    const kbankResult = await testKbankAPI();
    results.push(kbankResult);
  }
  
  // Test Gateway API
  if (process.env.PAYMENT_GATEWAY_API_KEY) {
    const gatewayResult = await testGatewayAPI();
    results.push(gatewayResult);
  }
  
  // Summary
  console.log('\n📊 API Test Summary:');
  console.log('='.repeat(50));
  
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.provider}: ${result.success ? result.message : result.error}`);
  });
  
  const successCount = results.filter(r => r.success).length;
  console.log(`\n🎯 ${successCount}/${results.length} APIs working`);
  
  if (successCount === 0) {
    console.log('\n⚠️  No payment APIs configured. Please add API credentials to .env file.');
    console.log('📖 See PAYMENT_API_SETUP.md for setup instructions.');
  }
  
  return results;
};

/**
 * สร้าง Request ID สำหรับ API calls
 */
const generateRequestId = () => {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
};

/**
 * ทดสอบ Mock Payment Verification
 */
export const testMockPaymentVerification = async () => {
  console.log('🧪 Testing Mock Payment Verification...');
  
  const mockPayment = {
    paymentId: 'PAY_TEST_123456',
    amount: 199,
    currency: 'THB',
    paymentMethod: 'promptpay',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
  };
  
  // Simulate different scenarios
  const scenarios = [
    { name: 'Payment Found', isPaid: true, delay: 1000 },
    { name: 'Payment Pending', isPaid: false, delay: 500 },
    { name: 'Payment Not Found', isPaid: false, delay: 800 }
  ];
  
  for (const scenario of scenarios) {
    console.log(`\n🎭 Testing: ${scenario.name}`);
    
    await new Promise(resolve => setTimeout(resolve, scenario.delay));
    
    const result = {
      isPaid: scenario.isPaid,
      gatewayData: scenario.isPaid ? {
        transactionId: `TXN_${Date.now()}`,
        gatewayStatus: 'success',
        gatewayMessage: 'Payment verified successfully',
        verifiedAt: new Date().toISOString()
      } : null,
      message: scenario.isPaid ? 'Payment verified' : 'Payment not found'
    };
    
    const status = result.isPaid ? '✅' : '⏳';
    console.log(`${status} ${scenario.name}: ${result.message}`);
    
    if (result.gatewayData) {
      console.log(`   Transaction ID: ${result.gatewayData.transactionId}`);
    }
  }
  
  return true;
};

// Export for CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  testAllPaymentAPIs();
}
// test-fixes.js - Quick verification script for the fixes
const API_BASE = 'https://aow-jobapp-backend.onrender.com';

// Test 1: Check CORS configuration
async function testCORS() {
  console.log('🧪 Testing CORS configuration...');
  
  try {
    const response = await fetch(`${API_BASE}/api/health`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://aow-jobapp-frontend.onrender.com',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
      }
    });
    
    console.log('✅ CORS preflight status:', response.status);
    console.log('✅ CORS headers:', {
      'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
      'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
      'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers')
    });
  } catch (error) {
    console.error('❌ CORS test failed:', error.message);
  }
}

// Test 2: Check API health and Cloudinary status
async function testAPIHealth() {
  console.log('🧪 Testing API health...');
  
  try {
    const response = await fetch(`${API_BASE}/api/health`);
    const data = await response.json();
    
    console.log('✅ API Status:', data.status);
    console.log('✅ Cloudinary Config:', data.cloudinary);
    console.log('✅ Security Features:', data.security);
  } catch (error) {
    console.error('❌ API health test failed:', error.message);
  }
}

// Test 3: Check photo upload endpoint CORS
async function testPhotoUploadCORS() {
  console.log('🧪 Testing photo upload CORS...');
  
  try {
    const response = await fetch(`${API_BASE}/api/profile/me/photo`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://aow-jobapp-frontend.onrender.com',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
      }
    });
    
    console.log('✅ Photo upload CORS status:', response.status);
    console.log('✅ Photo upload CORS headers:', {
      'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
      'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods')
    });
  } catch (error) {
    console.error('❌ Photo upload CORS test failed:', error.message);
  }
}

// Run all tests
async function runTests() {
  console.log('🚀 Starting AOW Job Platform Fix Verification Tests\n');
  
  await testCORS();
  console.log('');
  
  await testAPIHealth();
  console.log('');
  
  await testPhotoUploadCORS();
  console.log('');
  
  console.log('✅ All tests completed!');
  console.log('📋 Next steps:');
  console.log('1. Deploy the updated code to production');
  console.log('2. Test photo upload functionality in the browser');
  console.log('3. Test PaymentHistory modal functionality');
  console.log('4. Monitor server logs for any remaining issues');
}

// Run tests if this file is executed directly
if (typeof window === 'undefined') {
  runTests().catch(console.error);
}

// Export for browser usage
if (typeof module !== 'undefined') {
  module.exports = { testCORS, testAPIHealth, testPhotoUploadCORS, runTests };
}
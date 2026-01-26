// test-all-endpoints.js - ทดสอบ endpoints ทั้งหมด
const API_BASE = 'http://localhost:5000';

const endpoints = {
  // Auth endpoints
  auth: [
    'GET /api/auth/me',
    'POST /api/auth/login',
    'POST /api/auth/register', 
    'POST /api/auth/forgot-password',
    'POST /api/auth/reset-password',
    'POST /api/auth/verify-email',
    'POST /api/auth/resend-verification'
  ],
  
  // Firebase Auth
  firebase: [
    'POST /api/auth/firebase-google',
    'GET /api/auth/test'
  ],
  
  // Jobs
  jobs: [
    'GET /api/jobs',
    'POST /api/jobs',
    'GET /api/jobs/:id',
    'PUT /api/jobs/:id',
    'DELETE /api/jobs/:id'
  ],
  
  // Applications (mounted at /api)
  applications: [
    'POST /api/applications',
    'GET /api/jobs/:id/applications',
    'PUT /api/applications/:id/hire',
    'PATCH /api/applications/:id/status',
    'POST /api/applications/:id/status',
    'GET /api/my-applications'
  ],
  
  // Profile
  profile: [
    'GET /api/profile/me',
    'PUT /api/profile/me',
    'POST /api/profile/me/photo',
    'POST /api/profile/me/resume',
    'DELETE /api/profile/me/photo',
    'GET /api/profile/me/photo-status',
    'GET /api/profile/:userId'
  ],
  
  // Payments
  payments: [
    'GET /api/payments/my-payments',
    'POST /api/payments/create',
    'GET /api/payments/:id/status',
    'POST /api/payments/webhook'
  ],
  
  // Chat
  chats: [
    'POST /api/chats/start',
    'POST /api/chats/contact-admin',
    'GET /api/chats/my',
    'GET /api/chats/threads',
    'GET /api/chats/:threadId/messages',
    'POST /api/chats/:threadId/messages'
  ],
  
  // Reviews
  reviews: [
    'GET /api/reviews/job/:jobId',
    'GET /api/reviews/can-review/:jobId',
    'POST /api/reviews'
  ],
  
  // Admin
  admin: [
    'GET /api/admin/dashboard',
    'GET /api/admin/users',
    'GET /api/admin/jobs',
    'GET /api/admin/applications'
  ],
  
  // Employer
  employer: [
    'GET /api/employer/my-jobs',
    'GET /api/employer/my-applications-received'
  ],
  
  // Online Status
  online: [
    'GET /api/online/status',
    'POST /api/online/heartbeat'
  ],
  
  // PDPA
  pdpa: [
    'GET /api/pdpa/my-data',
    'DELETE /api/pdpa/delete-account',
    'PUT /api/pdpa/correct-data',
    'POST /api/pdpa/object-processing',
    'GET /api/pdpa/privacy-settings'
  ]
};

async function testEndpoint(method, url, requiresAuth = false) {
  try {
    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    // Add dummy auth header for protected routes
    if (requiresAuth) {
      options.headers.Authorization = 'Bearer dummy-token';
    }
    
    // Add dummy body for POST requests
    if (method === 'POST') {
      options.body = JSON.stringify({});
    }
    
    const response = await fetch(`${API_BASE}${url}`, options);
    
    return {
      url,
      method,
      status: response.status,
      ok: response.ok,
      statusText: response.statusText
    };
  } catch (error) {
    return {
      url,
      method,
      status: 'ERROR',
      ok: false,
      error: error.message
    };
  }
}

async function testAllEndpoints() {
  console.log('🧪 Testing all API endpoints...\n');
  
  const results = {
    working: [],
    notFound: [],
    errors: [],
    authRequired: []
  };
  
  for (const [category, endpointList] of Object.entries(endpoints)) {
    console.log(`\n📂 Testing ${category.toUpperCase()} endpoints:`);
    
    for (const endpoint of endpointList) {
      const [method, url] = endpoint.split(' ');
      
      // Test without auth first
      const result = await testEndpoint(method, url, false);
      
      console.log(`${method.padEnd(6)} ${url.padEnd(35)} → ${result.status}`);
      
      if (result.status === 404) {
        results.notFound.push(result);
      } else if (result.status === 401 || result.status === 403) {
        results.authRequired.push(result);
      } else if (result.status === 'ERROR') {
        results.errors.push(result);
      } else {
        results.working.push(result);
      }
    }
  }
  
  // Summary
  console.log('\n📊 SUMMARY:');
  console.log(`✅ Working endpoints: ${results.working.length}`);
  console.log(`🔒 Auth required: ${results.authRequired.length}`);
  console.log(`❌ Not found (404): ${results.notFound.length}`);
  console.log(`💥 Errors: ${results.errors.length}`);
  
  if (results.notFound.length > 0) {
    console.log('\n❌ 404 NOT FOUND:');
    results.notFound.forEach(r => console.log(`   ${r.method} ${r.url}`));
  }
  
  if (results.errors.length > 0) {
    console.log('\n💥 ERRORS:');
    results.errors.forEach(r => console.log(`   ${r.method} ${r.url} - ${r.error}`));
  }
  
  return results;
}

// Run the test
testAllEndpoints().catch(console.error);
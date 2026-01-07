# 🚀 Deploy Guide: GitHub + Render

## 📋 **Pre-Deploy Checklist**

### ✅ **1. Environment Variables**
```env
# Production Settings
FRONTEND_URL=https://aow-jobapp-frontend.onrender.com
CORS_ORIGIN=http://localhost:3000,http://127.0.0.1:3000,http://192.168.137.1:3000,https://aow-jobapp-frontend.onrender.com

# Payment Settings
PAYMENT_TEST_MODE=false  # ⚠️ เปลี่ยนเป็น false สำหรับ production
PAYMENT_ENABLED=true
PAYMENT_AUTO_VERIFY=true

# Security
COOKIE_SECURE=true       # ⚠️ เปลี่ยนเป็น true สำหรับ HTTPS
```

### ✅ **2. API Configuration**
Frontend `src/api.js` พร้อมแล้ว:
```javascript
export const API_BASE = isLocal
  ? "http://localhost:5000"          // Development
  : "https://aow-jobapp.onrender.com"; // Production
```

---

## 🔧 **Deploy Steps**

### **Step 1: Push to GitHub**
```bash
# 1. Add all files
git add .

# 2. Commit changes
git commit -m "feat: Add payment cancellation feature + production ready"

# 3. Push to GitHub
git push origin main
```

### **Step 2: Deploy Backend to Render**
1. **Go to**: https://render.com
2. **Create New Web Service**
3. **Connect GitHub Repository**
4. **Settings**:
   ```
   Name: aow-jobapp
   Environment: Node
   Build Command: npm install
   Start Command: npm start
   ```

5. **Environment Variables** (Add in Render Dashboard):
   ```env
   PORT=5000
   MONGODB_URI=mongodb+srv://bosszazababa_db_user:Bossmaha_55@cluster0.7pefvkv.mongodb.net/job-app?retryWrites=true&w=majority&appName=Cluster0
   
   JWT_SECRET=AOW_JobApp_2024_SuperSecure_Key_Kj32jklsdjf9034u90asdjf09asdjf_RandomString_XyZ789
   JWT_EXPIRE=7d
   
   FRONTEND_URL=https://aow-jobapp-frontend.onrender.com
   CORS_ORIGIN=https://aow-jobapp-frontend.onrender.com
   
   # Payment Settings
   PAYMENT_ENABLED=true
   PAYMENT_TEST_MODE=false
   PAYMENT_PROMPTPAY_NUMBER=0640913324
   PAYMENT_PROMPTPAY_NAME=นาย ภูริวัฒน์ โภคสวัสดิ์
   PAYMENT_BANK_ACCOUNT=1371845670
   PAYMENT_BANK_ACCOUNT_NAME=นาย ภูริวัฒน์ โภคสวัสดิ์
   
   # Security
   COOKIE_SECURE=true
   COOKIE_HTTP_ONLY=true
   ```

### **Step 3: Deploy Frontend to Render**
1. **Create New Static Site**
2. **Connect Same GitHub Repository**
3. **Settings**:
   ```
   Name: aow-jobapp-frontend
   Build Command: npm run build
   Publish Directory: build
   ```

---

## ⚠️ **Important Changes for Production**

### **1. Payment Test Mode**
```env
# Development
PAYMENT_TEST_MODE=true   # ใช้ mock data

# Production  
PAYMENT_TEST_MODE=false  # ใช้ API จริง (ต้องมี API keys)
```

### **2. Security Settings**
```env
# Development
COOKIE_SECURE=false      # HTTP localhost

# Production
COOKIE_SECURE=true       # HTTPS only
```

### **3. CORS Configuration**
```env
CORS_ORIGIN=https://aow-jobapp-frontend.onrender.com
```

### **4. API Keys (ถ้าใช้ Production Payment)**
```env
# เพิ่มใน Render Environment Variables
SCB_API_KEY=your-production-api-key
SCB_API_SECRET=your-production-api-secret
```

---

## 🧪 **Testing After Deploy**

### **1. Basic Functionality**
- ✅ Login/Register
- ✅ Job posting
- ✅ Job search
- ✅ Chat system
- ✅ Admin panel

### **2. Payment System**
- ✅ Package selection
- ✅ Payment creation
- ✅ Payment status check
- ✅ Payment cancellation
- ⚠️ **Test Mode**: Mock verification
- 🔴 **Production Mode**: Real API (ต้องมี API keys)

### **3. URLs to Test**
```
Frontend: https://aow-jobapp-frontend.onrender.com
Backend:  https://aow-jobapp.onrender.com
API:      https://aow-jobapp.onrender.com/api/health

Payment Demo: https://aow-jobapp-frontend.onrender.com/payment-demo
```

---

## 🔧 **Troubleshooting**

### **CORS Errors**
```javascript
// Check CORS_ORIGIN in backend .env
CORS_ORIGIN=https://aow-jobapp-frontend.onrender.com
```

### **API Connection Issues**
```javascript
// Check API_BASE in frontend src/api.js
const isLocal = window.location.hostname === "localhost";
export const API_BASE = isLocal 
  ? "http://localhost:5000" 
  : "https://aow-jobapp.onrender.com";
```

### **Payment Not Working**
```env
# For testing: use mock mode
PAYMENT_TEST_MODE=true

# For production: need real API keys
PAYMENT_TEST_MODE=false
SCB_API_KEY=your-real-api-key
```

### **Environment Variables Missing**
1. Go to Render Dashboard
2. Select your service
3. Go to Environment tab
4. Add missing variables
5. Redeploy

---

## 📊 **Monitoring**

### **Render Dashboard**
- ✅ Build logs
- ✅ Runtime logs  
- ✅ Metrics
- ✅ Environment variables

### **Application Health**
```bash
# Check backend health
curl https://aow-jobapp.onrender.com/api/health

# Check frontend
curl https://aow-jobapp-frontend.onrender.com
```

---

## 🎯 **Post-Deploy Tasks**

### **1. Update GitHub OAuth**
- Add production URL to GitHub OAuth app
- Update redirect URLs

### **2. Setup Payment APIs**
- Register for SCB Easy API (production)
- Add production API keys to Render
- Test real payment flow

### **3. Email Configuration**
- Setup production email service
- Update email templates with production URLs

### **4. Monitoring & Analytics**
- Setup error tracking (Sentry)
- Add analytics (Google Analytics)
- Monitor performance

---

## 🚨 **Security Checklist**

- ✅ HTTPS only (COOKIE_SECURE=true)
- ✅ Strong JWT secrets
- ✅ CORS properly configured
- ✅ Rate limiting enabled
- ✅ Input validation
- ✅ File upload restrictions
- ⚠️ API keys in environment variables (not code)
- ⚠️ Database connection secured

---

**Ready to deploy! 🚀**

คุณสามารถ push ขึ้น GitHub และ deploy ไปยัง Render ได้เลย
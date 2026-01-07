# 🔒 Security Guide - AOW JobApp

## 🛡️ Security Features Implemented

### 1. **Authentication & Authorization**
- ✅ JWT tokens with strong secrets
- ✅ Refresh token mechanism
- ✅ Role-based access control (Admin, Employer, JobSeeker)
- ✅ Social login with Firebase & GitHub OAuth
- ✅ Password strength validation
- ✅ Session timeout management

### 2. **Input Validation & Sanitization**
- ✅ MongoDB injection prevention
- ✅ XSS protection
- ✅ HTTP Parameter Pollution prevention
- ✅ File upload validation
- ✅ Email & phone validation

### 3. **Rate Limiting**
- ✅ API rate limiting (100 requests/15 minutes)
- ✅ Auth rate limiting (5 attempts/15 minutes)
- ✅ File upload rate limiting (10 uploads/hour)
- ✅ Client-side rate limiting

### 4. **Security Headers**
- ✅ Helmet.js for security headers
- ✅ Content Security Policy (CSP)
- ✅ CORS configuration
- ✅ Secure cookies

### 5. **File Security**
- ✅ File type validation
- ✅ File size limits (5MB max)
- ✅ Secure file storage
- ✅ Path traversal prevention

### 6. **Data Protection**
- ✅ Password hashing with bcrypt
- ✅ Secure environment variables
- ✅ Database connection security
- ✅ Sensitive data encryption

---

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
# Strong JWT secrets (64+ characters recommended)
JWT_SECRET=AOW_JobApp_2024_SuperSecure_Key_...
JWT_REFRESH_SECRET=AOW_JobApp_2024_RefreshToken_Secret_...

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File security
MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,application/pdf...

# Admin security
ADMIN_API_KEY=AOW_Admin_2024_SuperSecret_API_Key_...
```

#### Frontend (.env)
```env
# Security settings
REACT_APP_MAX_FILE_SIZE=5242880
REACT_APP_SESSION_TIMEOUT=3600000
REACT_APP_ENABLE_CONSOLE_LOGS=false

# Feature flags
REACT_APP_MAINTENANCE_MODE=false
```

---

## 🚨 Security Best Practices

### 1. **Password Security**
- Minimum 8 characters
- Must include: uppercase, lowercase, numbers, special characters
- Hashed with bcrypt (salt rounds: 12)
- No password reuse validation

### 2. **Session Management**
- JWT tokens expire in 7 days
- Refresh tokens expire in 30 days
- Auto-logout on inactivity (1 hour)
- Secure cookie settings

### 3. **File Upload Security**
- File type whitelist only
- Size limits enforced
- Virus scanning (recommended for production)
- Secure file naming

### 4. **API Security**
- Rate limiting on all endpoints
- Input validation on all requests
- Admin endpoints require API key
- CORS properly configured

### 5. **Frontend Security**
- XSS prevention
- CSP headers
- Secure local storage
- Console protection in production

---

## 🔍 Security Monitoring

### Logging & Monitoring
- Suspicious request patterns logged
- Failed authentication attempts tracked
- Rate limit violations recorded
- File upload activities monitored

### Security Alerts
```javascript
// Suspicious patterns detected:
- Path traversal attempts (..)
- XSS attempts (<script>)
- SQL injection attempts (union select)
- JavaScript injection (javascript:)
```

---

## 🛠️ Installation & Setup

### 1. Install Security Dependencies
```bash
cd backend
npm install express-rate-limit helmet express-mongo-sanitize xss-clean hpp express-validator
```

### 2. Apply Security Middleware
```javascript
import { securityHeaders, corsOptions, sanitizeInput } from './middleware/security.js';

app.use(securityHeaders);
app.use(cors(corsOptions));
app.use(sanitizeInput);
```

### 3. Enable Security Features
```javascript
import { setupSessionTimeout, protectConsole, setupCSP } from './utils/security.js';

setupSessionTimeout();
protectConsole();
setupCSP();
```

---

## 🚀 Production Security Checklist

### Before Deployment:
- [ ] Change all default passwords and secrets
- [ ] Enable HTTPS/SSL certificates
- [ ] Configure firewall rules
- [ ] Set up monitoring and logging
- [ ] Enable database encryption
- [ ] Configure backup systems
- [ ] Set up intrusion detection
- [ ] Enable API documentation protection
- [ ] Configure CDN security
- [ ] Set up vulnerability scanning

### Environment Security:
- [ ] Use environment-specific configs
- [ ] Secure environment variables
- [ ] Enable production logging
- [ ] Configure error handling
- [ ] Set up health checks
- [ ] Enable performance monitoring

---

## 🆘 Security Incident Response

### If Security Breach Detected:
1. **Immediate Actions**
   - Disable affected accounts
   - Revoke compromised tokens
   - Block suspicious IPs
   - Enable maintenance mode if needed

2. **Investigation**
   - Review security logs
   - Identify attack vectors
   - Assess data exposure
   - Document findings

3. **Recovery**
   - Patch vulnerabilities
   - Reset affected credentials
   - Notify affected users
   - Update security measures

4. **Prevention**
   - Implement additional security
   - Update monitoring rules
   - Conduct security review
   - Train team on new threats

---

## 📞 Security Contacts

- **Security Team**: security@aow-jobapp.com
- **Emergency**: +66-xxx-xxx-xxxx
- **Bug Bounty**: security-bugs@aow-jobapp.com

---

## 📚 Security Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Checklist](https://blog.risingstack.com/node-js-security-checklist/)
- [React Security Best Practices](https://snyk.io/blog/10-react-security-best-practices/)

---

**Last Updated**: January 2025  
**Security Version**: 2.0  
**Next Review**: March 2025
# 🔒 Production Security Checklist

## ⚠️ CRITICAL - Complete Before Production Deployment

### 🔴 1. Credential Rotation (URGENT)

#### MongoDB Database
- [ ] Change MongoDB Atlas password
- [ ] Update `MONGODB_URI` in production environment
- [ ] Test database connection
- [ ] Verify user permissions

#### GitHub OAuth
- [ ] Regenerate GitHub OAuth secret
- [ ] Update `GITHUB_CLIENT_SECRET` in production
- [ ] Test GitHub login flow
- [ ] Verify authorized domains

#### Email Service
- [ ] Generate new Gmail app password
- [ ] Update `EMAIL_PASS` in production
- [ ] Test email sending functionality
- [ ] Verify SMTP settings

### 🔴 2. Environment Variables Security

#### Production Environment Setup
- [ ] All secrets use cryptographically secure random values
- [ ] No hardcoded credentials in code
- [ ] Environment variables properly configured in hosting platform
- [ ] Sensitive data not logged in production

#### Required Environment Variables
```bash
# Generate these with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=<64-byte-hex-string>
JWT_REFRESH_SECRET=<64-byte-hex-string>

# Generate these with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_SECRET=<32-byte-hex-string>
ADMIN_API_KEY=<32-byte-hex-string>
PAYMENT_WEBHOOK_SECRET=<32-byte-hex-string>
```

### 🔴 3. Git History Cleanup

#### Remove Sensitive Data from Git
```bash
# ⚠️ WARNING: This rewrites git history - backup first!
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch .env backend/.env *.env' \
  --prune-empty --tag-name-filter cat -- --all

# Force push (coordinate with team)
git push origin --force --all
git push origin --force --tags
```

#### Verify Cleanup
- [ ] No .env files in git history
- [ ] No hardcoded secrets in any commits
- [ ] All team members have updated repositories

### 🟡 4. Security Configuration

#### HTTPS & SSL
- [ ] HTTPS enforced on all endpoints
- [ ] SSL certificates properly configured
- [ ] HSTS headers enabled
- [ ] Secure cookies enabled (`COOKIE_SECURE=true`)

#### CORS Configuration
- [ ] CORS origins restricted to production domains only
- [ ] No wildcard origins (`*`) allowed
- [ ] Credentials properly configured

#### Rate Limiting
- [ ] Rate limiting enabled on all endpoints
- [ ] Auth endpoints have stricter limits
- [ ] Payment endpoints have strict limits
- [ ] Upload endpoints have appropriate limits

### 🟡 5. Firebase Security

#### Firebase Configuration
- [ ] Firebase Admin SDK properly configured
- [ ] Service account key securely stored
- [ ] Authorized domains updated for production
- [ ] Firebase rules properly configured

#### Authentication Flow
- [ ] ID token verification working
- [ ] No insecure authentication endpoints
- [ ] Social login properly secured

### 🟡 6. Payment Security

#### Webhook Security
- [ ] Webhook signature verification enabled
- [ ] HMAC-SHA256 properly implemented
- [ ] Raw body parsing configured
- [ ] Webhook endpoints rate limited

#### Payment Gateway
- [ ] Production API keys configured
- [ ] Test mode disabled in production
- [ ] Payment amounts validated server-side
- [ ] Transaction logging enabled

### 🟡 7. File Upload Security

#### Upload Configuration
- [ ] File type validation enabled
- [ ] File size limits enforced
- [ ] Random filenames generated
- [ ] Upload rate limiting enabled
- [ ] Virus scanning (if applicable)

#### Storage Security
- [ ] Files stored outside web root
- [ ] Direct file access restricted
- [ ] File permissions properly set

### 🟡 8. Database Security

#### MongoDB Security
- [ ] Database user has minimal required permissions
- [ ] IP whitelist configured
- [ ] Connection encryption enabled
- [ ] Audit logging enabled (if available)

#### Data Protection
- [ ] Sensitive data encrypted at rest
- [ ] PII data properly handled
- [ ] Data retention policies implemented

### 🟡 9. Monitoring & Logging

#### Security Monitoring
- [ ] Failed login attempts logged
- [ ] Suspicious activity alerts configured
- [ ] Rate limit violations logged
- [ ] Payment fraud detection enabled

#### Error Handling
- [ ] Error messages don't expose sensitive data
- [ ] Stack traces disabled in production
- [ ] Proper error logging configured

### 🟡 10. Compliance & Legal

#### Data Protection
- [ ] GDPR compliance implemented (if applicable)
- [ ] Privacy policy updated
- [ ] Terms of service updated
- [ ] Cookie consent implemented

#### Security Policies
- [ ] Security incident response plan
- [ ] Regular security audit schedule
- [ ] Vulnerability disclosure policy

## 🧪 Testing Checklist

### Security Testing
- [ ] Authentication flows tested
- [ ] Authorization properly enforced
- [ ] Input validation working
- [ ] File upload security tested
- [ ] Payment flows secured
- [ ] Rate limiting functional

### Performance Testing
- [ ] Rate limits don't affect normal usage
- [ ] Security middleware doesn't impact performance
- [ ] Database queries optimized
- [ ] File uploads perform well

### Integration Testing
- [ ] Firebase authentication working
- [ ] Email sending functional
- [ ] Payment gateway integration working
- [ ] File uploads working
- [ ] All API endpoints functional

## 📋 Deployment Steps

### Pre-Deployment
1. [ ] Complete all security checklist items
2. [ ] Run security tests
3. [ ] Backup current production data
4. [ ] Prepare rollback plan

### Deployment
1. [ ] Deploy with new environment variables
2. [ ] Verify all services start correctly
3. [ ] Test critical functionality
4. [ ] Monitor for errors

### Post-Deployment
1. [ ] Verify all security features working
2. [ ] Monitor logs for issues
3. [ ] Test user flows
4. [ ] Update documentation

## 🚨 Emergency Procedures

### Security Incident Response
1. **Immediate Actions**
   - Identify and contain the incident
   - Preserve evidence
   - Notify stakeholders

2. **Investigation**
   - Analyze logs and evidence
   - Determine scope of impact
   - Document findings

3. **Recovery**
   - Implement fixes
   - Rotate compromised credentials
   - Update security measures

4. **Post-Incident**
   - Conduct post-mortem
   - Update security procedures
   - Implement preventive measures

### Contact Information
- **Security Team**: security@your-domain.com
- **DevOps Team**: devops@your-domain.com
- **Emergency Contact**: +66-xxx-xxx-xxxx

---

**⚠️ CRITICAL REMINDER**: Do not deploy to production until ALL critical items are completed and verified.

**📅 Review Schedule**: This checklist should be reviewed and updated quarterly.

**🔄 Last Updated**: January 2026
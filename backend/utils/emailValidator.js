// backend/utils/emailValidator.js
import dns from 'dns';
import { promisify } from 'util';

const resolveMx = promisify(dns.resolveMx);

// ✅ รายการ disposable email domains ที่ครอบคลุม
const DISPOSABLE_DOMAINS = [
  // Popular temporary email services
  '10minutemail.com', 'tempmail.org', 'guerrillamail.com', 'mailinator.com',
  'yopmail.com', 'temp-mail.org', 'throwaway.email', 'maildrop.cc',
  'sharklasers.com', 'grr.la', 'guerrillamailblock.com', 'pokemail.net',
  'spam4.me', 'bccto.me', 'chacuo.net', 'dispostable.com', 'fakeinbox.com',
  'hidemail.de', 'mytrashmail.com', 'no-spam.ws', 'nospam.ze.tc',
  'nowmymail.com', 'objectmail.com', 'sogetthis.com', 'spamherald.com',
  'spamhole.com', 'speed.1s.fr', 'temporary.email', 'trashmail.at',
  'trashmail.com', 'trashmail.io', 'trashmail.me', 'trashmail.net',
  'trashmail.org', 'wegwerfmail.de', 'wegwerfmail.net', 'wegwerfmail.org',
  'wh4f.org', 'whatpaas.com', 'willhackforfood.biz', 'wronghead.com',
  'wuzupmail.net', 'xoxy.net', 'yoggm.com', 'zehnminutenmail.de',
  
  // Additional disposable domains
  'emailondeck.com', 'guerrillamail.org', 'guerrillamail.net', 'guerrillamail.biz',
  'guerrillamail.de', 'spam.la', 'mailcatch.com', 'mailnesia.com',
  'tempinbox.com', 'tempmail.net', '20minutemail.com', 'emailfake.com',
  'getnada.com', 'harakirimail.com', 'incognitomail.org', 'jetable.org',
  'mailexpire.com', 'mailforspam.com', 'mailmetrash.com', 'mintemail.com',
  'mytemp.email', 'tempail.com', 'tempemail.com', 'tempr.email',
  'throwawaymail.com', 'trashymail.com', 'yopmail.fr', 'yopmail.net',
  
  // Thai disposable domains
  'tempmail.co.th', 'throwaway.co.th', 'temp.co.th',
  
  // Common patterns for disposable services
  'mailtemp.info', 'tempemails.net', 'disposablemail.com', 'throwawayemails.com',
  'temporaryemail.net', 'fakemail.net', 'tempemailaddress.com'
];

// ✅ รูปแบบอีเมลที่น่าสงสัย
const SUSPICIOUS_PATTERNS = [
  /^[a-z]+\d{4,}@/i,           // เช่น user12345@
  /^test\d*@/i,                // เช่น test123@
  /^fake\d*@/i,                // เช่น fake@
  /^temp\d*@/i,                // เช่น temp@
  /^spam\d*@/i,                // เช่น spam@
  /^\d+@/,                     // เช่น 123456@
  /^[a-z]{1,2}\d+@/i,          // เช่น a1@, ab123@
  /^admin\d*@/i,               // เช่น admin@, admin123@
  /^root\d*@/i,                // เช่น root@
  /^noreply\d*@/i,             // เช่น noreply@
  /^no-reply\d*@/i,            // เช่น no-reply@
  /^donotreply\d*@/i,          // เช่น donotreply@
  /^[a-z]+\.?[a-z]*\d{3,}@/i,  // เช่น john.doe123@, user456@
  /^[a-z]{10,}@/i,             // ชื่อยาวผิดปกติ เช่น abcdefghijk@
  /^[a-z]{1,3}@/i,             // ชื่อสั้นผิดปกติ เช่น a@, ab@, abc@
];

// ✅ Domains ที่น่าเชื่อถือ (whitelist)
const TRUSTED_DOMAINS = [
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com',
  'icloud.com', 'me.com', 'mac.com', 'protonmail.com', 'tutanota.com',
  'fastmail.com', 'zoho.com', 'aol.com', 'mail.com', 'gmx.com',
  
  // Thai domains
  'hotmail.co.th', 'yahoo.co.th', 'gmail.co.th', 'live.co.th',
  'sanook.com', 'thaimail.com', 'loxinfo.co.th', 'csloxinfo.com',
  
  // Corporate domains (common patterns)
  'company.com', 'corp.com', 'inc.com', 'ltd.com', 'co.th', 'ac.th',
  'or.th', 'go.th', 'in.th', 'mi.th', 'net.th'
];

// ✅ ตรวจสอบว่าเป็น disposable domain หรือไม่
export function isDisposableDomain(domain) {
  const lowerDomain = domain.toLowerCase();
  
  // ตรวจสอบ exact match
  if (DISPOSABLE_DOMAINS.includes(lowerDomain)) {
    return true;
  }
  
  // ตรวจสอบ subdomain ของ disposable services
  return DISPOSABLE_DOMAINS.some(disposableDomain => 
    lowerDomain.endsWith('.' + disposableDomain)
  );
}

// ✅ ตรวจสอบรูปแบบที่น่าสงสัย
export function isSuspiciousPattern(email) {
  return SUSPICIOUS_PATTERNS.some(pattern => pattern.test(email));
}

// ✅ ตรวจสอบว่าเป็น domain ที่น่าเชื่อถือ
export function isTrustedDomain(domain) {
  const lowerDomain = domain.toLowerCase();
  
  // ตรวจสอบ exact match
  if (TRUSTED_DOMAINS.includes(lowerDomain)) {
    return true;
  }
  
  // ตรวจสอบ corporate patterns
  const corporatePatterns = [
    /\.co\.th$/,     // บริษัทไทย
    /\.ac\.th$/,     // สถาบันการศึกษาไทย
    /\.or\.th$/,     // องค์กรไทย
    /\.go\.th$/,     // หน่วยงานรัฐไทย
    /\.edu$/,        // สถาบันการศึกษา
    /\.gov$/,        // หน่วยงานรัฐ
    /\.org$/,        // องค์กร
    /\.mil$/,        // ทหาร
  ];
  
  return corporatePatterns.some(pattern => pattern.test(lowerDomain));
}

// ✅ ตรวจสอบ MX record (ว่า domain สามารถรับอีเมลได้จริง)
export async function hasMxRecord(domain) {
  try {
    const mxRecords = await resolveMx(domain);
    return mxRecords && mxRecords.length > 0;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`❌ MX lookup failed for ${domain}:`, error.message);
    }
    return false;
  }
}

// ✅ คำนวณคะแนนความน่าเชื่อถือของอีเมล (0-100)
export function calculateEmailScore(email) {
  const domain = email.split('@')[1]?.toLowerCase() || '';
  let score = 50; // เริ่มต้นที่ 50
  const notes = [];
  
  // ✅ ตรวจสอบรูปแบบพื้นฐาน
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    score -= 50;
    notes.push('รูปแบบอีเมลไม่ถูกต้อง');
    return { score: Math.max(0, score), notes };
  }
  
  // ✅ ตรวจสอบ disposable domain
  if (isDisposableDomain(domain)) {
    score -= 40;
    notes.push('ใช้ disposable email service');
  }
  
  // ✅ ตรวจสอบรูปแบบน่าสงสัย
  if (isSuspiciousPattern(email)) {
    score -= 25;
    notes.push('รูปแบบอีเมลน่าสงสัย');
  }
  
  // ✅ ตรวจสอบ trusted domain
  if (isTrustedDomain(domain)) {
    score += 20;
    notes.push('ใช้ domain ที่น่าเชื่อถือ');
  }
  
  // ✅ ตรวจสอบความยาวของชื่อ
  const localPart = email.split('@')[0];
  if (localPart.length < 3) {
    score -= 15;
    notes.push('ชื่อผู้ใช้สั้นเกินไป');
  } else if (localPart.length > 20) {
    score -= 10;
    notes.push('ชื่อผู้ใช้ยาวผิดปกติ');
  } else if (localPart.length >= 5 && localPart.length <= 15) {
    score += 10;
    notes.push('ความยาวชื่อผู้ใช้เหมาะสม');
  }
  
  // ✅ ตรวจสอบการใช้ตัวเลขมากเกินไป
  const numberCount = (localPart.match(/\d/g) || []).length;
  const letterCount = (localPart.match(/[a-zA-Z]/g) || []).length;
  
  if (numberCount > letterCount) {
    score -= 15;
    notes.push('ใช้ตัวเลขมากเกินไป');
  }
  
  // ✅ ตรวจสอบการใช้อักขระพิเศษ
  const specialChars = localPart.match(/[^a-zA-Z0-9._-]/g);
  if (specialChars && specialChars.length > 0) {
    score -= 10;
    notes.push('ใช้อักขระพิเศษที่ไม่ปกติ');
  }
  
  // ✅ ตรวจสอบรูปแบบที่ดี
  const goodPatterns = [
    /^[a-zA-Z]+\.[a-zA-Z]+@/,     // firstname.lastname@
    /^[a-zA-Z]+[a-zA-Z0-9]*@/,    // name123@ (เริ่มด้วยตัวอักษร)
  ];
  
  if (goodPatterns.some(pattern => pattern.test(email))) {
    score += 15;
    notes.push('รูปแบบอีเมลดี');
  }
  
  return { 
    score: Math.max(0, Math.min(100, score)), 
    notes 
  };
}

// ✅ ฟังก์ชันหลักสำหรับตรวจสอบอีเมล
export async function validateEmail(email) {
  const domain = email.split('@')[1]?.toLowerCase() || '';
  
  // ตรวจสอบพื้นฐาน
  const isDisposable = isDisposableDomain(domain);
  const isSuspicious = isSuspiciousPattern(email);
  const isTrusted = isTrustedDomain(domain);
  
  // คำนวณคะแนน
  const { score, notes } = calculateEmailScore(email);
  
  // ตรวจสอบ MX record (optional - อาจช้า)
  let hasMx = null;
  try {
    hasMx = await hasMxRecord(domain);
    if (!hasMx) {
      notes.push('Domain ไม่สามารถรับอีเมลได้');
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.log('MX check failed:', error.message);
    }
  }
  
  // กำหนดสถานะ
  let status = 'valid';
  let requiresReview = false;
  
  if (isDisposable) {
    status = 'disposable';
  } else if (score < 30) {
    status = 'suspicious';
    requiresReview = true;
  } else if (score < 50) {
    status = 'questionable';
    requiresReview = true;
  } else if (isTrusted && score >= 70) {
    status = 'trusted';
  }
  
  return {
    email,
    domain,
    isDisposable,
    isSuspicious,
    isTrusted,
    hasMxRecord: hasMx,
    score,
    notes,
    status,
    requiresReview,
    validatedAt: new Date(),
  };
}

// ✅ ตรวจสอบอีเมลแบบ batch
export async function validateEmailBatch(emails) {
  const results = [];
  
  for (const email of emails) {
    try {
      const result = await validateEmail(email);
      results.push(result);
    } catch (error) {
      results.push({
        email,
        error: error.message,
        status: 'error',
        score: 0,
        validatedAt: new Date(),
      });
    }
  }
  
  return results;
}

export default {
  validateEmail,
  validateEmailBatch,
  isDisposableDomain,
  isSuspiciousPattern,
  isTrustedDomain,
  calculateEmailScore,
  hasMxRecord,
};
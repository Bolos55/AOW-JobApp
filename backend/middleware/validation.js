// backend/middleware/validation.js
import { body, param, query, validationResult } from 'express-validator';
import mongoose from 'mongoose';

// ✅ Handle validation errors
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'ข้อมูลไม่ถูกต้อง',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

// ✅ Common validation rules
export const validateEmail = body('email')
  .isEmail()
  .normalizeEmail()
  .withMessage('รูปแบบอีเมลไม่ถูกต้อง');

export const validatePassword = body('password')
  .isLength({ min: 8 })
  .withMessage('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')
  .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
  .withMessage('รหัสผ่านต้องมีตัวพิมพ์ใหญ่ เล็ก ตัวเลข และอักขระพิเศษ');

export const validateName = body('name')
  .trim()
  .isLength({ min: 2, max: 100 })
  .withMessage('ชื่อต้องมี 2-100 ตัวอักษร')
  .matches(/^[a-zA-Zก-๙\s]+$/)
  .withMessage('ชื่อสามารถมีได้เฉพาะตัวอักษรและช่องว่าง');

export const validateRole = body('role')
  .isIn(['jobseeker', 'employer'])
  .withMessage('ประเภทผู้ใช้ต้องเป็น jobseeker หรือ employer');

// ✅ MongoDB ObjectId validation
export const validateObjectId = (field) => {
  return body(field)
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('รูปแบบ ID ไม่ถูกต้อง');
      }
      return true;
    });
};

export const validateParamObjectId = (param) => {
  return param(param)
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('รูปแบบ ID ไม่ถูกต้อง');
      }
      return true;
    });
};

// ✅ Job validation
export const validateJobData = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('หัวข้องานต้องมี 5-200 ตัวอักษร'),
  
  body('description')
    .trim()
    .isLength({ min: 20, max: 5000 })
    .withMessage('รายละเอียดงานต้องมี 20-5000 ตัวอักษร'),
  
  body('salary')
    .isNumeric()
    .isFloat({ min: 0, max: 1000000 })
    .withMessage('เงินเดือนต้องเป็นตัวเลข 0-1,000,000'),
  
  body('location')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('สถานที่ทำงานต้องมี 2-200 ตัวอักษร'),
  
  body('jobType')
    .isIn(['full-time', 'part-time', 'contract', 'freelance'])
    .withMessage('ประเภทงานไม่ถูกต้อง'),
  
  body('category')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('หมวดหมู่งานต้องมี 2-100 ตัวอักษร')
];

// ✅ Application validation
export const validateApplicationData = [
  validateObjectId('jobId'),
  
  body('coverLetter')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('จดหมายสมัครงานต้องไม่เกิน 2000 ตัวอักษร'),
  
  body('expectedSalary')
    .optional()
    .isNumeric()
    .isFloat({ min: 0, max: 1000000 })
    .withMessage('เงินเดือนที่คาดหวังต้องเป็นตัวเลข 0-1,000,000')
];

// ✅ Payment validation
export const validatePaymentData = [
  validateObjectId('jobId'),
  
  body('packageType')
    .isIn(['basic', 'standard', 'premium'])
    .withMessage('ประเภทแพ็กเกจไม่ถูกต้อง'),
  
  body('paymentMethod')
    .isIn(['promptpay', 'bank_transfer', 'credit_card'])
    .withMessage('วิธีการชำระเงินไม่ถูกต้อง'),
  
  body('boostFeatures')
    .optional()
    .isArray()
    .withMessage('ฟีเจอร์เสริมต้องเป็น array'),
  
  body('boostFeatures.*')
    .optional()
    .isIn(['urgent', 'featured', 'highlight'])
    .withMessage('ฟีเจอร์เสริมไม่ถูกต้อง')
];

// ✅ Profile validation
export const validateEmployerProfile = [
  body('companyName')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('ชื่อบริษัทต้องมี 2-200 ตัวอักษร'),
  
  body('industry')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('อุตสาหกรรมต้องมี 2-100 ตัวอักษร'),
  
  body('companySize')
    .optional()
    .isIn(['1-10', '11-50', '51-200', '201-500', '500+'])
    .withMessage('ขนาดบริษัทไม่ถูกต้อง'),
  
  body('website')
    .optional()
    .isURL()
    .withMessage('รูปแบบเว็บไซต์ไม่ถูกต้อง'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('รายละเอียดบริษัทต้องไม่เกิน 2000 ตัวอักษร')
];

export const validateJobSeekerProfile = [
  body('firstName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('ชื่อต้องมี 1-50 ตัวอักษร'),
  
  body('lastName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('นามสกุลต้องมี 1-50 ตัวอักษร'),
  
  body('phone')
    .optional()
    .matches(/^(\+66|0)[0-9]{8,9}$/)
    .withMessage('รูปแบบเบอร์โทรไม่ถูกต้อง'),
  
  body('skills')
    .optional()
    .isArray()
    .withMessage('ทักษะต้องเป็น array'),
  
  body('skills.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('ทักษะแต่ละรายการต้องมี 1-50 ตัวอักษร'),
  
  body('experience')
    .optional()
    .isNumeric()
    .isInt({ min: 0, max: 50 })
    .withMessage('ประสบการณ์ต้องเป็นตัวเลข 0-50 ปี'),
  
  body('education')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('การศึกษาต้องไม่เกิน 500 ตัวอักษร')
];

// ✅ Token validation
export const validateToken = body('token')
  .isLength({ min: 32, max: 128 })
  .matches(/^[a-f0-9]+$/)
  .withMessage('รูปแบบโทเคนไม่ถูกต้อง');

// ✅ Pagination validation
export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('หน้าต้องเป็นตัวเลข 1-1000'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('จำนวนรายการต้องเป็นตัวเลข 1-100')
];

// ✅ Search validation
export const validateSearch = [
  query('q')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('คำค้นหาต้องมี 1-200 ตัวอักษร'),
  
  query('location')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('สถานที่ต้องมี 1-100 ตัวอักษร'),
  
  query('category')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('หมวดหมู่ต้องมี 1-100 ตัวอักษร'),
  
  query('salary_min')
    .optional()
    .isNumeric()
    .isFloat({ min: 0 })
    .withMessage('เงินเดือนต่ำสุดต้องเป็นตัวเลขที่มากกว่า 0'),
  
  query('salary_max')
    .optional()
    .isNumeric()
    .isFloat({ min: 0 })
    .withMessage('เงินเดือนสูงสุดต้องเป็นตัวเลขที่มากกว่า 0')
];

// ✅ File upload validation
export const validateFileUpload = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ message: 'ไม่พบไฟล์ที่อัปโหลด' });
  }
  
  const allowedTypes = [
    'image/jpeg',
    'image/png', 
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  
  if (!allowedTypes.includes(req.file.mimetype)) {
    return res.status(400).json({ 
      message: 'ประเภทไฟล์ไม่ได้รับอนุญาต',
      allowedTypes: allowedTypes
    });
  }
  
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (req.file.size > maxSize) {
    return res.status(400).json({ 
      message: `ไฟล์ใหญ่เกินไป (สูงสุด ${maxSize / 1024 / 1024}MB)`,
      fileSize: req.file.size,
      maxSize: maxSize
    });
  }
  
  next();
};

// ✅ Rate limiting validation
export const validateRateLimit = (windowMs, maxRequests) => {
  const requests = new Map();
  
  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Clean old requests
    if (requests.has(key)) {
      requests.set(key, requests.get(key).filter(time => time > windowStart));
    } else {
      requests.set(key, []);
    }
    
    const currentRequests = requests.get(key);
    
    if (currentRequests.length >= maxRequests) {
      return res.status(429).json({
        message: 'คำขอมากเกินไป กรุณาลองใหม่อีกครั้งในภายหลัง',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
    
    currentRequests.push(now);
    next();
  };
};
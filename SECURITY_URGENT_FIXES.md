# 🚨 URGENT Security Fixes Required

## 1. ROTATE ALL CREDENTIALS IMMEDIATELY

### MongoDB
- Current: `mongodb+srv://bosszazababa_db_user:Bossmaha_55@...`
- Action: Change password in MongoDB Atlas
- Update: All .env files

### JWT Secrets
- Current: `08fc15efe29095cc87e69c35ea8dcbfe`
- Action: Generate new 64+ character secret
- Command: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

### GitHub OAuth
- Current: `7e6f447a3eac14cfebf1f20046263b5ec714074c`
- Action: Regenerate secret in GitHub Developer Settings

### Email Password
- Current: `ogevucukvltzxrjp`
- Action: Generate new app password in Gmail

## 2. REMOVE FROM GIT HISTORY
```bash
# Remove sensitive files from git history
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch .env backend/.env' \
  --prune-empty --tag-name-filter cat -- --all

# Force push (WARNING: This rewrites history)
git push origin --force --all
```

## 3. FIX FIREBASE AUTH
```javascript
// backend/routes/authRoutes.js
import admin from 'firebase-admin';

router.post("/firebase-google", async (req, res) => {
  try {
    const { idToken } = req.body;
    
    // ✅ Verify Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { email, name, uid } = decodedToken;
    
    // Continue with user creation/login
  } catch (error) {
    return res.status(401).json({ message: "Invalid Firebase token" });
  }
});
```

## 4. FIX JWT FALLBACK
```javascript
// backend/middleware/auth.js
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

const decoded = jwt.verify(token, JWT_SECRET); // ✅ No fallback
```

## 5. SECURE FILE UPLOADS
```javascript
// backend/routes/profileRoutes.js
import crypto from 'crypto';

const uploadResume = multer({
  storage: multer.diskStorage({
    destination: 'uploads/secure/',
    filename: (req, file, cb) => {
      // ✅ Random filename
      const randomName = crypto.randomBytes(16).toString('hex');
      const ext = path.extname(file.originalname);
      cb(null, `${randomName}${ext}`);
    }
  }),
  fileFilter: (req, file, cb) => {
    // ✅ Whitelist extensions
    const allowedExts = ['.pdf', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
});
```

## 6. STRICT CORS
```javascript
// backend/middleware/security.js
export const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://aow-jobapp-frontend.onrender.com',
      ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000'] : [])
    ];
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};
```

## 7. REMOVE CONSOLE LOGS IN PRODUCTION
```javascript
// Create logger utility
const logger = {
  info: (msg, data) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(msg, data);
    }
  },
  error: (msg, error) => {
    console.error(msg, error); // Always log errors
  }
};
```

## PRIORITY ORDER
1. 🔴 Rotate credentials (IMMEDIATE)
2. 🔴 Fix Firebase auth (IMMEDIATE)
3. 🟡 Fix JWT fallback (HIGH)
4. 🟡 Secure file uploads (HIGH)
5. 🟡 Fix CORS (MEDIUM)
6. 🟡 Remove debug logs (MEDIUM)
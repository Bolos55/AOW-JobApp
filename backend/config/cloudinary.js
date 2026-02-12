// backend/config/cloudinary.js
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

// ✅ Check Cloudinary ENV (don't throw error, just warn)
const cloudinaryValid = process.env.CLOUDINARY_CLOUD_NAME && 
                        process.env.CLOUDINARY_API_KEY && 
                        process.env.CLOUDINARY_API_SECRET;

if (!cloudinaryValid) {
  console.warn("⚠️ WARNING: Cloudinary environment variables missing");
  console.warn("⚠️ Photo upload will not work properly");
  console.warn("⚠️ Missing:", {
    cloud_name: !process.env.CLOUDINARY_CLOUD_NAME,
    api_key: !process.env.CLOUDINARY_API_KEY,
    api_secret: !process.env.CLOUDINARY_API_SECRET
  });
}

// Configure Cloudinary (only if valid)
if (cloudinaryValid) {
  const cloudinaryConfig = {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  };

  cloudinary.config(cloudinaryConfig);
  console.log("✅ Cloudinary configured successfully");
  console.log("🔧 Cloud Name:", cloudinaryConfig.cloud_name);
}

// ✅ Create storage (with fallback for missing ENV)
const photoStorage = cloudinaryValid 
  ? new CloudinaryStorage({
      cloudinary: cloudinary,
      params: {
        folder: 'aow-jobapp/photos',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        // ไม่มี transformation และไม่มี format function - ให้ Cloudinary จัดการเอง
      },
    })
  : null; // Will cause multer to fail gracefully

const resumeStorage = cloudinaryValid
  ? new CloudinaryStorage({
      cloudinary: cloudinary,
      params: {
        folder: 'aow-jobapp/resumes',
        allowed_formats: ['pdf', 'doc', 'docx'],
        resource_type: 'raw',
      },
    })
  : null; // Will cause multer to fail gracefully

// ✅ Multer upload instances with graceful failure
export const uploadPhoto = photoStorage ? multer({
  storage: photoStorage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB
    files: 1
  },
  fileFilter: (req, file, cb) => {
    // ✅ Strict file type validation
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPG, PNG, GIF allowed.'), false);
    }
  }
}) : multer(); // Empty multer that will fail

// ✅ Multer for multiple photos (workplace photos) - ใช้ memory storage
export const uploadMultiplePhotos = multer({
  storage: multer.memoryStorage(), // เก็บในหน่วยความจำก่อน
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 3 // Allow up to 3 files
  },
  fileFilter: (req, file, cb) => {
    // ✅ More lenient file type validation
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    
    const hasValidMimetype = allowedTypes.includes(file.mimetype);
    const hasValidExtension = allowedExtensions.some(ext => 
      file.originalname.toLowerCase().endsWith(ext)
    );
    
    if (hasValidMimetype || hasValidExtension) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Only JPG, PNG, GIF, WEBP allowed.`), false);
    }
  }
});

export const uploadResume = resumeStorage ? multer({
  storage: resumeStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1
  },
  fileFilter: (req, file, cb) => {
    // ✅ Strict file type validation
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX allowed.'), false);
    }
  }
}) : multer(); // Empty multer that will fail

export { cloudinary };

// ✅ Export validation status
export const isCloudinaryConfigured = cloudinaryValid;
// backend/config/cloudinary.js
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Configure Cloudinary
const cloudinaryConfig = {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
};

// ✅ Check if Cloudinary is configured
const isCloudinaryConfigured = cloudinaryConfig.cloud_name && 
                               cloudinaryConfig.api_key && 
                               cloudinaryConfig.api_secret;

if (isCloudinaryConfigured) {
  cloudinary.config(cloudinaryConfig);
  console.log("🔧 Cloudinary Config: ✅ Configured");
} else {
  console.log("🔧 Cloudinary Config: ❌ Missing - Using local storage");
}

// Storage for photos
const photoStorage = isCloudinaryConfigured 
  ? new CloudinaryStorage({
      cloudinary: cloudinary,
      params: {
        folder: 'aow-jobapp/photos',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
        transformation: [
          { width: 500, height: 500, crop: 'limit' },
          { quality: 'auto' }
        ],
      },
    })
  : multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = "uploads/photos";
        if (!fs.existsSync(uploadPath)) {
          fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const randomName = crypto.randomBytes(16).toString('hex');
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${randomName}${ext}`);
      },
    });

// Storage for resumes  
const resumeStorage = isCloudinaryConfigured
  ? new CloudinaryStorage({
      cloudinary: cloudinary,
      params: {
        folder: 'aow-jobapp/resumes',
        allowed_formats: ['pdf', 'doc', 'docx'],
        resource_type: 'raw',
      },
    })
  : multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = "uploads/resumes";
        if (!fs.existsSync(uploadPath)) {
          fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const randomName = crypto.randomBytes(16).toString('hex');
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${randomName}${ext}`);
      },
    });

// Multer upload instances
export const uploadPhoto = multer({
  storage: photoStorage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB
    files: 1
  },
});

export const uploadResume = multer({
  storage: resumeStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1
  },
});

export { cloudinary, isCloudinaryConfigured };
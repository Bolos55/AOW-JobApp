// src/utils/imageUtils.js
// ✅ Simple image URL resolver - no more /uploads/ confusion
export const resolveImageUrl = (url) => {
  if (!url) return "";
  // ✅ If it's already a full URL (Cloudinary), return as-is
  if (url.startsWith("http")) return url;
  // ✅ For any other case, return empty (force re-upload)
  return "";
};

// ✅ Clean utility for all photo URLs
export const getPhotoUrl = (profile, fallback = "") => {
  return resolveImageUrl(profile?.photoUrl) || fallback;
};

// ✅ Clean utility for all resume URLs  
export const getResumeUrl = (profile) => {
  return resolveImageUrl(profile?.resumeUrl);
};
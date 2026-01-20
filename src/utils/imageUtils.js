// src/utils/imageUtils.js
// ✅ Simple image URL resolver - support full URLs only
export const resolveImageUrl = (url) => {
  if (!url) return "";
  // ✅ Only accept full URLs (Cloudinary or full backend URLs)
  if (url.startsWith("http")) return url;
  // ✅ Reject legacy paths - force re-upload
  console.warn("Legacy photo path detected, please re-upload:", url);
  return "";
};

// ✅ Clean utility for all photo URLs
export const getPhotoUrl = (profile, fieldName = "photoUrl") => {
  const url = profile?.[fieldName] || profile?.photoUrl;
  return resolveImageUrl(url);
};

// ✅ Clean utility for all resume URLs  
export const getResumeUrl = (profile) => {
  return resolveImageUrl(profile?.resumeUrl);
};
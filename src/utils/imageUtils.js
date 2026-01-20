// src/utils/imageUtils.js
// ✅ Simple image URL resolver - support full URLs only
export const resolveImageUrl = (url) => {
  if (!url) return "";
  // ✅ Only accept full URLs (Cloudinary or full backend URLs)
  if (url.startsWith("http")) return url;
  // ✅ Legacy paths - show placeholder instead of broken image
  console.warn("Legacy photo path detected:", url);
  return ""; // Return empty to hide broken images
};

// ✅ Clean utility for all photo URLs
export const getPhotoUrl = (profile, fieldName = "photoUrl") => {
  const url = profile?.[fieldName] || profile?.photoUrl;
  const resolvedUrl = resolveImageUrl(url);
  
  // ✅ If no valid URL, return empty (will show default avatar)
  if (!resolvedUrl && url) {
    console.log("🔄 Legacy photo detected, please re-upload:", url);
  }
  
  return resolvedUrl;
};

// ✅ Clean utility for all resume URLs  
export const getResumeUrl = (profile) => {
  return resolveImageUrl(profile?.resumeUrl);
};
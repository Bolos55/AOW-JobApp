// src/utils/imageUtils.js
import { API_BASE } from "../api";

// ✅ Simple image URL resolver - support both Cloudinary and local URLs
export const resolveImageUrl = (url) => {
  if (!url) return "";
  
  // ✅ Full URLs (Cloudinary or external) - use as-is
  if (url.startsWith("http")) return url;
  
  // ✅ Local paths - convert to full backend URL
  if (url.startsWith("uploads/") || url.startsWith("/uploads/")) {
    const cleanPath = url.startsWith("/") ? url.substring(1) : url;
    const backendBase = API_BASE.replace(/\/api\/?$/, "");
    return `${backendBase}/${cleanPath}`;
  }
  
  // ✅ Legacy paths without uploads prefix
  if (url.includes("/") && !url.startsWith("http")) {
    const backendBase = API_BASE.replace(/\/api\/?$/, "");
    return `${backendBase}/uploads/${url}`;
  }
  
  console.warn("Unknown photo path format:", url);
  return ""; // Return empty to show default avatar
};

// ✅ Clean utility for all photo URLs
export const getPhotoUrl = (profile, fieldName = "photoUrl") => {
  const url = profile?.[fieldName] || profile?.photoUrl;
  const resolvedUrl = resolveImageUrl(url);
  
  if (!resolvedUrl && url) {
    console.log("🔄 Could not resolve photo URL:", url);
  }
  
  return resolvedUrl;
};

// ✅ Clean utility for all resume URLs  
export const getResumeUrl = (profile) => {
  return resolveImageUrl(profile?.resumeUrl);
};
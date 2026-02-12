// src/utils/imageUtils.js
import { API_BASE } from "../api";

// ✅ Enhanced image URL resolver with comprehensive error handling
export const resolveImageUrl = (url) => {
  if (!url || typeof url !== 'string') return "";
  
  // ✅ Full URLs (Cloudinary or external) - use as-is
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  
  // ✅ Cloudinary public_id format (e.g., "aow-jobapp/photos/abc123")
  if (url.includes("aow-jobapp/")) {
    return `https://res.cloudinary.com/dorfwjgzl/image/upload/${url}`;
  }
  
  // ✅ Local paths - convert to full backend URL
  if (url.startsWith("uploads/") || url.startsWith("/uploads/")) {
    const cleanPath = url.startsWith("/") ? url.substring(1) : url;
    const backendBase = API_BASE.replace(/\/api\/?$/, "");
    return `${backendBase}/${cleanPath}`;
  }
  
  // ✅ Legacy paths without uploads prefix
  if (url.includes("/") && !url.startsWith("http") && !url.includes("aow-jobapp")) {
    const backendBase = API_BASE.replace(/\/api\/?$/, "");
    return `${backendBase}/uploads/${url}`;
  }
  
  // ✅ Handle relative paths or filenames
  if (!url.includes("/") && url.length > 0) {
    const backendBase = API_BASE.replace(/\/api\/?$/, "");
    return `${backendBase}/uploads/photos/${url}`;
  }
  
  console.warn("Unknown photo path format:", url);
  return ""; // Return empty to show default avatar
};

// ✅ Enhanced utility for all photo URLs with error handling
export const getPhotoUrl = (profile, fieldName = "photoUrl") => {
  try {
    const url = profile?.[fieldName] || profile?.photoUrl;
    const resolvedUrl = resolveImageUrl(url);
    
    if (!resolvedUrl && url) {
      console.log("🔄 Could not resolve photo URL:", url);
    }
    
    return resolvedUrl;
  } catch (error) {
    console.error("Error resolving photo URL:", error);
    return "";
  }
};

// ✅ Enhanced utility for all resume URLs with error handling
export const getResumeUrl = (profile) => {
  try {
    return resolveImageUrl(profile?.resumeUrl);
  } catch (error) {
    console.error("Error resolving resume URL:", error);
    return "";
  }
};
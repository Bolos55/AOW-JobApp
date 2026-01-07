// src/utils/tokenUtils.js

// ล้าง token และข้อมูลที่เกี่ยวข้องทั้งหมด
export const clearAllTokens = () => {
  try {
    // ล้าง localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('chat:lastOpen');
    localStorage.removeItem('chat:lastThread');
    
    // ล้าง sessionStorage
    sessionStorage.clear();
    
    // ล้าง cookies
    document.cookie.split(";").forEach((c) => {
      const eqPos = c.indexOf("=");
      const name = eqPos > -1 ? c.substr(0, eqPos) : c;
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    });
    
    // Dispatch event เพื่อให้ components อื่นรู้
    window.dispatchEvent(new Event("auth-change"));
    
    console.log('✅ All tokens and auth data cleared');
    return true;
  } catch (error) {
    console.error('❌ Error clearing tokens:', error);
    return false;
  }
};

// ตรวจสอบว่า token หมดอายุหรือไม่
export const isTokenExpired = (token) => {
  if (!token) return true;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    return payload.exp < currentTime;
  } catch (error) {
    return true; // ถ้า decode ไม่ได้ถือว่าหมดอายุ
  }
};

// ตรวจสอบและล้าง token ที่หมดอายุ
export const checkAndClearExpiredToken = () => {
  const token = localStorage.getItem('token');
  if (token && isTokenExpired(token)) {
    clearAllTokens();
    return true; // token หมดอายุและถูกล้างแล้ว
  }
  return false; // token ยังใช้ได้
};

// Force logout และ redirect
export const forceLogout = (message = 'กรุณาเข้าสู่ระบบใหม่') => {
  clearAllTokens();
  alert(message);
  window.location.href = '/login';
};
// src/hooks/useOnlineStatus.js
import { useEffect, useRef } from "react";
import { API_BASE, authHeader } from "../api";

// Generate session ID
function generateSessionId() {
  return 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}

export function useOnlineStatus(user = null) {
  const intervalRef = useRef(null);
  const sessionIdRef = useRef(null);
  const isActiveRef = useRef(true);
  const isMountedRef = useRef(true);

  useEffect(() => {
    // ถ้าไม่มี user ให้หยุดการทำงาน
    if (!user) {
      return;
    }

    // สร้าง session ID
    if (!sessionIdRef.current) {
      sessionIdRef.current = generateSessionId();
    }

    // ฟังก์ชันส่ง heartbeat
    const sendHeartbeat = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token || !isActiveRef.current || !isMountedRef.current || !user) return;

        const currentPage = window.location.pathname;
        
        const response = await fetch(`${API_BASE}/api/online/heartbeat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeader()
          },
          body: JSON.stringify({
            sessionId: sessionIdRef.current,
            currentPage: currentPage
          })
        });

        if (response.ok && isMountedRef.current) {
          // console.log('📡 Heartbeat sent:', currentPage); // ลด console logs
        }
      } catch (err) {
        if (isMountedRef.current) {
          console.error('❌ Heartbeat error:', err);
        }
      }
    };

    // ส่ง heartbeat ทันทีเมื่อเริ่ม
    sendHeartbeat();

    // ตั้ง interval ส่งทุก 60 วินาที (ลดจาก 30 วินาที)
    intervalRef.current = setInterval(() => {
      if (isMountedRef.current && user) {
        sendHeartbeat();
      }
    }, 60000); // เปลี่ยนจาก 30000 เป็น 60000

    // ฟังก์ชันตั้งสถานะออฟไลน์
    const setOfflineInternal = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token || !user) return;

        await fetch(`${API_BASE}/api/online/offline`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeader()
          }
        });

        console.log('📴 Set offline');
      } catch (err) {
        console.error('❌ Set offline error:', err);
      }
    };

    // Event listeners
    const handleVisibilityChange = () => {
      if (!isMountedRef.current || !user) return;
      
      if (document.hidden) {
        isActiveRef.current = false;
        console.log('👁️ Page hidden - pausing heartbeat');
      } else {
        isActiveRef.current = true;
        sendHeartbeat(); // ส่งทันทีเมื่อกลับมา
        console.log('👁️ Page visible - resuming heartbeat');
      }
    };

    const handleBeforeUnload = () => {
      isActiveRef.current = false;
      isMountedRef.current = false;
      
      // ใช้ sendBeacon เพื่อส่งข้อมูลก่อนปิดหน้า
      if (navigator.sendBeacon && user) {
        const token = localStorage.getItem('token');
        if (token) {
          try {
            const data = JSON.stringify({ offline: true });
            navigator.sendBeacon(`${API_BASE}/api/online/offline`, data);
          } catch (err) {
            console.error('Beacon error:', err);
          }
        }
      }
    };

    const handleFocus = () => {
      if (!isMountedRef.current || !user) return;
      isActiveRef.current = true;
      sendHeartbeat();
    };

    const handleBlur = () => {
      if (!isMountedRef.current || !user) return;
      isActiveRef.current = false;
    };

    // เพิ่ม event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    // Cleanup
    return () => {
      isMountedRef.current = false;
      isActiveRef.current = false;
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);

      // ส่งสถานะออฟไลน์
      if (user) {
        setOfflineInternal();
      }
    };
  }, [user]); // dependency array มี user

  // ฟังก์ชันสำหรับ manual offline (เช่น logout)
  const setOffline = async () => {
    try {
      isMountedRef.current = false;
      isActiveRef.current = false;
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      const token = localStorage.getItem('token');
      if (!token || !user) return;

      await fetch(`${API_BASE}/api/online/offline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader()
        }
      });

      console.log('📴 Manual set offline');
    } catch (err) {
      console.error('❌ Manual set offline error:', err);
    }
  };

  return {
    sessionId: sessionIdRef.current,
    setOffline: user ? setOffline : null // ส่งคืน null ถ้าไม่มี user
  };
}
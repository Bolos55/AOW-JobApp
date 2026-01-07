// src/components/CookieConsent.jsx
import { useState, useEffect } from "react";
import { X, Cookie, Shield, Settings } from "lucide-react";

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState({
    necessary: true, // จำเป็น ไม่สามารถปิดได้
    functional: true,
    analytics: false,
    marketing: false
  });

  useEffect(() => {
    // ตรวจสอบว่าผู้ใช้เคยให้ consent แล้วหรือยัง
    const consent = localStorage.getItem('aow-cookie-consent');
    if (!consent) {
      setShowBanner(true);
    } else {
      const savedPreferences = JSON.parse(consent);
      setPreferences(savedPreferences);
    }
  }, []);

  const handleAcceptAll = () => {
    const allAccepted = {
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true,
      timestamp: new Date().toISOString()
    };
    
    localStorage.setItem('aow-cookie-consent', JSON.stringify(allAccepted));
    setPreferences(allAccepted);
    setShowBanner(false);
    
    // เรียกใช้ analytics/marketing scripts
    initializeOptionalServices(allAccepted);
  };

  const handleAcceptSelected = () => {
    const selectedPreferences = {
      ...preferences,
      timestamp: new Date().toISOString()
    };
    
    localStorage.setItem('aow-cookie-consent', JSON.stringify(selectedPreferences));
    setShowBanner(false);
    setShowSettings(false);
    
    // เรียกใช้เฉพาะ services ที่ยินยอม
    initializeOptionalServices(selectedPreferences);
  };

  const handleRejectAll = () => {
    const minimal = {
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false,
      timestamp: new Date().toISOString()
    };
    
    localStorage.setItem('aow-cookie-consent', JSON.stringify(minimal));
    setPreferences(minimal);
    setShowBanner(false);
    
    // เรียกใช้เฉพาะ necessary cookies
    initializeOptionalServices(minimal);
  };

  const initializeOptionalServices = (prefs) => {
    // Google Analytics
    if (prefs.analytics && window.gtag) {
      window.gtag('consent', 'update', {
        'analytics_storage': 'granted'
      });
    }

    // Marketing/Advertising
    if (prefs.marketing && window.gtag) {
      window.gtag('consent', 'update', {
        'ad_storage': 'granted'
      });
    }

    // Facebook Pixel
    if (prefs.marketing && window.fbq) {
      window.fbq('consent', 'grant');
    }
  };

  const handlePreferenceChange = (type) => {
    if (type === 'necessary') return; // ไม่สามารถปิดได้
    
    setPreferences(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  if (!showBanner) return null;

  return (
    <>
      {/* Cookie Banner */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-blue-500 shadow-2xl z-50 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-start gap-4">
            <Cookie className="w-8 h-8 text-blue-600 flex-shrink-0 mt-1" />
            
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                🍪 เราใช้คุกกี้เพื่อปรับปรุงประสบการณ์การใช้งาน
              </h3>
              
              <p className="text-sm text-gray-600 mb-4">
                AOW ใช้คุกกี้เพื่อให้บริการที่ดีที่สุด วิเคราะห์การใช้งาน และปรับแต่งเนื้อหาให้เหมาะกับคุณ 
                คุณสามารถเลือกประเภทคุกกี้ที่ยินยอมได้
              </p>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleAcceptAll}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  ยอมรับทั้งหมด
                </button>
                
                <button
                  onClick={() => setShowSettings(true)}
                  className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-200 transition-colors font-medium flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  ตั้งค่าคุกกี้
                </button>
                
                <button
                  onClick={handleRejectAll}
                  className="text-gray-600 px-6 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  ปฏิเสธทั้งหมด
                </button>
              </div>

              <div className="mt-3 text-xs text-gray-500">
                อ่านเพิ่มเติมใน{" "}
                <button
                  onClick={() => window.open("/privacy", "_blank")}
                  className="text-blue-600 hover:underline"
                >
                  นโยบายความเป็นส่วนตัว
                </button>{" "}
                และ{" "}
                <button
                  onClick={() => window.open("/terms", "_blank")}
                  className="text-blue-600 hover:underline"
                >
                  เงื่อนไขการใช้งาน
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cookie Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-3">
                <Shield className="w-6 h-6 text-blue-600" />
                <h2 className="text-xl font-bold">ตั้งค่าความเป็นส่วนตัว</h2>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              <p className="text-gray-600">
                เลือกประเภทคุกกี้ที่คุณยินยอมให้เราใช้ คุณสามารถเปลี่ยนแปลงการตั้งค่าได้ตลอดเวลา
              </p>

              {/* Cookie Categories */}
              <div className="space-y-4">
                {/* Necessary Cookies */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">คุกกี้จำเป็น</h3>
                    <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                      จำเป็น
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    คุกกี้เหล่านี้จำเป็นสำหรับการทำงานของเว็บไซต์ ไม่สามารถปิดได้
                  </p>
                  <div className="text-xs text-gray-500">
                    • การเข้าสู่ระบบ • ความปลอดภัย • การจดจำการตั้งค่า
                  </div>
                </div>

                {/* Functional Cookies */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">คุกกี้การทำงาน</h3>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.functional}
                        onChange={() => handlePreferenceChange('functional')}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    ช่วยให้เว็บไซต์ทำงานได้ดีขึ้น เช่น จดจำภาษาที่เลือก หรือการตั้งค่าส่วนตัว
                  </p>
                  <div className="text-xs text-gray-500">
                    • การจดจำภาษา • การตั้งค่าส่วนตัว • การปรับแต่งหน้าจอ
                  </div>
                </div>

                {/* Analytics Cookies */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">คุกกี้วิเคราะห์</h3>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.analytics}
                        onChange={() => handlePreferenceChange('analytics')}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    ช่วยให้เราเข้าใจการใช้งานเว็บไซต์ เพื่อปรับปรุงบริการให้ดีขึ้น
                  </p>
                  <div className="text-xs text-gray-500">
                    • Google Analytics • การวิเคราะห์การใช้งาน • สถิติผู้เยี่ยมชม
                  </div>
                </div>

                {/* Marketing Cookies */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">คุกกี้การตลาด</h3>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.marketing}
                        onChange={() => handlePreferenceChange('marketing')}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    ใช้เพื่อแสดงโฆษณาที่เกี่ยวข้องกับคุณ และวัดประสิทธิภาพการโฆษณา
                  </p>
                  <div className="text-xs text-gray-500">
                    • Facebook Pixel • Google Ads • โฆษณาที่ปรับแต่ง
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={handleAcceptSelected}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  บันทึกการตั้งค่า
                </button>
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
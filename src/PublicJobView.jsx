// src/PublicJobView.jsx
import { useState, useEffect } from "react";
import { MapPin, DollarSign, Briefcase } from "lucide-react";
import { API_BASE } from "./api";

export default function PublicJobView() {
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadJob = async () => {
      const params = new URLSearchParams(window.location.search);
      const jobId = params.get('job');
      
      if (!jobId) {
        setError("ไม่พบรหัสงาน");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/api/jobs/${jobId}`);
        const data = await res.json();
        
        if (!res.ok) {
          setError(data.message || "ไม่พบงานนี้");
        } else {
          setJob(data);
        }
      } catch (err) {
        setError("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้");
      } finally {
        setLoading(false);
      }
    };

    loadJob();
  }, []);

  // อัปเดต meta tags สำหรับการแชร์
  useEffect(() => {
    if (job) {
      document.title = `${job.title} - ${job.company} | AOW`;
      
      const updateMetaTag = (property, content) => {
        let tag = document.querySelector(`meta[property="${property}"]`);
        if (!tag) {
          tag = document.createElement('meta');
          tag.setAttribute('property', property);
          document.head.appendChild(tag);
        }
        tag.setAttribute('content', content);
      };

      const url = window.location.href;
      const description = job.description?.substring(0, 200) || `${job.title} ที่ ${job.company}`;
      const image = job.workplacePhotos?.[0] || `${window.location.origin}/logo512.png`;

      updateMetaTag('og:title', `${job.title} - ${job.company}`);
      updateMetaTag('og:description', description);
      updateMetaTag('og:image', image);
      updateMetaTag('og:url', url);
      updateMetaTag('og:type', 'website');
      
      updateMetaTag('twitter:card', 'summary_large_image');
      updateMetaTag('twitter:title', `${job.title} - ${job.company}`);
      updateMetaTag('twitter:description', description);
      updateMetaTag('twitter:image', image);
    }
  }, [job]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลดข้อมูลงาน...</p>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">ไม่พบงานนี้</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition"
          >
            กลับหน้าหลัก
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold">AOW - All of Works</h1>
          <p className="text-sm text-blue-100 mt-1">งานเพื่อคุณ เพื่อทุกคน</p>
        </div>
      </div>

      {/* Job Details */}
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">{job.title}</h2>
            <p className="text-lg text-gray-600 mb-1">{job.company}</p>
            <p className="text-sm text-gray-500">รหัสงาน: {job.jobCode}</p>
            
            {job.isCompleted && (
              <div className="mt-2 inline-flex items-center text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-full">
                งานนี้ปิดรับแล้ว
              </div>
            )}
          </div>

          <div className="space-y-3 mb-6 text-sm">
            <p className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-500" />
              <span className="font-medium">เงินเดือน:</span> {job.salary}
            </p>
            <p className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-red-500" />
              <span className="font-medium">สถานที่:</span> {job.location}
            </p>
            <p className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-blue-500" />
              <span className="font-medium">ประเภท:</span> {job.type}
            </p>
          </div>

          <div className="mb-6">
            <h3 className="font-semibold text-gray-800 mb-2">รายละเอียดงาน</h3>
            <p className="text-gray-700 whitespace-pre-line">{job.description || "—"}</p>
          </div>

          {job.skills && job.skills.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-800 mb-2">ทักษะที่ต้องการ</h3>
              <div className="flex flex-wrap gap-2">
                {job.skills.map((s) => (
                  <span key={s} className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ภาพงานเบื้อต้น */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-800 mb-2">🏢 ภาพงานเบื้อต้น</h3>
            
            {job.workplacePhotos && job.workplacePhotos.length > 0 ? (
              <>
                <div className="grid grid-cols-3 gap-2">
                  {job.workplacePhotos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={photo}
                        alt={`ภาพงาน ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition"
                        onClick={() => window.open(photo, '_blank')}
                        onError={(e) => {
                          e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="%23f3f4f6"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="10">โหลดไม่ได้</text></svg>';
                        }}
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">คลิกเพื่อดูขนาดเต็ม</p>
              </>
            ) : (
              <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
                <p className="text-sm text-gray-500">ไม่มีภาพงานเบื้อต้น</p>
              </div>
            )}
          </div>

          {job.benefits && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-800 mb-2">สวัสดิการ</h3>
              <p className="text-gray-700 whitespace-pre-line">{job.benefits}</p>
            </div>
          )}

          <div className="mb-6">
            <h3 className="font-semibold text-gray-800 mb-2">ช่องทางติดต่อ</h3>
            <div className="text-sm text-gray-700 space-y-1">
              {job.contactEmail && <p>อีเมล: {job.contactEmail}</p>}
              {job.contactPhone && <p>โทร: {job.contactPhone}</p>}
              {job.contactWebsite && (
                <p>
                  เว็บไซต์:{" "}
                  <a href={job.contactWebsite} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {job.contactWebsite}
                  </a>
                </p>
              )}
            </div>
          </div>

          {/* Call to Action */}
          <div className="border-t pt-6">
            <div className="bg-blue-50 rounded-xl p-6 text-center">
              <p className="text-gray-700 mb-4">สนใจสมัครงานนี้?</p>
              <a
                href="/"
                className="inline-block px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition"
              >
                เข้าสู่ระบบเพื่อสมัครงาน
              </a>
              <p className="text-xs text-gray-500 mt-3">ยังไม่มีบัญชี? สมัครสมาชิกฟรี!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

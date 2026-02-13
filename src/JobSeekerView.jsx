// src/JobSeekerView.jsx
import { useState, useEffect, useMemo } from "react";
import {
  Search,
  MapPin,
  DollarSign,
  Briefcase,
  TrendingUp,
  User as UserIcon,
  X,
  MessageCircle,
  Filter,
  Clock,
} from "lucide-react";

import ChatWidget from "./components/ChatWidget";
import ApplyJobModal from "./components/ApplyJobModal";
import ReviewSection from "./components/ReviewSection";
import JobSeekerProfileModal from "./components/JobSeekerProfileModal";

import { API_BASE, authHeader } from "./api";

const BACKEND_BASE = API_BASE.replace(/\/api\/?$/, "");

export default function JobSeekerView({ user, onLogout }) {
  // ---------- ชื่อบนหัวเว็บ ----------
  const userName = useMemo(() => {
    if (!user) return "ผู้ใช้";
    const emailLocal =
      typeof user.email === "string" ? user.email.split("@")[0] : "";
    return (user.name && user.name.trim()) || emailLocal || "ผู้ใช้";
  }, [user]);

  // ---------- STATE งาน ----------
  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsError, setJobsError] = useState("");

  // ใช้สำหรับทั้ง banner + badge งานใหม่
  const now = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  const recentJobsCount = useMemo(() => {
    return jobs.filter((job) => {
      if (!job.createdAt) return false;
      const created = new Date(job.createdAt).getTime();
      return now - created <= sevenDaysMs;
    }).length;
  }, [jobs, now, sevenDaysMs]);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const [selectedJob, setSelectedJob] = useState(null);
  const [showApplicationForm, setShowApplicationForm] = useState(false);

  // ---------- ฟิลเตอร์ / เรียงลำดับ ----------
  const [onlyActive, setOnlyActive] = useState(false);
  const [locationFilter, setLocationFilter] = useState("");
  const [sortMode, setSortMode] = useState("recent"); // recent | oldest

  // ---------- STATE แชท ----------
  const [chatOpen, setChatOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  // ---------- STATE โปรไฟล์ ----------
  const [profileOpen, setProfileOpen] = useState(false);
  const [myProfile, setMyProfile] = useState(null);

  // ---------- STATE งานที่เคยสมัครแล้ว ----------
  const [myApps, setMyApps] = useState([]);
  const [myAppsLoading, setMyAppsLoading] = useState(false);
  const [myAppsError, setMyAppsError] = useState("");

  const token = localStorage.getItem("token") || "";

  // 🔧 สร้าง URL สำหรับรูปโปรไฟล์
  const rawPhoto =
    myProfile?.photoUrl ||
    user?.profile?.photoUrl ||
    user?.profilePhotoUrl ||
    user?.photoUrl ||
    user?.avatarUrl ||
    "";

  const avatarUrl =
    rawPhoto && rawPhoto.startsWith("http")
      ? rawPhoto
      : rawPhoto
      ? `${BACKEND_BASE}/${rawPhoto.replace(/^\/+/, "")}`
      : "";

  // 🔧 ฟังก์ชันโหลดโปรไฟล์ตัวเอง
  const loadMyProfile = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/profile/me`, {
        headers: authHeader(),
      });
      if (!res.ok) return;
      const data = await res.json().catch(() => null);
      if (data) {
        setMyProfile(data);
        
        // ✅ อัปเดต localStorage ด้วยข้อมูลที่โหลดมาจาก backend
        try {
          const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
          const updatedUser = {
            ...currentUser,
            profile: {
              ...currentUser.profile,
              ...data
            }
          };
          localStorage.setItem("user", JSON.stringify(updatedUser));
          
          // Dispatch event เพื่อให้ component อื่นรู้ว่า profile เปลี่ยนแล้ว
          window.dispatchEvent(new Event("auth-change"));
        } catch (storageError) {
          console.error("Error updating localStorage with profile:", storageError);
        }
      }
    } catch (e) {
      console.error("load profile error:", e);
    }
  };

  // 🔧 โหลดโปรไฟล์ (รวม photoUrl) ของตัวเองจาก backend ตอนมี token
  useEffect(() => {
    if (token) {
      loadMyProfile();
    }
  }, [token]);

  // เก็บ jobId ที่เคยสมัครแล้ว (ใช้บอกว่า “สมัครแล้ว”)
  const appliedJobIds = useMemo(() => {
    const set = new Set();
    myApps.forEach((app) => {
      const id = app.job?._id || app.jobId;
      if (id) set.add(id);
    });
    return set;
  }, [myApps]);

  const CATEGORIES = [
    { id: "all", name: "ทั้งหมด", icon: "⭐" },
    { id: "it", name: "IT & เทคโนโลยี", icon: "💻" },
    { id: "sale", name: "งานขาย/เซลส์", icon: "📊" },
    { id: "mkt", name: "การตลาด/โฆษณา", icon: "📢" },
    { id: "service", name: "บริการ/ต้อนรับ", icon: "🤝" },
    { id: "admin", name: "ธุรการ/เลขา", icon: "📋" },
    { id: "acc", name: "บัญชี/การเงิน", icon: "💰" },
    { id: "hr", name: "HR/ทรัพยากรบุคคล", icon: "👥" },
    { id: "design", name: "ออกแบบ/กราฟิก", icon: "🎨" },
    { id: "content", name: "คอนเทนต์/โซเชียล", icon: "📱" },
    { id: "eng", name: "วิศวกร/ช่างเทคนิค", icon: "🔧" },
    { id: "factory", name: "โรงงาน/ผลิต", icon: "🏭" },
    { id: "logistic", name: "ขนส่ง/โลจิสติกส์", icon: "🚚" },
    { id: "driver", name: "พนักงานขับรถ", icon: "🚗" },
    { id: "health", name: "สุขภาพ/แพทย์", icon: "⚕️" },
    { id: "beauty", name: "ความงาม/สปา", icon: "💅" },
    { id: "hotel", name: "โรงแรม/ท่องเที่ยว", icon: "🏨" },
    { id: "food", name: "ร้านอาหาร/เชฟ", icon: "🍳" },
    { id: "teacher", name: "ครู/ติวเตอร์", icon: "📚" },
    { id: "house", name: "แม่บ้าน/ทำความสะอาด", icon: "🧹" },
    { id: "security", name: "รักษาความปลอดภัย", icon: "🛡️" },
    { id: "pt", name: "พาร์ทไทม์", icon: "⏰" },
    { id: "remote", name: "ทำงานจากบ้าน", icon: "🏠" },
    { id: "other", name: "อื่นๆ", icon: "📂" },
  ];

  // ---------- โหลดสถานะแชท ----------
  useEffect(() => {
    const last = localStorage.getItem("chat:lastOpen");
    setChatOpen(last === "1");
  }, []);
  useEffect(() => {
    localStorage.setItem("chat:lastOpen", chatOpen ? "1" : "0");
  }, [chatOpen]);

  // ---------- โหลดงานทั้งหมด ----------
  useEffect(() => {
    const loadJobs = async () => {
      setJobsLoading(true);
      setJobsError("");
      try {
        const res = await fetch(`${API_BASE}/api/jobs`);
        const data = await res.json();
        if (!res.ok) {
          setJobs([]);
          setJobsError(data.message || "โหลดรายการงานไม่สำเร็จ");
        } else {
          setJobs(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        console.error("load jobs error:", e);
        setJobs([]);
        setJobsError("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้");
      } finally {
        setJobsLoading(false);
      }
    };

    loadJobs();
  }, []);

  // ⭐ ตรวจสอบ URL parameter เพื่อเปิดงานที่แชร์มา
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const jobId = params.get('job');
    
    if (jobId && jobs.length > 0) {
      // หางานที่ตรงกับ ID
      const job = jobs.find(j => j._id === jobId);
      if (job) {
        setSelectedJob(job);
        // ลบ parameter ออกจาก URL (ไม่ให้ซ้ำตอน refresh)
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [jobs]); // รันเมื่อโหลดงานเสร็จ

  // ---------- โหลด "งานที่เคยสมัครแล้ว" ----------
  const loadMyApplications = async () => {
    if (!token) return;
    setMyAppsLoading(true);
    setMyAppsError("");
    try {
      const res = await fetch(`${API_BASE}/api/my-applications`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        setMyApps([]);
        setMyAppsError(data.message || "ดึงงานที่เคยสมัครไม่สำเร็จ");
      } else {
        setMyApps(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("loadMyApplications error:", e);
      setMyApps([]);
      setMyAppsError("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้");
    } finally {
      setMyAppsLoading(false);
    }
  };

  useEffect(() => {
    loadMyApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // ---------- filter + sort งาน ----------
  const filteredJobs = useMemo(() => {
    let list = jobs.filter((job) => {
      const byCat =
        activeCategory === "all" ? true : job.category === activeCategory;

      const q = searchQuery.trim().toLowerCase();
      const byText =
        q === ""
          ? true
          : job.title?.toLowerCase().includes(q) ||
            job.company?.toLowerCase().includes(q);

      return byCat && byText;
    });

    if (onlyActive) {
      list = list.filter((job) => !job.isCompleted);
    }

    const loc = locationFilter.trim().toLowerCase();
    if (loc) {
      list = list.filter((job) =>
        (job.location || "").toLowerCase().includes(loc)
      );
    }

    list = list.slice().sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;

      if (sortMode === "recent") return bTime - aTime;
      if (sortMode === "oldest") return aTime - bTime;
      return 0;
    });

    return list;
  }, [
    jobs,
    activeCategory,
    searchQuery,
    onlyActive,
    locationFilter,
    sortMode,
  ]);

  // helper แปลงสถานะการสมัครเป็นภาษาไทย
  const getStatusLabel = (statusRaw) => {
    const status = statusRaw || "pending";
    if (status === "hired") return "รับเข้าทำงาน";
    if (status === "rejected") return "ถูกปฏิเสธ";
    return "รอพิจารณา";
  };

  const getStatusClass = (statusRaw) => {
    const status = statusRaw || "pending";
    if (status === "hired") return "bg-green-100 text-green-700";
    if (status === "rejected") return "bg-red-100 text-red-600";
    return "bg-gray-100 text-gray-600";
  };

  // ใช้เช็คว่า job ที่เปิดใน modal สมัครไปแล้วไหม
  const isSelectedJobApplied =
    selectedJob && appliedJobIds.has(selectedJob._id);

  // ⭐ เช็คว่าโปรไฟล์กรอกครบหรือยัง
  const isProfileCompleted = useMemo(() => {
    if (!myProfile) return false;

    return (
      !!(myProfile.fullName && myProfile.fullName.trim()) &&
      !!(myProfile.phone && myProfile.phone.trim()) &&
      !!(myProfile.location && myProfile.location.trim()) &&
      !!(myProfile.skillsText && myProfile.skillsText.trim()) &&
      !!(myProfile.experience && myProfile.experience.trim())
      // ถ้าอยากบังคับเรซูเม่ด้วย ให้เติมบรรทัดนี้:
      // && !!(myProfile.resumeUrl && myProfile.resumeUrl.trim())
    );
  }, [myProfile]);

  // สถานะของเราใน "งานที่กำลังเปิดใน modal"
  const myStatusForSelectedJob = useMemo(() => {
    if (!selectedJob) return null;
    const app = myApps.find(
      (a) => a.job && a.job._id === selectedJob._id
    );
    return app ? app.status || "pending" : null;
  }, [myApps, selectedJob]);

  // ⭐ อัปเดต meta tags เมื่อเปิดงาน (สำหรับการแชร์)
  useEffect(() => {
    if (selectedJob) {
      // อัปเดต title
      document.title = `${selectedJob.title} - ${selectedJob.company} | AOW`;
      
      // อัปเดต/สร้าง Open Graph meta tags
      const updateMetaTag = (property, content) => {
        let tag = document.querySelector(`meta[property="${property}"]`);
        if (!tag) {
          tag = document.createElement('meta');
          tag.setAttribute('property', property);
          document.head.appendChild(tag);
        }
        tag.setAttribute('content', content);
      };

      const url = `${window.location.origin}?job=${selectedJob._id}`;
      const description = selectedJob.description?.substring(0, 200) || `${selectedJob.title} ที่ ${selectedJob.company}`;
      const image = selectedJob.workplacePhotos?.[0] || `${window.location.origin}/logo512.png`;

      updateMetaTag('og:title', `${selectedJob.title} - ${selectedJob.company}`);
      updateMetaTag('og:description', description);
      updateMetaTag('og:image', image);
      updateMetaTag('og:url', url);
      updateMetaTag('og:type', 'website');
      
      // Twitter Card
      updateMetaTag('twitter:card', 'summary_large_image');
      updateMetaTag('twitter:title', `${selectedJob.title} - ${selectedJob.company}`);
      updateMetaTag('twitter:description', description);
      updateMetaTag('twitter:image', image);
    } else {
      // รีเซ็ต title เมื่อปิด modal
      document.title = 'AOW-All Of Works';
    }
  }, [selectedJob]);

  // ⭐ handler สมัครงาน: ถ้าโปรไฟล์ไม่ครบ → เปิด modal โปรไฟล์แทน
  const handleClickApply = () => {
    if (isSelectedJobApplied) return;

    if (!isProfileCompleted) {
      setProfileOpen(true);
      alert(
        "กรุณากรอกโปรไฟล์ให้ครบก่อนสมัครงาน\n\nควรกรอก: ชื่อ–นามสกุล, เบอร์โทร, พื้นที่ที่สนใจทำงาน, ทักษะ และประสบการณ์"
      );
      return;
    }

    setShowApplicationForm(true);
  };

  /* ============ UI ============ */
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white pb-24">
      {/* top bar */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 md:p-6 rounded-b-3xl shadow-lg">
        <div className="flex justify-between items-center mb-4 md:mb-6 gap-2">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">สวัสดี, {userName} 👋</h1>
            <p className="text-blue-100 text-xs md:text-sm mt-1">
              มาหางานที่ใช่สำหรับคุณกันเถอะ
            </p>
          </div>

          {/* ปุ่มโปรไฟล์ + กล่องแชท + ออกจากระบบ */}
          <div className="flex items-center gap-1 md:gap-3">
            <button
              onClick={() => setProfileOpen(true)}
              className="flex items-center gap-1 md:gap-2 bg-white/20 hover:bg-white/30 text-white font-medium px-2 md:px-4 py-2 rounded-xl shadow-md transition text-xs md:text-sm"
              title="โปรไฟล์ของฉัน"
            >
              <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="โปรไฟล์"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <UserIcon className="w-3 h-3 md:w-4 md:h-4" />
                )}
              </div>
              <span className="hidden sm:inline">โปรไฟล์ของฉัน</span>
            </button>

            <button
              onClick={() => setChatOpen(true)}
              className="relative flex items-center gap-1 md:gap-2 bg-white/20 hover:bg-white/30 text-white font-medium px-2 md:px-4 py-2 rounded-xl shadow-md transition text-xs md:text-sm"
              title="กล่องแชท"
            >
              <MessageCircle className="w-4 h-4 md:w-5 md:h-5" />
              <span className="hidden sm:inline">กล่องแชท</span>
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[18px] h-[18px] text-[10px] bg-red-500 text-white rounded-full px-1">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </button>

            <button
              onClick={onLogout}
              className="flex items-center gap-1 md:gap-2 bg-white/20 hover:bg-white/30 text-white font-medium px-2 md:px-4 py-2 rounded-xl shadow-md transition text-xs md:text-sm"
              title="ออกจากระบบ"
            >
              <span className="hidden sm:inline">ออกจากระบบ</span>
              <span className="sm:hidden">ออก</span>
            </button>
          </div>
        </div>

        {/* แถว search */}
        <div className="flex gap-3">
          <div className="flex-1 bg-white rounded-2xl shadow-md flex items-center px-3 md:px-4 py-2 md:py-3">
            <Search className="w-4 h-4 md:w-5 md:h-5 text-gray-400 mr-2 md:mr-3" />
            <input
              id="jobSearch"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาตำแหน่งงาน หรือบริษัท..."
              className="flex-1 outline-none text-gray-700 text-xs md:text-sm"
              autoComplete="off"
            />
          </div>
        </div>
      </div>

      {/* content */}
      <div className="px-6 mt-6 space-y-6">
        {/* banner summary */}
        <div className="bg-gradient-to-r from-orange-400 to-pink-500 rounded-2xl p-6 shadow-lg text-white flex items-center justify-between">
          <div>
            <p className="text-sm opacity-90">งานใหม่ใน 7 วันที่ผ่านมา</p>
            <h2 className="text-3xl font-bold mt-1">
              {recentJobsCount.toLocaleString()} งาน
            </h2>
            <p className="text-sm mt-2 opacity-90">
              จากงานทั้งหมด {jobs.length.toLocaleString()} งานในระบบ 🎯
            </p>
          </div>
          <TrendingUp className="w-16 h-16 opacity-50" />
        </div>

        {/* งานที่เคยสมัครแล้ว */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold text-gray-800">
              งานที่เคยสมัครแล้ว
            </h3>
            <button
              onClick={loadMyApplications}
              className="text-xs text-blue-600 hover:underline"
            >
              โหลดข้อมูลอีกครั้ง
            </button>
          </div>

          {myAppsLoading && (
            <p className="text-sm text-gray-500">กำลังโหลดงานที่เคยสมัคร...</p>
          )}
          {!!myAppsError && (
            <p className="text-sm text-red-500">{myAppsError}</p>
          )}

          {!myAppsLoading && !myAppsError && myApps.length === 0 && (
            <p className="text-sm text-gray-400">
              ยังไม่มีงานที่คุณเคยสมัคร หรือยังไม่ได้เข้าสู่ระบบ
            </p>
          )}

          {!myAppsLoading && myApps.length > 0 && (
            <div className="space-y-2 mt-2">
              {myApps.map((app) => (
                <div
                  key={app._id}
                  className="bg-white rounded-xl border p-3 flex gap-3 items-start"
                >
                  {/* ✅ เพิ่มรูปภาพงาน */}
                  {app.job?.workplacePhotos && app.job.workplacePhotos.length > 0 && (
                    <div className="flex-shrink-0">
                      <img
                        src={app.job.workplacePhotos[0]}
                        alt={app.job.title}
                        className="w-20 h-20 object-cover rounded-lg border"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  
                  <div className="flex-1">
                    <p className="text-sm font-semibold">
                      {app.job?.title || "งานถูกลบไปแล้ว"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {app.job?.company || "—"}{" "}
                      {app.job?.jobCode ? `• ${app.job.jobCode}` : ""}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      สมัครเมื่อ:{" "}
                      {app.createdAt
                        ? new Date(app.createdAt).toLocaleString()
                        : "—"}
                    </p>
                    {app.message && (
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                        ข้อความถึงผู้ว่าจ้าง: {app.message}
                      </p>
                    )}
                  </div>
                  
                  <div className="text-right flex-shrink-0">
                    <span
                      className={
                        "text-xs px-2 py-1 rounded-full " +
                        getStatusClass(app.status)
                      }
                    >
                      {getStatusLabel(app.status)}
                    </span>
                    {app.job && (
                      <button
                        onClick={() => setSelectedJob(app.job)}
                        className="block mt-2 text-xs text-blue-600 hover:underline"
                      >
                        ดูรายละเอียดงาน
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* หมวดหมู่งาน */}
        <div>
          <h3 className="text-lg font-bold text-gray-800 mb-4">หมวดหมู่งาน</h3>
          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex flex-col items-center p-3 rounded-2xl shadow-sm transition ${
                  activeCategory === cat.id ? "bg-blue-50 ring-2 ring-blue-500" : "bg-white hover:bg-gray-50"
                }`}
              >
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-2xl mb-2">
                  {cat.icon}
                </div>
                <span className="text-xs text-gray-600 text-center font-medium leading-tight">
                  {cat.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* รายการงาน */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-bold text-gray-800">งานที่พบ</h3>
            <span className="text-sm text-gray-400">
              {filteredJobs.length} รายการ
            </span>
          </div>

          {/* แสดงสถานะโหลด / error งาน */}
          {jobsLoading && (
            <p className="text-sm text-gray-500 mb-2">
              กำลังโหลดรายการงาน...
            </p>
          )}
          {!!jobsError && (
            <p className="text-sm text-red-500 mb-2">{jobsError}</p>
          )}

          {/* แถบฟิลเตอร์เพิ่มเติม */}
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <div className="relative">
              <MapPin className="w-4 h-4 text-gray-400 absolute left-2 top-2.5" />
              <input
                id="locationFilter"
                type="text"
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                placeholder="กรองตามสถานที่ทำงาน เช่น กรุงเทพ, ทำงานจากบ้าน"
                className="pl-8 pr-3 py-2 border rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[220px]"
                autoComplete="address-level1"
              />
            </div>

            <button
              type="button"
              onClick={() => setOnlyActive((v) => !v)}
              className={`flex items-center gap-1 px-3 py-2 rounded-lg border text-xs transition ${
                onlyActive
                  ? "bg-green-50 border-green-400 text-green-700"
                  : "bg-white border-gray-200 text-gray-600"
              }`}
            >
              <Filter className="w-3 h-3" />
              เฉพาะงานที่ยังเปิดรับ
            </button>

            <div className="flex items-center gap-2 text-xs">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500">เรียงตาม:</span>
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value)}
                className="border rounded-lg py-1 px-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="recent">โพสต์ล่าสุด</option>
                <option value="oldest">เก่าสุดก่อน</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            {filteredJobs.map((job) => {
              const isApplied = appliedJobIds.has(job._id);
              const isRecent =
                job.createdAt &&
                now - new Date(job.createdAt).getTime() <= sevenDaysMs &&
                !job.isCompleted;

              return (
                <div
                  key={job._id}
                  className={`bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition relative ${
                    job.isCompleted ? "opacity-80" : ""
                  }`}
                >
                  {/* ✅ รูปภาพสถานที่ทำงาน (ถ้ามี) */}
                  {job.workplacePhotos && job.workplacePhotos.length > 0 && (
                    <div className="w-full h-40 overflow-hidden bg-gray-100">
                      <img
                        src={job.workplacePhotos[0]}
                        alt={job.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-bold text-gray-800 text-sm mb-1">
                          {job.title}
                        </h4>
                        <p className="text-gray-500 text-xs mb-1">
                          {job.company} • {job.jobCode}
                        </p>

                        {job.isCompleted && (
                          <p className="text-[11px] text-gray-600 mb-1">
                            ✅ งานนี้ปิดรับแล้ว
                            {job.completedAt &&
                              ` (ตั้งแต่ ${new Date(
                                job.completedAt
                              ).toLocaleDateString()})`}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-2 mt-1">
                          <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full">
                            {job.salary}
                          </span>
                          <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                            {job.location}
                          </span>
                          <span className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded-full">
                            {job.type}
                          </span>
                        </div>
                      </div>

                    <div className="flex flex-col items-end gap-1">
                      {isApplied && (
                        <span className="text-[11px] px-3 py-1 rounded-full bg-sky-100 text-sky-700">
                          สมัครแล้ว
                        </span>
                      )}
                      {isRecent && (
                        <span className="text-[11px] px-3 py-1 rounded-full bg-amber-100 text-amber-700">
                          งานใหม่
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedJob(job);
                      setShowApplicationForm(false);
                    }}
                    className="text-blue-600 text-xs font-medium"
                  >
                    ดูรายละเอียด →
                  </button>
                  </div>
                </div>
              );
            })}

            {!jobsLoading && filteredJobs.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-8">
                ไม่พบบริษัทหรือชื่อตำแหน่งที่ค้นหา
              </p>
            )}
          </div>
        </div>
      </div>

      {/* modal: รายละเอียด + รีวิว */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 relative shadow-2xl">
            <button
              onClick={() => setSelectedJob(null)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="pr-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-xl font-bold mb-1">
                    {selectedJob.title}
                  </h2>
                  <p className="text-gray-500">{selectedJob.company}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    รหัสงาน: {selectedJob.jobCode}
                  </p>

                  {selectedJob.isCompleted && (
                    <p className="mt-1 inline-flex items-center text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                      งานนี้ปิดรับแล้ว
                      {selectedJob.completedAt &&
                        ` (ตั้งแต่ ${new Date(
                          selectedJob.completedAt
                        ).toLocaleDateString()})`}
                    </p>
                  )}

                  {/* แสดงสถานะของเราสำหรับงานนี้ (ช่วยให้รู้ว่าถูกจ้างหรือยัง) */}
                  {myStatusForSelectedJob && (
                    <p className="mt-2 text-[11px]">
                      สถานะของคุณในงานนี้:{" "}
                      <span
                        className={
                          "px-2 py-1 rounded-full " +
                          getStatusClass(myStatusForSelectedJob)
                        }
                      >
                        {getStatusLabel(myStatusForSelectedJob)}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              {/* ปุ่มสมัครงาน */}
              {!selectedJob.isCompleted && (
                <button
                  onClick={handleClickApply}
                  disabled={isSelectedJobApplied}
                  className={`w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-medium mt-2 mb-4 hover:shadow-lg transition ${
                    isSelectedJobApplied ? "opacity-60 cursor-not-allowed" : ""
                  }`}
                >
                  {isSelectedJobApplied
                    ? "คุณสมัครงานนี้แล้ว (ดูสถานะด้านบนในหัวข้อ งานที่เคยสมัครแล้ว)"
                    : "สมัครงานนี้"}
                </button>
              )}

              {/* ✅ ปุ่มแชร์งาน */}
              <div className="mb-4 pb-4 border-b">
                <button
                  onClick={async () => {
                    const url = `${window.location.origin}?job=${selectedJob._id}`;
                    const title = `${selectedJob.title} - ${selectedJob.company}`;
                    const text = `${selectedJob.title}\n${selectedJob.company}\n💰 ${selectedJob.salary}\n📍 ${selectedJob.location}`;
                    
                    const shareData = {
                      title: title,
                      text: text,
                      url: url
                    };

                    // ถ้ามีรูปภาพ พยายามแชร์พร้อมรูป
                    if (selectedJob.workplacePhotos && selectedJob.workplacePhotos.length > 0) {
                      try {
                        // ดึงรูปแรกมาเป็น blob
                        const imageUrl = selectedJob.workplacePhotos[0];
                        const response = await fetch(imageUrl);
                        const blob = await response.blob();
                        const file = new File([blob], 'workplace.jpg', { type: blob.type });
                        
                        // ตรวจสอบว่ารองรับการแชร์ไฟล์หรือไม่
                        if (navigator.canShare && navigator.canShare({ files: [file] })) {
                          shareData.files = [file];
                        }
                      } catch (err) {
                        console.log('Cannot fetch image for sharing:', err);
                        // ไม่เป็นไร แชร์แบบไม่มีรูปก็ได้
                      }
                    }

                    // ตรวจสอบว่าเบราว์เซอร์รองรับ Web Share API หรือไม่
                    if (navigator.share) {
                      try {
                        await navigator.share(shareData);
                      } catch (err) {
                        // ถ้ายกเลิกการแชร์ ไม่ต้องทำอะไร
                        if (err.name !== 'AbortError') {
                          console.error('Share error:', err);
                        }
                      }
                    } else {
                      // Fallback: คัดลอกลิงก์
                      navigator.clipboard.writeText(url);
                      alert("เบราว์เซอร์ไม่รองรับการแชร์\nคัดลอกลิงก์แล้ว!");
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-xl font-medium transition shadow-sm hover:shadow-md"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  แชร์งานนี้
                  {selectedJob.workplacePhotos && selectedJob.workplacePhotos.length > 0 && (
                    <span className="text-xs opacity-75">(พร้อมรูป)</span>
                  )}
                </button>
              </div>

              <div className="space-y-2 mb-4 text-sm">
                <p className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-500" />
                  {selectedJob.salary}
                </p>
                <p className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-red-500" />
                  {selectedJob.location}
                </p>
                <p className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-blue-500" />
                  {selectedJob.type}
                </p>
              </div>

              <div className="mb-4">
                <h3 className="font-semibold mb-1">รายละเอียดงาน</h3>
                <p className="text-sm text-gray-600 whitespace-pre-line">
                  {selectedJob.description || "—"}
                </p>
              </div>

              {/* ✅ รูปภาพสถานที่ทำงาน - แสดงเสมอ */}
              <div className="mb-4">
                <h3 className="font-semibold mb-2">🏢 ภาพงานเบื้อต้น</h3>
                
                {selectedJob?.workplacePhotos && selectedJob.workplacePhotos.length > 0 ? (
                  <>
                    <div className="grid grid-cols-3 gap-2">
                      {selectedJob.workplacePhotos.map((photo, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={photo}
                            alt={`สถานที่ทำงาน ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition"
                            onClick={() => window.open(photo, '_blank')}
                            onError={(e) => {
                              console.error("Failed to load image:", photo);
                              e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="%23f3f4f6"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="12">ไม่สามารถโหลดรูป</text></svg>';
                            }}
                          />
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">คลิกที่รูปเพื่อดูขนาดเต็ม</p>
                  </>
                ) : (
                  <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
                    <div className="text-gray-400 mb-2">
                      <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-500">ไม่มีภาพงานเบื้อต้น</p>
                    <p className="text-xs text-gray-400 mt-1">ผู้ว่าจ้างยังไม่ได้อัปโหลดรูปภาพ</p>
                  </div>
                )}
              </div>

              {selectedJob?.skills?.length > 0 && (
                <div className="mb-4">
                  <h3 className="font-semibold mb-1">ทักษะที่ต้องการ</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedJob.skills.map((s) => (
                      <span
                        key={s}
                        className="bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedJob?.benefits && (
                <div className="mb-4">
                  <h3 className="font-semibold mb-1">สวัสดิการ</h3>
                  <p className="text-sm text-gray-600 whitespace-pre-line">
                    {selectedJob.benefits}
                  </p>
                </div>
              )}

              <div className="mb-6">
                <h3 className="font-semibold mb-1">ช่องทางติดต่อ</h3>
                <p className="text-sm text-gray-600">
                  อีเมล: {selectedJob.contactEmail || "—"}
                </p>
                <p className="text-sm text-gray-600">
                  โทร: {selectedJob.contactPhone || "—"}
                </p>
                <p className="text-sm text-gray-600">
                  ลิงก์: {selectedJob.contactWebsite || "—"}
                </p>
              </div>

              {/* รีวิวบริษัท / งาน */}
              <ReviewSection jobId={selectedJob._id} />
            </div>
          </div>
        </div>
      )}

      {/* โมดัลสมัครงาน */}
      <ApplyJobModal
        open={showApplicationForm && !!selectedJob}
        onClose={() => setShowApplicationForm(false)}
        job={selectedJob}
        onApplied={() => {
          setShowApplicationForm(false);
          loadMyApplications();
        }}
      />

      {/* แชท */}
      <ChatWidget
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        user={user}
        token={token}
        onUnreadChange={setUnread}
      />

      {/* โปรไฟล์ผู้สมัครงาน */}
      <JobSeekerProfileModal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        user={user}
        onSaved={loadMyProfile} // ⭐ สำคัญ: เซฟโปรไฟล์แล้วให้โหลดใหม่
      />
    </div>
  );
}

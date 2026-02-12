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
    { id: "it", name: "IT & Tech", icon: "💻" },
    { id: "mkt", name: "การตลาด", icon: "📊" },
    { id: "acc", name: "บัญชี", icon: "💰" },
    { id: "pt", name: "พาร์ทไทม์", icon: "⏰" },
    { id: "remote", name: "รีโมต", icon: "🏠" },
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
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-b-3xl shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">สวัสดี, {userName} 👋</h1>
            <p className="text-blue-100 text-sm mt-1">
              มาหางานที่ใช่สำหรับคุณกันเถอะ
            </p>
          </div>

          {/* ปุ่มโปรไฟล์ + กล่องแชท + ออกจากระบบ */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setProfileOpen(true)}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white font-medium px-4 py-2 rounded-xl shadow-md transition"
            >
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="โปรไฟล์"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <UserIcon className="w-4 h-4" />
                )}
              </div>
              <span>โปรไฟล์ของฉัน</span>
            </button>

            <button
              onClick={() => setChatOpen(true)}
              className="relative flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white font-medium px-4 py-2 rounded-xl shadow-md transition"
            >
              <MessageCircle className="w-5 h-5" />
              <span>กล่องแชท</span>
              {unread > 0 && (
                <span className="ml-1 inline-flex items-center justify-center min-w-[20px] h-5 text-xs bg-red-500 text-white rounded-full px-1">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </button>

            <button
              onClick={onLogout}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white font-medium px-4 py-2 rounded-xl shadow-md transition"
            >
              ออกจากระบบ
            </button>
          </div>
        </div>

        {/* แถว search */}
        <div className="flex gap-3">
          <div className="flex-1 bg-white rounded-2xl shadow-md flex items-center px-4 py-3">
            <Search className="w-5 h-5 text-gray-400 mr-3" />
            <input
              id="jobSearch"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาตำแหน่งงาน หรือบริษัท..."
              className="flex-1 outline-none text-gray-700 text-sm"
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

        {/* banner ให้กำลังใจ */}
        <div className="relative overflow-hidden rounded-3xl shadow-xl p-6 bg-gradient-to-r from-blue-700 via-blue-500 to-cyan-400 text-white">
          <div className="relative z-10 flex items-center gap-4">
            <div className="text-4xl animate-bounce">🤍</div>
            <div>
              <h2 className="text-2xl font-extrabold drop-shadow">
                ขอเป็นกำลังใจให้พี่น้องชาวภาคใต้ทุกพื้นที่
              </h2>
              <p className="text-sm mt-2 text-blue-50 leading-relaxed">
                เราขอส่งพลังใจและความห่วงใยให้ทุกคนที่กำลังเผชิญเหตุการณ์น้ำท่วม
                <br />
                ขอให้ผ่านวิกฤตครั้งนี้ไปได้อย่างปลอดภัย แข็งแรง และมีกำลังใจต่อสู้ในทุกวัน 💙
              </p>
            </div>
          </div>
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
                  className="bg-white rounded-xl border p-3 flex justify-between items-start"
                >
                  <div>
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
                  <div className="text-right">
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
          <div className="grid grid-cols-5 gap-3">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex flex-col items-center p-3 rounded-2xl shadow-sm transition ${
                  activeCategory === cat.id ? "bg-blue-50" : "bg-white"
                }`}
              >
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-2xl mb-2">
                  {cat.icon}
                </div>
                <span className="text-xs text-gray-600 text-center font-medium">
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
                  className={`bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition relative ${
                    job.isCompleted ? "opacity-80" : ""
                  }`}
                >
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

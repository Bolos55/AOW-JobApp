// src/JobSearchHome.jsx
import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  MapPin,
  DollarSign,
  Briefcase,
  TrendingUp,
  User as UserIcon,
  X,
  Plus,
  Trash2,
  Users,
  MessageCircle,
} from "lucide-react";

import ChatWidget from "./components/ChatWidget";
import ChatDockButton from "./components/ChatDockButton";
import AddJobModal from "./components/AddJobModal";
import { API_BASE } from "./api";
import ApplyJobModal from "./components/ApplyJobModal";
import ReviewSection from "./components/ReviewSection";
import ApplicantsModal from "./components/ApplicantsModal";

const CATEGORIES = [
  { id: "all", name: "ทั้งหมด", icon: "⭐" },
  { id: "it", name: "IT & Tech", icon: "💻" },
  { id: "mkt", name: "การตลาด", icon: "📊" },
  { id: "acc", name: "บัญชี", icon: "💰" },
  { id: "pt", name: "พาร์ทไทม์", icon: "⏰" },
  { id: "remote", name: "รีโมต", icon: "🏠" },
  { id: "other", name: "อื่นๆ", icon: "📂" },
];

// helper อ่าน user จาก localStorage แบบปลอดภัย
const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
};

export default function JobSearchHome({ user: userFromApp }) {
  // ---------- USER ----------
  const [user, setUser] = useState(() => userFromApp || getStoredUser());

  // ถ้า App ส่ง user ใหม่มา → sync
  useEffect(() => {
    if (userFromApp) setUser(userFromApp);
  }, [userFromApp]);

  // sync เวลา login/logout ที่หน้าอื่นยิง event "auth-change" หรือเปลี่ยน localStorage
  useEffect(() => {
    const syncUser = () => setUser(getStoredUser());
    window.addEventListener("auth-change", syncUser);
    window.addEventListener("storage", syncUser);
    return () => {
      window.removeEventListener("auth-change", syncUser);
      window.removeEventListener("storage", syncUser);
    };
  }, []);

  // ชื่อบนหัวเว็บ
  const userName = useMemo(() => {
    const u = user || getStoredUser();
    if (!u) return "ผู้ใช้";
    const emailLocal = typeof u.email === "string" ? u.email.split("@")[0] : "";
    return (u.name && u.name.trim()) || emailLocal || "ผู้ใช้";
  }, [user]);

  // ---------- STATE งาน ----------
  const [jobs, setJobs] = useState([]);

  // จำนวน "งานใหม่ใน 7 วันที่ผ่านมา"
  const recentJobsCount = useMemo(() => {
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    return jobs.filter((job) => {
      if (!job.createdAt) return false;
      const created = new Date(job.createdAt).getTime();
      return now - created <= sevenDaysMs;
    }).length;
  }, [jobs]);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const [showAddForm, setShowAddForm] = useState(false);

  const [selectedJob, setSelectedJob] = useState(null);
  const [isEditingJob, setIsEditingJob] = useState(false);

  const [showApplicationForm, setShowApplicationForm] = useState(false);

  const [showApplicants, setShowApplicants] = useState(false);
  const [applicants, setApplicants] = useState([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);
  const [appError, setAppError] = useState("");

  // ---------- STATE แชท ----------
  const [chatOpen, setChatOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  // ---------- STATE งานที่เคยสมัครแล้ว ----------
  const [myApps, setMyApps] = useState([]);
  const [myAppsLoading, setMyAppsLoading] = useState(false);
  const [myAppsError, setMyAppsError] = useState("");

  const token = localStorage.getItem("token") || "";

  // โหลดสถานะแชทล่าสุด
  useEffect(() => {
    const last = localStorage.getItem("chat:lastOpen");
    setChatOpen(last === "1");
  }, []);
  useEffect(() => {
    localStorage.setItem("chat:lastOpen", chatOpen ? "1" : "0");
  }, [chatOpen]);

  // โหลดงานทั้งหมด
  useEffect(() => {
    fetch(`${API_BASE}/jobs`)
      .then((r) => r.json())
      .then((data) => setJobs(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  // โหลด "งานที่เคยสมัครแล้ว"
  const loadMyApplications = async () => {
    if (!token) return;
    setMyAppsLoading(true);
    setMyAppsError("");
    try {
      const res = await fetch(`${API_BASE}/my-applications`, {
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
    // โหลดทันทีเมื่อเข้าเว็บ (ถ้ามี token)
    loadMyApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
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
  }, [jobs, activeCategory, searchQuery]);

  // ลบงาน
  const handleDeleteJob = async (id) => {
    if (!window.confirm("ลบงานนี้ใช่ไหม?")) return;
    try {
      const res = await fetch(`${API_BASE}/jobs/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) return alert(data.message || "ลบไม่ได้");
      setJobs((prev) => prev.filter((j) => j._id !== id));
    } catch {
      alert("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้");
    }
  };

  // ✅ ปิดงาน (เฉพาะเจ้าของโพสต์)
  const handleCloseJob = async () => {
    if (!selectedJob) return;
    if (!window.confirm("ต้องการปิดงานนี้ใช่ไหม?")) return;

    try {
      const res = await fetch(
        `${API_BASE}/jobs/${selectedJob._id}/close`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await res.json();
      if (!res.ok) {
        return alert(data.message || "ปิดงานไม่สำเร็จ");
      }

      alert("ปิดงานเรียบร้อยแล้ว");

      // อัปเดต jobs ใน state + job ที่เปิดอยู่ใน modal
      setJobs((prev) =>
        prev.map((j) => (j._id === data.job._id ? data.job : j))
      );
      setSelectedJob(data.job);
    } catch (e) {
      console.error("handleCloseJob error:", e);
      alert("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้");
    }
  };

  // โหลดรายชื่อผู้สมัคร (ฝั่งนายจ้าง)
  const loadApplicants = async () => {
    if (!selectedJob) return;
    setLoadingApplicants(true);
    setAppError("");
    try {
      const res = await fetch(
        `${API_BASE}/jobs/${selectedJob._id}/applications`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setApplicants([]);
        setAppError(data.message || "ดึงรายชื่อผู้สมัครไม่สำเร็จ");
      } else {
        setApplicants(Array.isArray(data) ? data : []);
      }
    } catch {
      setApplicants([]);
      setAppError("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้");
    } finally {
      setLoadingApplicants(false);
    }
  };

  useEffect(() => {
    if (showApplicants && selectedJob) loadApplicants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showApplicants, selectedJob]);

  const isOwner =
    selectedJob &&
    user &&
    selectedJob.createdBy &&
    (selectedJob.createdBy === user.id ||
      selectedJob.createdBy === user._id?.toString());

  /* ======= UI ======= */
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

          {/* ปุ่มกล่องแชท + ปุ่มออกจากระบบ */}
          <div className="flex items-center gap-3">
            {/* ปุ่มกล่องแชท */}
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

            {/* ปุ่มออกจากระบบ */}
            <button
              onClick={() => {
                try {
                  localStorage.removeItem("user");
                  localStorage.removeItem("token");
                  localStorage.removeItem("chat:lastOpen");
                  localStorage.removeItem("chat:lastThread");
                  sessionStorage.clear();
                  document.cookie.split(";").forEach((c) => {
                    const eqPos = c.indexOf("=");
                    const name = eqPos > -1 ? c.substr(0, eqPos) : c;
                    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
                  });
                  window.dispatchEvent(new Event("auth-change"));
                } finally {
                  window.location.replace("/login");
                }
              }}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white font-medium px-4 py-2 rounded-xl shadow-md transition"
            >
              <UserIcon className="w-5 h-5" /> ออกจากระบบ
            </button>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex-1 bg-white rounded-2xl shadow-md flex items-center px-4 py-3">
            <Search className="w-5 h-5 text-gray-400 mr-3" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาตำแหน่งงาน หรือบริษัท..."
              className="flex-1 outline-none text-gray-700 text-sm"
            />
          </div>
          <button
            onClick={() => {
              setShowAddForm(true);
            }}
            className="bg-white rounded-2xl shadow-md px-4 py-3 hover:bg-gray-50 transition flex items-center gap-2"
          >
            <Plus className="w-5 h-5 text-blue-600" />
            <span className="text-sm text-gray-700">เพิ่มงาน</span>
          </button>
        </div>
      </div>

      {/* content */}
      <div className="px-6 mt-6 space-y-6">
        {/* banner */}
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

        {/* 🔥 แบนเนอร์ให้กำลังใจพี่น้องชาวภาคใต้ (แบบเด่นพิเศษ) */}
        <div className="relative overflow-hidden rounded-3xl shadow-xl p-6 bg-gradient-to-r from-blue-700 via-blue-500 to-cyan-400 text-white">
          {/* ลวดลายพื้นหลัง */}
          <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/asfalt-dark.png')]"></div>

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

        {/* ⭐ ส่วน “งานที่เคยสมัครแล้ว” */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold text-gray-800">งานที่เคยสมัครแล้ว</h3>
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
                        ((app.status || "pending") === "hired"
                          ? "bg-green-100 text-green-700"
                          : (app.status || "pending") === "rejected"
                          ? "bg-red-100 text-red-600"
                          : "bg-gray-100 text-gray-600")
                      }
                    >
                      {app.status || "pending"}
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

        {/* categories */}
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

        {/* job list */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-bold text-gray-800">งานที่พบ</h3>
            <span className="text-sm text-gray-400">
              {filteredJobs.length} รายการ
            </span>
          </div>

          <div className="space-y-3">
            {filteredJobs.map((job) => (
              <div
                key={job._id}
                className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition relative"
              >
                {user &&
                  job.createdBy &&
                  (job.createdBy === user.id ||
                    job.createdBy === user._id?.toString()) && (
                    <button
                      onClick={() => handleDeleteJob(job._id)}
                      className="absolute top-3 right-3 text-red-400 hover:text-red-600"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}

                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-bold text-gray-800 text-sm mb-1">
                      {job.title}
                    </h4>
                    <p className="text-gray-500 text-xs mb-1">
                      {job.company} • {job.jobCode}
                    </p>

                    {/* ป้ายบอกถ้างานปิดแล้ว */}
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
                </div>

                <button
                  onClick={() => {
                    setSelectedJob(job);
                    setIsEditingJob(false);
                  }}
                  className="text-blue-600 text-xs font-medium"
                >
                  ดูรายละเอียด →
                </button>
              </div>
            ))}

            {filteredJobs.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-8">
                ไม่พบบริษัทหรือชื่อตำแหน่งที่ค้นหา
              </p>
            )}
          </div>
        </div>
      </div>

      {/* AddJobModal */}
      <AddJobModal
        open={showAddForm}
        onClose={() => setShowAddForm(false)}
        token={token}
        onCreated={(job) => {
          setJobs((prev) => [job, ...prev]);
          setShowAddForm(false);
        }}
      />

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
                  {isEditingJob ? (
                    <input
                      className="text-xl font-bold border rounded-md px-2 py-1 mb-1"
                      value={selectedJob.title}
                      onChange={(e) =>
                        setSelectedJob((p) => ({
                          ...p,
                          title: e.target.value,
                        }))
                      }
                    />
                  ) : (
                    <h2 className="text-xl font-bold mb-1">
                      {selectedJob.title}
                    </h2>
                  )}

                  {isEditingJob ? (
                    <input
                      className="text-gray-500 border rounded-md px-2 py-1"
                      value={selectedJob.company}
                      onChange={(e) =>
                        setSelectedJob((p) => ({
                          ...p,
                          company: e.target.value,
                        }))
                      }
                    />
                  ) : (
                    <p className="text-gray-500">{selectedJob.company}</p>
                  )}

                  <p className="text-xs text-gray-400 mt-1">
                    รหัสงาน: {selectedJob.jobCode}
                  </p>

                  {/* ป้ายบอกสถานะปิดงาน */}
                  {selectedJob.isCompleted && (
                    <p className="mt-1 inline-flex items-center text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                      งานนี้ปิดรับแล้ว
                      {selectedJob.completedAt &&
                        ` (ตั้งแต่ ${new Date(
                          selectedJob.completedAt
                        ).toLocaleDateString()})`}
                    </p>
                  )}
                </div>

                {isOwner && (
                  <div className="flex flex-wrap items-center gap-2 justify-end">
                    <button
                      onClick={() => setIsEditingJob((v) => !v)}
                      className="text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded-lg"
                    >
                      {isEditingJob ? "โหมดดู" : "แก้ไขงานนี้"}
                    </button>
                    <button
                      onClick={() => setShowApplicants(true)}
                      className="text-sm bg-purple-50 text-purple-700 px-3 py-1 rounded-lg flex items-center gap-1"
                      title="ดูรายชื่อผู้สมัคร"
                    >
                      <Users className="w-4 h-4" /> ดูผู้สมัคร
                    </button>

                    {/* ปุ่มปิดงาน (แสดงเฉพาะถ้างานยังไม่ปิด) */}
                    {!selectedJob.isCompleted && (
                      <button
                        onClick={handleCloseJob}
                        className="text-sm bg-red-50 text-red-700 px-3 py-1 rounded-lg"
                      >
                        ปิดงานนี้
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* ปุ่มสมัครงาน (ถ้าไม่ใช่เจ้าของโพสต์ และงานยังไม่ปิด) */}
              {!isOwner && !selectedJob.isCompleted && (
                <button
                  onClick={() => setShowApplicationForm(true)}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-medium mt-2 mb-4 hover:shadow-lg transition"
                >
                  สมัครงานนี้
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
      />

      {/* โมดัลผู้สมัคร (ฝั่งนายจ้าง) */}
      <ApplicantsModal
        open={showApplicants}
        onClose={() => setShowApplicants(false)}
        job={selectedJob}
        applicants={applicants}
        loading={loadingApplicants}
        error={appError}
        onRefresh={loadApplicants}
        token={token}
        onOpenChat={(thread) => {
          if (thread && thread._id) {
            localStorage.setItem("chat:lastThread", thread._id);
          }
          setChatOpen(true);
        }}
      />
      <ChatWidget
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        user={user}
        token={token}
        onUnreadChange={setUnread}
      />
    </div>
  );
}

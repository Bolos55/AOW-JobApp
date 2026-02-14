// src/EmployerView.jsx
import { useState, useEffect, useMemo, useRef } from "react";
import {
  User as UserIcon,
  Plus,
  Users,
  CheckCircle,
  Building2,
  RefreshCw,
  AlertTriangle,
  Filter,
  Briefcase,
  X,
  MessageCircle,
  Lock,
} from "lucide-react";

import { API_BASE, authHeader } from "./api";
import { getPhotoUrl } from "./utils/imageUtils";
import AddJobModal from "./components/AddJobModal";
import ReviewSection from "./components/ReviewSection";
import ChatWidget from "./components/ChatWidget"; // ✅ เพิ่มอันนี้
import ServiceFeeModal from "./components/ServiceFeeModal"; // ✅ เปลี่ยนเป็น Service Fee Modal
import PaymentHistory from "./components/PaymentHistory"; // ✅ เพิ่ม Payment History

export default function EmployerView({ user, onLogout }) {
  const [myJobs, setMyJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [openAddJob, setOpenAddJob] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // filter ผู้สมัคร
  const [statusFilter, setStatusFilter] = useState("all"); // all | pending | hired | rejected
  const [jobFilter, setJobFilter] = useState("all"); // all หรือ job._id

  // modal state
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedApplication, setSelectedApplication] = useState(null);

  // กำลังอัปเดตสถานะใบสมัคร
  const [updatingAppId, setUpdatingAppId] = useState(null);

  // state สำหรับแชทกับผู้สมัคร
  const [openChat, setOpenChat] = useState(false);
  const [chatTarget, setChatTarget] = useState(null);

  // ✅ แชทติดต่อแอดมิน (ใช้ ChatWidget เหมือน JobSeeker)
  const [adminChatOpen, setAdminChatOpen] = useState(false);

  // ✅ State สำหรับ modal คำอธิบายการชำระเงิน
  const [showPaymentInfo, setShowPaymentInfo] = useState(false);
  const [adminUnread, setAdminUnread] = useState(0);

  // ✅ Service Fee Modal state
  const [serviceFeeModalOpen, setServiceFeeModalOpen] = useState(false);
  const [selectedJobForServiceFee, setSelectedJobForServiceFee] = useState(null);
  const [paymentHistoryOpen, setPaymentHistoryOpen] = useState(false);

  // ✅ Track component mount status
  const mountedRef = useRef(true);

  const token = localStorage.getItem("token") || "";

  // ✅ Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const last = localStorage.getItem("adminChat:lastOpen");
    setAdminChatOpen(last === "1");
  }, []);
  useEffect(() => {
    localStorage.setItem("adminChat:lastOpen", adminChatOpen ? "1" : "0");
  }, [adminChatOpen]);

  // โหลด dashboard
  const loadDashboard = async () => {
    if (!mountedRef.current) return;
    
    try {
      setLoading(true);
      setError("");

      const headers = {
        "Content-Type": "application/json",
        ...authHeader(),
      };

      // งานที่ฉันโพสต์
      const jobsRes = await fetch(`${API_BASE}/api/employer/my-jobs`, {
        headers,
      });
      if (jobsRes.ok) {
        const data = await jobsRes.json().catch(() => []);
        if (mountedRef.current) {
          setMyJobs(Array.isArray(data) ? data : []);
        }
      } else {
        if (mountedRef.current) {
          setMyJobs([]);
          setError("โหลดรายการงานไม่สำเร็จ");
        }
      }

      // ผู้สมัครทั้งหมดของงานฉัน
      const appsRes = await fetch(
        `${API_BASE}/api/employer/my-applications-received`,
        { headers }
      );
      if (appsRes.ok) {
        const data = await appsRes.json().catch(() => []);
        if (mountedRef.current) {
          setApplications(Array.isArray(data) ? data : []);
        }
      } else {
        if (mountedRef.current) {
          setApplications([]);
          setError((prev) => prev || "โหลดข้อมูลผู้สมัครไม่สำเร็จ");
        }
      }
    } catch (err) {
      if (mountedRef.current) {
        setMyJobs([]);
        setApplications([]);
        setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  // เรียกตอนสร้างงานเสร็จจาก Modal
  const handleJobCreated = () => {
    setOpenAddJob(false);
    loadDashboard();
    // ✅ เปิด modal ข้อมูลการโพสต์งานทันที
    setTimeout(() => {
      setShowPaymentInfo(true);
    }, 300); // รอให้ modal เพิ่มงานปิดก่อน
  };

  // คำนวณสถิติจาก applications
  const { totalPending, totalHired } = useMemo(() => {
    let pending = 0;
    let hired = 0;

    applications.forEach((a) => {
      const status = a.status || "pending";
      if (status === "pending") pending++;
      else if (status === "hired") hired++;
    });

    return { totalPending: pending, totalHired: hired };
  }, [applications]);

  // filter รายการผู้สมัคร
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const status = app.status || "pending";
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (jobFilter !== "all" && app.job?._id !== jobFilter) return false;
      return true;
    });
  }, [applications, statusFilter, jobFilter]);

  // เปิด/ปิด Modal รายละเอียดงาน
  const openJobDetail = (job) => setSelectedJob(job);
  const closeJobDetail = () => setSelectedJob(null);

  // เปิด/ปิด Modal รายละเอียดผู้สมัคร
  const openApplicationDetail = (app) => setSelectedApplication(app);
  const closeApplicationDetail = () => setSelectedApplication(null);

  // อัปเดตสถานะใบสมัคร
  const updateApplicationStatus = async (app, newStatus) => {
    if (!app?._id) return;
    if (app.status === newStatus) return;
    if (!mountedRef.current) return;

    // ✅ เช็คว่าถ้าจะรับเข้าทำงาน ต้องมีการยืนยันบัตรประชาชนก่อน
    if (newStatus === "hired" && !app.idVerified) {
      alert("⚠️ ไม่สามารถรับเข้าทำงานได้\n\nเหตุผล: แอดมินยังไม่ได้ตรวจสอบและอนุมัติบัตรประชาชนของผู้สมัครคนนี้\n\nกรุณารอให้แอดมินตรวจสอบบัตรประชาชนก่อน หรือติดต่อแอดมินเพื่อขอให้เร่งตรวจสอบ");
      return;
    }

    const confirmText =
      newStatus === "hired"
        ? "ยืนยันการรับผู้สมัครคนนี้เข้าทำงานหรือไม่?"
        : "ยืนยันการปฏิเสธผู้สมัครคนนี้หรือไม่?";

    if (!window.confirm(confirmText)) return;

    try {
      setUpdatingAppId(app._id);

      const res = await fetch(
        `${API_BASE}/api/employer/applications/${app._id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...authHeader(),
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        
        // ✅ จัดการ error message พิเศษสำหรับกรณีบัตรประชาชนยังไม่ได้รับการอนุมัติ
        if (errorData.requiresIdVerification) {
          if (mountedRef.current) {
            alert("⚠️ " + errorData.message + "\n\nกรุณาติดต่อแอดมินเพื่อขอให้ตรวจสอบบัตรประชาชนของผู้สมัครคนนี้");
          }
        } else {
          if (mountedRef.current) {
            alert(errorData.message || "อัปเดตสถานะไม่สำเร็จ กรุณาลองใหม่");
          }
        }
        return;
      }

      const updated = await res.json().catch(() => null);

      if (mountedRef.current) {
        setApplications((prev) =>
          prev.map((p) =>
            p._id === app._id
              ? { ...p, ...(updated || {}), status: newStatus }
              : p
          )
        );

        setSelectedApplication((prev) =>
          prev && prev._id === app._id
            ? { ...prev, ...(updated || {}), status: newStatus }
            : prev
        );

        // แสดงข้อความสำเร็จ
        if (newStatus === "hired") {
          alert("✅ รับเข้าทำงานเรียบร้อยแล้ว!");
        } else if (newStatus === "rejected") {
          alert("✅ ปฏิเสธผู้สมัครเรียบร้อยแล้ว");
        }
      }

    } catch (err) {
      if (mountedRef.current) {
        alert("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
      }
    } finally {
      if (mountedRef.current) {
        setUpdatingAppId(null);
      }
    }
  };

  // ปิดงาน
  const closeJob = async (job) => {
    if (!job?._id) return;
    if (!window.confirm(`ยืนยันปิดงาน "${job.title}" หรือไม่?`)) return;
    if (!mountedRef.current) return;

    try {
      const res = await fetch(`${API_BASE}/api/employer/jobs/${job._id}/close`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeader(),
        },
      });

      if (!res.ok) {
        if (mountedRef.current) {
          alert("ปิดงานไม่สำเร็จ กรุณาลองใหม่");
        }
        return;
      }

      const updated = await res.json().catch(() => null);
      
      if (!updated || !mountedRef.current) return;

      // ✅ อัปเดต state ให้แน่ใจว่า isCompleted = true
      const updatedJob = { ...job, ...updated, isCompleted: true };
      
      setMyJobs((prev) =>
        prev.map((j) => (j._id === job._id ? updatedJob : j))
      );

      setSelectedJob((prev) =>
        prev && prev._id === job._id ? updatedJob : prev
      );
      
      alert("ปิดงานเรียบร้อยแล้ว");
    } catch (err) {
      if (mountedRef.current) {
        alert("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 md:p-6">
        <div className="flex justify-between items-center mb-4 gap-2 flex-wrap">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">🏢 สวัสดี, {user?.name || "นายจ้าง"}</h1>
            <p className="text-xs md:text-sm opacity-90">นายจ้าง - จัดการงานและผู้สมัคร</p>
          </div>

          <div className="flex items-center gap-1 md:gap-2 flex-wrap">
            {/* ✅ ปุ่มประวัติการชำระเงิน */}
            <button
              onClick={() => setPaymentHistoryOpen(true)}
              className="bg-white/20 hover:bg-white/30 px-2 md:px-4 py-2 rounded-lg flex items-center gap-1 md:gap-2 text-xs md:text-sm"
              title="ประวัติการชำระเงิน"
            >
              <span className="text-base md:text-lg">💳</span>
              <span className="hidden sm:inline">ประวัติการชำระเงิน</span>
            </button>

            {/* ✅ ปุ่มหน้าแชท */}
            <button
              onClick={() => setAdminChatOpen(true)}
              className="relative bg-white/20 hover:bg-white/30 px-2 md:px-4 py-2 rounded-lg flex items-center gap-1 md:gap-2 text-xs md:text-sm"
              title="หน้าแชท"
            >
              <MessageCircle className="w-4 h-4" />
              <span className="hidden sm:inline">หน้าแชท</span>
              {adminUnread > 0 && (
                <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[18px] h-[18px] text-[10px] bg-red-500 text-white rounded-full px-1">
                  {adminUnread > 9 ? "9+" : adminUnread}
                </span>
              )}
            </button>

            {/* ปุ่ม Refresh */}
            <button
              onClick={loadDashboard}
              className="bg-white/20 hover:bg-white/30 px-2 md:px-4 py-2 rounded-lg flex items-center gap-1 md:gap-2 text-xs md:text-sm"
              disabled={loading}
              title="รีโหลดข้อมูล"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">รีโหลดข้อมูล</span>
            </button>

            <button
              onClick={onLogout}
              className="bg-white/20 hover:bg-white/30 px-2 md:px-4 py-2 rounded-lg flex items-center gap-1 md:gap-2 text-xs md:text-sm"
              title="ออกจากระบบ"
            >
              <UserIcon className="w-4 h-4" />
              <span className="hidden sm:inline">ออกจากระบบ</span>
            </button>
          </div>
        </div>

        {/* ปุ่มเปิด AddJobModal */}
        <button
          onClick={() => setOpenAddJob(true)}
          className="bg-white text-purple-600 px-4 md:px-6 py-2 md:py-3 rounded-lg font-medium flex items-center gap-2 hover:bg-purple-50 text-sm md:text-base w-full sm:w-auto justify-center"
        >
          <Plus className="w-4 h-4 md:w-5 md:h-5" /> ประกาศงานใหม่
        </button>

        {/* แถบแจ้งสถานะโหลด / error */}
        <div className="mt-3">
          {loading && <p className="text-xs opacity-80">กำลังโหลดข้อมูลจากเซิร์ฟเวอร์...</p>}
          {error && !loading && (
            <div className="mt-2 bg-red-500/70 text-xs px-3 py-2 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>

      {/* Modal เพิ่มงานใหม่ */}
      <AddJobModal
        open={openAddJob}
        onClose={() => setOpenAddJob(false)}
        onCreated={handleJobCreated}
      />

      {/* Modal รายละเอียดงาน */}
      <JobDetailModal open={!!selectedJob} job={selectedJob} onClose={closeJobDetail} />

      {/* Modal รายละเอียดใบสมัคร/ผู้สมัคร */}
      <ApplicationDetailModal
        open={!!selectedApplication}
        app={selectedApplication}
        onClose={closeApplicationDetail}
        onUpdateStatus={updateApplicationStatus}
        updatingAppId={updatingAppId}
      />

      {/* Modal แชทกับผู้สมัคร */}
      <ChatModal
        open={openChat}
        app={chatTarget}
        user={user}
        onClose={() => setOpenChat(false)}
        onContactAdmin={() => {
          setOpenChat(false);
          setAdminChatOpen(true);
        }}
      />

      <div className="p-6 space-y-6">
        {/* สถิติ */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border flex items-center gap-3">
            <Building2 className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-xs text-gray-500 uppercase">งานที่โพสต์</p>
              <p className="text-2xl font-bold">{myJobs.length}</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border flex items-center gap-3">
            <Users className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-xs text-gray-500 uppercase">ผู้สมัครทั้งหมด</p>
              <p className="text-2xl font-bold">{applications.length}</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-purple-600" />
            <div>
              <p className="text-xs text-gray-500 uppercase">รับเข้าทำงานแล้ว</p>
              <p className="text-2xl font-bold">{totalHired}</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-yellow-500" />
            <div>
              <p className="text-xs text-gray-500 uppercase">รอพิจารณา</p>
              <p className="text-2xl font-bold">{totalPending}</p>
            </div>
          </div>
        </div>

        {/* งานของฉัน */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-purple-600" />
                งานที่ฉันโพสต์
              </h2>
              {/* ปุ่ม info */}
              <button
                onClick={() => setShowPaymentInfo(true)}
                className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-600 transition animate-pulse hover:animate-none"
                title="ข้อมูลเกี่ยวกับการโพสต์งาน"
                style={{
                  animation: 'heartbeat 1.5s ease-in-out infinite'
                }}
              >
                <span className="text-sm font-bold">i</span>
              </button>
              <style>{`
                @keyframes heartbeat {
                  0%, 100% {
                    transform: scale(1);
                  }
                  10%, 30% {
                    transform: scale(1.1);
                  }
                  20%, 40% {
                    transform: scale(1);
                  }
                }
              `}</style>
            </div>
            <p className="text-xs text-gray-500">
              เคล็ดลับ: คลิก "ดูผู้สมัครงานนี้" เพื่อ filter ด้านล่าง
            </p>
          </div>

          {myJobs.length === 0 ? (
            <p className="text-sm text-gray-400">ยังไม่มีงานที่โพสต์</p>
          ) : (
            <div className="space-y-3">
              {myJobs.map((job) => {
                const isClosed = !!job.isCompleted;
                return (
                  <div
                    key={job._id}
                    className="bg-white p-4 rounded-lg border hover:shadow-md transition"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold">{job.title}</h3>
                          {isClosed && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                              <Lock className="w-3 h-3" />
                              ปิดรับสมัครแล้ว
                            </span>
                          )}
                          {/* ✅ Boost Status - แสดงเฉพาะถ้าจ่ายเงินเพื่อ boost */}
                          {!isClosed && job.isPaid && job.boostFeatures && job.boostFeatures.length > 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-yellow-100 to-orange-100 text-orange-700 border border-orange-200">
                              ⭐ โดดเด่น
                            </span>
                          )}
                          {!isClosed && (!job.isPaid || !job.boostFeatures || job.boostFeatures.length === 0) && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">
                              📢 ปกติ
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{job.company || "บริษัทของคุณ"}</p>
                        {job.location && (
                          <p className="text-xs text-gray-500 mt-1">
                            สถานที่ทำงาน: {job.location}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          ผู้สมัคร: {job.applicantCount || 0} คน
                        </p>
                        {/* ✅ Package Info */}
                        {job.packageType && (
                          <p className="text-xs text-purple-600 mt-1">
                            แพ็กเกจ: {job.packageType} {job.boostFeatures?.length > 0 && `+ ${job.boostFeatures.length} boost`}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <button
                          className="text-blue-600 text-sm hover:underline"
                          onClick={() => openJobDetail(job)}
                        >
                          ดูรายละเอียด
                        </button>

                        {/* ✅ Payment Button */}
                        {!job.isPaid && !isClosed && (
                          <button
                            onClick={() => {
                              setSelectedJobForServiceFee(job);
                              setServiceFeeModalOpen(true);
                            }}
                            className="text-xs px-3 py-1 rounded-lg bg-green-600 text-white hover:bg-green-700 flex items-center gap-1"
                          >
                            💰 ชำระเงิน
                          </button>
                        )}

                        <button
                          className={`text-xs px-3 py-1 rounded-full border ${
                            jobFilter === job._id
                              ? "bg-blue-50 text-blue-700 border-blue-300"
                              : "bg-gray-50 text-gray-600 border-gray-200"
                          }`}
                          onClick={() =>
                            setJobFilter((prev) => (prev === job._id ? "all" : job._id))
                          }
                        >
                          {jobFilter === job._id ? "แสดงผู้สมัครทุกงาน" : "ดูผู้สมัครงานนี้"}
                        </button>

                        {!isClosed && (
                          <button
                            onClick={() => closeJob(job)}
                            className="text-xs mt-1 inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-gray-800 text-white hover:bg-black"
                          >
                            <Lock className="w-3 h-3" />
                            ปิดงานนี้
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ผู้สมัคร + filter */}
        <div>
          <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-green-600" />
              ผู้สมัคร
              <span className="text-xs font-normal text-gray-500">
                ({filteredApplications.length} รายการหลังจาก filter)
              </span>
            </h2>

            <div className="flex items-center gap-2 text-sm">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border rounded-md px-2 py-1 text-sm"
              >
                <option value="all">สถานะ: ทั้งหมด</option>
                <option value="pending">รอพิจารณา</option>
                <option value="hired">รับเข้าทำงาน</option>
                <option value="rejected">ปฏิเสธ</option>
              </select>

              <select
                value={jobFilter}
                onChange={(e) => setJobFilter(e.target.value)}
                className="border rounded-md px-2 py-1 text-sm"
              >
                <option value="all">งาน: ทุกงาน</option>
                {myJobs.map((job) => (
                  <option key={job._id} value={job._id}>
                    {job.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ✅ ข้อความแจ้งเตือนเรื่องการยืนยันบัตรประชาชน */}
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-semibold text-blue-800 mb-1">📋 หมายเหตุสำคัญ</p>
                <p className="text-blue-700">
                  คุณสามารถรับผู้สมัครเข้าทำงานได้เฉพาะผู้ที่ <strong>แอดมินได้ตรวจสอบและอนุมัติบัตรประชาชนแล้วเท่านั้น</strong>
                </p>
                <p className="text-blue-600 text-xs mt-1">
                  💡 หากต้องการให้แอดมินเร่งตรวจสอบ สามารถกดปุ่ม "ติดต่อแอดมิน" ด้านบนได้
                </p>
              </div>
            </div>
          </div>

          {applications.length === 0 ? (
            <p className="text-sm text-gray-400">
              ยังไม่มีผู้สมัคร (ลองโพสต์งานใหม่ดูสิ 🎉)
            </p>
          ) : filteredApplications.length === 0 ? (
            <p className="text-sm text-gray-400">ไม่มีผู้สมัครที่ตรงกับเงื่อนไข filter</p>
          ) : (
            <div className="space-y-2">
              {filteredApplications.slice(0, 50).map((app) => {
                const status = app.status || "pending";
                const isUpdating = updatingAppId === app._id;
                const isClosed = !!app.job?.isCompleted; // ✅ เช็คว่างานปิดรับสมัครแล้วหรือยัง

                const applicantPhoto = getPhotoUrl(app.applicant?.profile) || app.applicant?.avatar || "";

                return (
                  <div
                    key={app._id}
                    className="bg-white p-4 rounded-lg border flex justify-between items-center gap-4"
                  >
                    <div className="flex-1 flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                        {applicantPhoto ? (
                          <img
                            src={applicantPhoto}
                            alt={app.applicant?.name || "ผู้สมัคร"}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <UserIcon className="w-5 h-5 text-gray-400" />
                        )}
                      </div>

                      <div className="flex-1">
                        <p className="font-semibold">{app.applicant?.name || "ผู้สมัคร"}</p>
                        <p className="text-sm text-gray-600">
                          สมัคร: {app.job?.title || "-"}
                        </p>
                        
                        {/* ✅ แสดงสถานะการยืนยันบัตรประชาชน */}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500">บัตรประชาชน:</span>
                          {app.idVerified ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                              ✅ ยืนยันแล้ว
                            </span>
                          ) : app.idCardPath ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                              ⏳ รอแอดมินตรวจสอบ
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                              ❌ ยังไม่อัปโหลด
                            </span>
                          )}
                        </div>
                        
                        <p className="text-xs text-gray-400 mt-1">
                          ส่งเมื่อ:{" "}
                          {app.createdAt ? new Date(app.createdAt).toLocaleString('th-TH', {
                            year: 'numeric',
                            month: 'short', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : "-"}
                        </p>

                        <button
                          className="mt-2 text-xs text-blue-600 hover:underline"
                          onClick={() => openApplicationDetail(app)}
                        >
                          ดูรายละเอียดใบสมัคร / โปรไฟล์
                        </button>

                        <button
                          className="mt-4 inline-flex items-center gap-1 text-xs text-purple-600 hover:underline"
                          onClick={() => {
                            setChatTarget(app);
                            setOpenChat(true);
                          }}
                        >
                          <MessageCircle className="w-3 h-3" />
                          แชทกับผู้สมัคร
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          status === "hired"
                            ? "bg-green-100 text-green-700"
                            : status === "rejected"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {status}
                      </span>

                      {/* ✅ ซ่อนปุ่มถ้างานปิดรับสมัครแล้ว */}
                      {!isClosed && (
                        <div className="flex gap-2">
                          {status !== "hired" && (
                            <button
                              disabled={isUpdating || !app.idVerified}
                              onClick={() => updateApplicationStatus(app, "hired")}
                              className={`text-xs px-3 py-1 rounded-lg text-white hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed ${
                                app.idVerified ? "bg-green-500" : "bg-gray-400"
                              }`}
                              title={
                                !app.idVerified 
                                  ? "ต้องรอแอดมินตรวจสอบบัตรประชาชนก่อน" 
                                  : "รับเข้าทำงาน"
                              }
                            >
                              {isUpdating && status !== "hired" 
                                ? "กำลังบันทึก..." 
                                : app.idVerified 
                                  ? "รับเข้าทำงาน" 
                                  : "รอตรวจสอบบัตร"
                              }
                            </button>
                          )}
                          {status !== "rejected" && (
                            <button
                              disabled={isUpdating}
                              onClick={() => updateApplicationStatus(app, "rejected")}
                              className="text-xs px-3 py-1 rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
                            >
                              {isUpdating && status !== "rejected" ? "กำลังบันทึก..." : "ปฏิเสธ"}
                            </button>
                          )}
                        </div>
                      )}
                      
                      {/* ✅ แสดงข้อความถ้างานปิดแล้ว */}
                      {isClosed && (
                        <p className="text-xs text-gray-500 italic">
                          งานปิดรับสมัครแล้ว
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ✅ กล่องแชทติดต่อแอดมิน (ใช้ ChatWidget) */}
      <ChatWidget
        open={adminChatOpen}
        onClose={() => setAdminChatOpen(false)}
        user={user}
        token={token}
        onUnreadChange={setAdminUnread}
      />

      {/* ✅ Modal ข้อมูลการโพสต์งาน */}
      {showPaymentInfo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 relative">
            <button
              onClick={() => setShowPaymentInfo(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-gray-800 mb-4">
              📢 ข้อมูลการโพสต์งาน
            </h2>

            <div className="space-y-4 text-sm">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">✅ โพสต์งานฟรี!</h3>
                <p className="text-blue-800">
                  คุณสามารถโพสต์งานได้ฟรีโดยไม่ต้องชำระเงิน งานของคุณจะแสดงในระบบทันที
                  และผู้สมัครงานสามารถเห็นและสมัครได้เลย
                </p>
              </div>

              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-orange-200 rounded-lg p-4">
                <h3 className="font-semibold text-orange-900 mb-2">⭐ ต้องการให้งานโดดเด่น?</h3>
                <p className="text-orange-800 mb-3">
                  หากต้องการให้งานของคุณโดดเด่นกว่างานอื่นๆ สามารถเติมเงินเพื่อใช้ฟีเจอร์พิเศษ:
                </p>
                <ul className="space-y-2 text-orange-800">
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500">•</span>
                    <span><strong>Featured:</strong> แสดงงานของคุณในตำแหน่งบนสุด</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500">•</span>
                    <span><strong>Highlighted:</strong> ไฮไลท์งานด้วยสีพิเศษ</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500">•</span>
                    <span><strong>Urgent:</strong> แสดงป้าย "รับด่วน"</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500">•</span>
                    <span><strong>Extended:</strong> ขยายระยะเวลาแสดงงาน</span>
                  </li>
                </ul>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">💡 สถานะงาน</h3>
                <div className="space-y-2 text-gray-700">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">
                      📢 ปกติ
                    </span>
                    <span>= งานฟรี แสดงตามปกติ</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-yellow-100 to-orange-100 text-orange-700 border border-orange-200">
                      ⭐ โดดเด่น
                    </span>
                    <span>= จ่ายเงินเพื่อ boost แล้ว</span>
                  </div>
                </div>
              </div>

              <div className="text-center pt-2">
                <p className="text-xs text-gray-500 mb-3">
                  ต้องการเติมเงินเพื่อ boost งาน?
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => {
                      setShowPaymentInfo(false);
                    }}
                    className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition"
                  >
                    ข้ามไปก่อน
                  </button>
                  <button
                    onClick={() => {
                      setShowPaymentInfo(false);
                      // TODO: เปิด modal เติมเงิน/boost
                    }}
                    className="px-6 py-2 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-lg font-medium hover:shadow-lg transition"
                  >
                    เติมเงินเพื่อ Boost งาน
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Service Fee Modal */}
      <ServiceFeeModal
        open={serviceFeeModalOpen}
        onClose={() => {
          setServiceFeeModalOpen(false);
          setSelectedJobForServiceFee(null);
        }}
        job={selectedJobForServiceFee}
        onServiceFeeSuccess={(serviceFeeData) => {
          // Refresh jobs list after successful service fee payment
          loadDashboard();
          setServiceFeeModalOpen(false);
          setSelectedJobForServiceFee(null);
          
          // Show success message
          alert(`🎉 ชำระค่าบริการสำเร็จ!\n\nงาน "${selectedJobForServiceFee?.title}" ได้รับการเผยแพร่แล้ว\n\nรหัสการชำระ: ${serviceFeeData.paymentId}`);
        }}
      />

      {/* ✅ Payment History Modal */}
      <PaymentHistory
        open={paymentHistoryOpen}
        onClose={() => setPaymentHistoryOpen(false)}
      />
    </div>
  );
}

/* ===== Modal แสดงรายละเอียดงาน ===== */
function JobDetailModal({ open, job, onClose }) {
  if (!open || !job) return null;

  const isClosed = !!job.isCompleted;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-lg p-6 relative">
        <button
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
          onClick={onClose}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-xl font-bold">{job.title}</h3>
          {isClosed && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
              <Lock className="w-3 h-3" />
              ปิดรับสมัครแล้ว
            </span>
          )}
        </div>
        <p className="text-sm text-gray-600 mb-1">{job.company || "บริษัทของคุณ"}</p>

        {/* ✅ ปุ่มแชร์ - ซ่อนเมื่องานปิดรับสมัคร */}
        {!isClosed && (
          <div className="flex gap-2 mb-3">
            <button
              onClick={async () => {
                const url = `${window.location.origin}/jobs/${job._id}`;
                const shareData = {
                  title: job.title,
                  text: `${job.title} - ${job.company || 'บริษัท'}`,
                  url: url
                };

                if (navigator.share) {
                  try {
                    await navigator.share(shareData);
                  } catch (err) {
                    if (err.name !== 'AbortError') {
                      navigator.clipboard.writeText(url);
                      alert("คัดลอกลิงก์แล้ว!");
                    }
                  }
                } else {
                  navigator.clipboard.writeText(url);
                  alert("คัดลอกลิงก์แล้ว!");
                }
              }}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg text-sm font-medium transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              แชร์ลิงก์ (ทั่วไป)
            </button>
          </div>
        )}

        {job.location && (
          <p className="text-sm text-gray-500 mb-2">สถานที่ทำงาน: {job.location}</p>
        )}

        {job.salary && (
          <p className="text-sm text-gray-500 mb-2">เงินเดือน: {job.salary}</p>
        )}

        <hr className="my-3" />

        <div className="text-sm text-gray-700 space-y-2">
          {job.description && (
            <div>
              <p className="font-semibold mb-1">รายละเอียดงาน</p>
              <p>{job.description}</p>
            </div>
          )}
          {job.requirements && (
            <div>
              <p className="font-semibold mb-1">คุณสมบัติ</p>
              <p>{job.requirements}</p>
            </div>
          )}
        </div>

        {/* ✅ ภาพงานเบื้อต้น */}
        <div className="mt-4">
          <p className="font-semibold text-gray-700 mb-2">🏢 ภาพงานเบื้อต้น</p>
          
          {job?.workplacePhotos && job.workplacePhotos.length > 0 ? (
            <>
              <div className="grid grid-cols-3 gap-2">
                {job.workplacePhotos.map((photo, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={photo}
                      alt={`ภาพงาน ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition"
                      onClick={() => window.open(photo, '_blank')}
                      onError={(e) => {
                        e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="%23f3f4f6"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="10">โหลดไม่ได้</text></svg>';
                      }}
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">คลิกเพื่อดูขนาดเต็ม</p>
            </>
          ) : (
            <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-4 text-center">
              <p className="text-xs text-gray-500">ไม่มีภาพงานเบื้อต้น</p>
            </div>
          )}
        </div>

        <hr className="my-4" />
        <div className="text-sm">
          <p className="font-semibold mb-2">รีวิวจากผู้สมัคร / ผู้ที่เคยเข้าทำงาน</p>
          <ReviewSection jobId={job._id} isJobOwner={true} />
        </div>
      </div>
    </div>
  );
}

/* ===== Modal แสดงรายละเอียดใบสมัคร / โปรไฟล์ผู้สมัคร ===== */
function ApplicationDetailModal({ open, app, onClose, onUpdateStatus, updatingAppId }) {
  if (!open || !app) return null;

  const status = app.status || "pending";
  const isUpdating = updatingAppId === app._id;

  const applicantPhoto = getPhotoUrl(app.applicant?.profile) || app.applicant?.avatar || "";

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-lg p-6 relative">
        <button
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
          onClick={onClose}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center">
            {applicantPhoto ? (
              <img
                src={applicantPhoto}
                alt={app.applicant?.name || "ผู้สมัคร"}
                className="w-full h-full object-cover"
              />
            ) : (
              <UserIcon className="w-6 h-6 text-gray-400" />
            )}
          </div>
          <div>
            <h3 className="text-xl font-bold mb-1">{app.applicant?.name || "ผู้สมัคร"}</h3>
            <p className="text-sm text-gray-600">สมัครงาน: {app.job?.title || "-"}</p>
          </div>
        </div>

        <p className="text-xs text-gray-400 mb-3">
          ส่งเมื่อ: {app.createdAt ? new Date(app.createdAt).toLocaleString('th-TH', {
            year: 'numeric',
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }) : "-"}
        </p>

        <span
          className={`inline-block text-xs px-2 py-1 rounded-full mb-3 ${
            status === "hired"
              ? "bg-green-100 text-green-700"
              : status === "rejected"
              ? "bg-red-100 text-red-700"
              : "bg-yellow-100 text-yellow-700"
          }`}
        >
          สถานะ: {status}
        </span>

        {/* ✅ แสดงสถานะการยืนยันบัตรประชาชน */}
        <div className="mb-3">
          <span className="text-xs text-gray-600 mr-2">การยืนยันบัตรประชาชน:</span>
          {app.idVerified ? (
            <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
              ✅ ยืนยันแล้วโดยแอดมิน
            </span>
          ) : app.idCardPath ? (
            <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">
              ⏳ รอแอดมินตรวจสอบ
            </span>
          ) : (
            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
              ❌ ยังไม่อัปโหลดบัตร
            </span>
          )}
        </div>

        {/* ✅ คำเตือนถ้าบัตรยังไม่ได้รับการอนุมัติ */}
        {!app.idVerified && (
          <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-800">
              ⚠️ <strong>หมายเหตุ:</strong> ไม่สามารถรับเข้าทำงานได้จนกว่าแอดมินจะตรวจสอบและอนุมัติบัตรประชาชน
            </p>
          </div>
        )}

        <div className="space-y-3 text-sm text-gray-700">
          {/* ✅ ข้อมูลโปรไฟล์ผู้สมัคร */}
          {app.applicant?.profile && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
              <p className="font-semibold text-blue-800 mb-2">📋 ข้อมูลโปรไฟล์</p>
              
              {app.applicant.profile.fullName && (
                <div className="mb-2">
                  <span className="text-xs text-blue-600 font-medium">ชื่อ-นามสกุล:</span>
                  <p className="text-sm text-blue-800">{app.applicant.profile.fullName}</p>
                </div>
              )}
              
              {app.applicant.profile.headline && (
                <div className="mb-2">
                  <span className="text-xs text-blue-600 font-medium">ตำแหน่งที่ต้องการ:</span>
                  <p className="text-sm text-blue-800">{app.applicant.profile.headline}</p>
                </div>
              )}
              
              {app.applicant.profile.location && (
                <div className="mb-2">
                  <span className="text-xs text-blue-600 font-medium">ที่อยู่/พื้นที่ทำงาน:</span>
                  <p className="text-sm text-blue-800">{app.applicant.profile.location}</p>
                </div>
              )}
              
              {app.applicant.profile.skillsText && (
                <div className="mb-2">
                  <span className="text-xs text-blue-600 font-medium">ทักษะ:</span>
                  <p className="text-sm text-blue-800 whitespace-pre-line">{app.applicant.profile.skillsText}</p>
                </div>
              )}
              
              {app.applicant.profile.experience && (
                <div className="mb-2">
                  <span className="text-xs text-blue-600 font-medium">ประสบการณ์:</span>
                  <p className="text-sm text-blue-800 whitespace-pre-line max-h-32 overflow-y-auto">{app.applicant.profile.experience}</p>
                </div>
              )}
            </div>
          )}

          {app.coverLetter && (
            <div>
              <p className="font-semibold mb-1">Cover Letter</p>
              <p className="whitespace-pre-line">{app.coverLetter}</p>
            </div>
          )}

          {app.resumeUrl && (
            <div>
              <p className="font-semibold mb-1">เรซูเม่</p>
              <a
                href={app.resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 text-sm hover:underline"
              >
                เปิดเรซูเม่ในแท็บใหม่
              </a>
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          {status !== "hired" && (
            <button
              disabled={isUpdating || !app.idVerified}
              onClick={() => onUpdateStatus(app, "hired")}
              className={`text-xs px-3 py-2 rounded-lg text-white hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed ${
                app.idVerified ? "bg-green-500" : "bg-gray-400"
              }`}
              title={
                !app.idVerified 
                  ? "ต้องรอแอดมินตรวจสอบบัตรประชาชนก่อน" 
                  : "รับเข้าทำงาน"
              }
            >
              {isUpdating && status !== "hired" 
                ? "กำลังบันทึก..." 
                : app.idVerified 
                  ? "รับเข้าทำงาน" 
                  : "รอตรวจสอบบัตร"
              }
            </button>
          )}
          {status !== "rejected" && (
            <button
              disabled={isUpdating}
              onClick={() => onUpdateStatus(app, "rejected")}
              className="text-xs px-3 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
            >
              {isUpdating && status !== "rejected" ? "กำลังบันทึก..." : "ปฏิเสธ"}
            </button>
          )}
          <button
            onClick={onClose}
            className="text-xs px-3 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===== Modal แชทกับผู้สมัคร (มีปุ่มติดต่อแอดมินข้างใน) ===== */
function ChatModal({ open, app, user, onClose, onContactAdmin }) {

  const [thread, setThread] = useState(null);

  const [messages, setMessages] = useState([]);

  const [newMessage, setNewMessage] = useState("");

  const [loading, setLoading] = useState(false);

  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef(null);



  // Load or create thread when modal opens

  useEffect(() => {

    if (open && (app?.job?._id || app?.jobId) && (app?.applicant?._id || app?.applicant)) {

      initializeChat();

    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, app]);



  // Auto scroll to bottom

  useEffect(() => {

    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  }, [messages]);



  const initializeChat = async () => {

    setLoading(true);

    try {

      // Import chat API

      const { ensureThread, fetchMessages } = await import("./api/chat");

      

      // ✅ แก้ไข: ใช้ app.job._id แทน app.jobId

      const jobId = app.job?._id || app.jobId;

      const applicantId = app.applicant?._id || app.applicant;

      

      if (!jobId || !applicantId) {

        throw new Error("ไม่พบข้อมูลงานหรือผู้สมัคร");

      }

      

      // Create or get existing thread

      const threadData = await ensureThread({

        jobId,

        participantId: applicantId,

        token: localStorage.getItem("token")

      });

      

      setThread(threadData);

      

      // Load messages

      if (threadData._id) {

        const msgs = await fetchMessages({

          threadId: threadData._id,

          token: localStorage.getItem("token")

        });

        setMessages(msgs || []);

      }

    } catch (err) {
      
      if (err.message && err.message.includes("ระยะทดลอง")) {
        setThread({ trialExpired: true });
      } else {
        alert("ไม่สามารถเริ่มการแชทได้: " + err.message);
      }
    } finally {

      setLoading(false);

    }

  };



  const handleSendMessage = async (e) => {

    e.preventDefault();

    if (!newMessage.trim() || sending) return;

    

    // ✅ ถ้ายังไม่มี thread ให้ลอง initialize ก่อน

    if (!thread?._id) {
      await initializeChat();
      return;
    }

    setSending(true);

    try {

      const { sendMessage } = await import("./api/chat");

      

      const result = await sendMessage({

        threadId: thread._id,

        text: newMessage.trim(),

        token: localStorage.getItem("token")

      });

      

      // Add new message to list

      setMessages([...messages, result]);
      setNewMessage("");
    } catch (err) {
      alert("ส่งข้อความไม่สำเร็จ: " + err.message);
    } finally {

      setSending(false);

    }

  };



  if (!open || !app) return null;



  return (

    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">

      <div className="bg-white w-full max-w-md rounded-2xl shadow-lg flex flex-col max-h-[80vh]">

        {/* Header */}

        <div className="flex items-center justify-between p-4 border-b">

          <div className="flex items-center gap-2">

            <MessageCircle className="w-5 h-5 text-purple-600" />

            <h3 className="font-bold">แชทกับ {app.applicant?.name || "ผู้สมัคร"}</h3>

          </div>

          <div className="flex items-center gap-2">

            <button

              onClick={onContactAdmin}

              className="text-xs px-3 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"

            >

              ติดต่อแอดมิน

            </button>

            <button

              onClick={onClose}

              className="text-gray-400 hover:text-gray-600"

            >

              <X className="w-5 h-5" />

            </button>

          </div>

        </div>



        {/* Messages */}

        <div className="flex-1 overflow-y-auto p-4 space-y-3">

          {/* ✅ Trial Expired Warning */}

          {thread?.trialExpired && (

            <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4 text-center">

              <Lock className="w-12 h-12 text-orange-500 mx-auto mb-2" />

              <h4 className="font-bold text-orange-900 mb-1">ระยะทดลองใช้ฟรี 24 ชม. หมดแล้ว</h4>

              <p className="text-sm text-orange-700 mb-3">

                กรุณาชำระค่าบริการเพื่อแชทต่อกับผู้สมัคร

              </p>

              <button

                onClick={() => {

                  // เปิด ServiceFeeModal

                  onClose();

                  // TODO: เปิด payment modal

                }}

                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium"

              >

                ชำระค่าบริการตอนนี้

              </button>

            </div>

          )}

          

          {/* ✅ Trial Warning (เหลือเวลาน้อยกว่า 6 ชม.) */}

          {thread?.trialInfo && thread.trialInfo.isInTrial && thread.trialInfo.timeRemaining < 6 * 60 * 60 * 1000 && (

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">

              <p className="text-xs text-yellow-800">

                ⚠️ ระยะทดลองใช้ฟรีจะหมดในอีก {Math.floor(thread.trialInfo.timeRemaining / (60 * 60 * 1000))} ชม.

              </p>

              <p className="text-xs text-yellow-700 mt-1">

                ชำระค่าบริการเพื่อแชทต่อได้ไม่จำกัด

              </p>

            </div>

          )}



          {loading ? (

            <div className="text-center py-8">

              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>

              <p className="text-sm text-gray-500 mt-2">กำลังโหลดข้อความ...</p>

            </div>

          ) : messages.length === 0 && !thread?.trialExpired ? (

            <div className="text-center py-8">

              <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />

              <p className="text-sm text-gray-500">ยังไม่มีข้อความ</p>

              <p className="text-xs text-gray-400 mt-1">เริ่มต้นการสนทนาได้เลย</p>

            </div>

          ) : (

            messages.map((msg, idx) => {

              const isMe = msg.senderId === user._id || msg.senderId?._id === user._id;

              return (

                <div key={idx} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>

                  <div className={`max-w-[70%] rounded-lg px-3 py-2 ${

                    isMe 

                      ? "bg-purple-600 text-white" 

                      : "bg-gray-100 text-gray-800"

                  }`}>

                    <p className="text-sm">{msg.text}</p>

                    <p className={`text-xs mt-1 ${isMe ? "text-purple-200" : "text-gray-500"}`}>

                      {new Date(msg.createdAt).toLocaleTimeString('th-TH', { 

                        hour: '2-digit', 

                        minute: '2-digit' 

                      })}

                    </p>

                  </div>

                </div>

              );

            })

          )}

          <div ref={messagesEndRef} />

        </div>



        {/* Input */}

        {!thread?.trialExpired && (

          <form onSubmit={handleSendMessage} className="p-4 border-t">

            <div className="flex gap-2">

              <input

                type="text"

                value={newMessage}

                onChange={(e) => setNewMessage(e.target.value)}

                placeholder="พิมพ์ข้อความ..."

                className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"

                disabled={sending || loading}

              />

              <button

                type="submit"

                disabled={!newMessage.trim() || sending || loading}

                className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"

              >

                {sending ? "..." : "ส่ง"}

            </button>

          </div>

        </form>

        )}

      </div>

    </div>

  );

}

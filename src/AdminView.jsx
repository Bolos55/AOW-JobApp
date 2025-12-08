// src/AdminView.jsx
import React, { useState, useEffect } from "react";
import {
  User as UserIcon,
  Users,
  Briefcase,
  FileText,
  BarChart3,
  Eye,
  Trash2,
  ShieldCheck,
  Search,
  RefreshCw,
  Filter,
  CheckCircle,
  AlertTriangle, // ✅ เพิ่ม
} from "lucide-react";
import { useNavigate } from "react-router-dom"; // ✅ ใช้เปลี่ยนหน้า
import { API_BASE, authHeader } from "./api";
import ChatWidget from "./components/ChatWidget";
import ChatDockButton from "./components/ChatDockButton";

export default function AdminView({ user, onLogout }) {
  const navigate = useNavigate(); // ✅ ใช้เปลี่ยนหน้าไป /chats

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalJobs: 0,
    totalApplications: 0,
    activeJobs: 0,
  });
  const [users, setUsers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]); // ✅ ใบสมัคร
  const [updatingUserId, setUpdatingUserId] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null); // ✅ modal job detail
  const [loadingProfile, setLoadingProfile] = useState(false); // ✅ สถานะโหลดโปรไฟล์
  const [selectedUserProfile, setSelectedUserProfile] = useState(null); // ✅ modal โปรไฟล์

  const [loadingAll, setLoadingAll] = useState(false); // ✅ สถานะโหลดรวมทั้งหน้า
  const [loadError, setLoadError] = useState(""); // ✅ ข้อความ error รวม

  // ✅ ช่องค้นหางานในหน้าแอดมิน
  const [jobSearch, setJobSearch] = useState("");
  // ✅ ค้นหาผู้ใช้ + filter ตาม role
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all"); // all | jobseeker | employer | admin
  // ✅ filter ใบสมัครตามสถานะยืนยัน
  const [appFilter, setAppFilter] = useState("all"); // all | pending | verified

  // ✅ chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const token = localStorage.getItem("token");

  const isAdmin = user?.role === "admin"; // ✅ ใช้กันคนที่ไม่ใช่ admin

  // ===== ดึงข้อมูลทั้งหมด (ใช้ทั้งตอนโหลดครั้งแรก + กดรีเฟรช) =====
  const loadAllData = async () => {
    setLoadingAll(true); // ✅ เริ่มโหลด
    setLoadError(""); // ✅ เคลียร์ error เดิม

    try {
      // สถิติ
      const statsRes = await fetch(`${API_BASE}/api/admin/stats`, {
        headers: authHeader(),
      });
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }

      // ผู้ใช้ทั้งหมด
      const usersRes = await fetch(`${API_BASE}/api/admin/users`, {
        headers: authHeader(),
      });
      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(Array.isArray(data) ? data : []);
      }

      // งานทั้งหมด
      const jobsRes = await fetch(`${API_BASE}/api/admin/jobs`, {
        headers: authHeader(),
      });
      if (jobsRes.ok) {
        const data = await jobsRes.json();
        setJobs(Array.isArray(data) ? data : []);
      }

      // ใบสมัครทั้งหมด
      const appsRes = await fetch(`${API_BASE}/api/admin/applications`, {
        headers: authHeader(),
      });
      if (appsRes.ok) {
        const data = await appsRes.json();
        setApplications(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("loadAllData error:", e);
      setLoadError("โหลดข้อมูลแอดมินไม่สำเร็จ กรุณาลองกดรีเฟรชอีกครั้ง");
    } finally {
      setLoadingAll(false); // ✅ จบโหลด
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // ===== งานที่ผ่านการกรองจากช่องค้นหา =====
  const filteredJobs = jobs.filter((job) => {
    const q = jobSearch.trim().toLowerCase();
    if (!q) return true;

    return (
      (job.title || "").toLowerCase().includes(q) ||
      (job.company || "").toLowerCase().includes(q) ||
      (job.createdBy?.name || "").toLowerCase().includes(q)
    );
  });

  // ===== ผู้ใช้ที่ผ่านการกรอง (ค้นหาชื่อ/อีเมล + filter role) =====
  const filteredUsers = users.filter((u) => {
    const q = userSearch.trim().toLowerCase();
    const matchText =
      !q ||
      (u.name || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q);
    const matchRole = userRoleFilter === "all" || u.role === userRoleFilter;
    return matchText && matchRole;
  });

  // จำนวนผู้ใช้แต่ละ role (ไว้แสดงสถิติมุมบน)
  const roleCounts = users.reduce(
    (acc, u) => {
      if (u.role === "admin") acc.admin += 1;
      else if (u.role === "employer") acc.employer += 1;
      else acc.jobseeker += 1;
      return acc;
    },
    { admin: 0, employer: 0, jobseeker: 0 }
  );

  // ===== ใบสมัครหลัง filter =====
  const filteredApplications = applications.filter((app) => {
    if (appFilter === "all") return true;
    if (appFilter === "verified") return !!app.idVerified;
    if (appFilter === "pending") return !app.idVerified;
    return true;
  });

  const deleteJob = async (jobId) => {
    if (!window.confirm("ลบงานนี้ใช่ไหม?")) return;
    try {
      await fetch(`${API_BASE}/api/admin/jobs/${jobId}`, {
        method: "DELETE",
        headers: authHeader(),
      });
      setJobs((prev) => prev.filter((j) => j._id !== jobId));
    } catch {
      alert("ลบไม่สำเร็จ");
    }
  };

  // ✅ เปลี่ยน role + บันทึกว่าใครเป็นคนตั้ง
  const changeUserRole = async (targetUser, role) => {
    if (!targetUser || !targetUser._id) return;

    const myId = user?._id || user?.id || user?.userId;
    const isMe = targetUser._id === myId;
    if (isMe && role !== "admin") {
      alert(
        "ป้องกันความปลอดภัย: ไม่อนุญาตให้ลดสิทธิ์ตัวเองออกจาก admin ผ่านหน้านี้"
      );
      return;
    }

    const confirmText =
      role === "admin"
        ? `ยืนยันตั้ง "${targetUser.name}" เป็นผู้ดูแลระบบ (admin) ?`
        : `ยืนยันเปลี่ยนสิทธิ์ของ "${targetUser.name}" เป็น "${role}" ?`;

    if (!window.confirm(confirmText)) return;

    try {
      setUpdatingUserId(targetUser._id);

      const res = await fetch(
        `${API_BASE}/api/admin/users/${targetUser._id}/role`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...authHeader(),
          },
          body: JSON.stringify({ role }),
        }
      );

      let data;
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (!res.ok) {
        throw new Error(data.message || "เปลี่ยนสิทธิ์ไม่สำเร็จ");
      }

      setUsers((prev) => prev.map((u) => (u._id === data._id ? data : u)));

      alert("อัปเดตสิทธิ์เรียบร้อยแล้ว");
    } catch (e) {
      console.error("changeUserRole error:", e);
      alert(e.message || "เปลี่ยนสิทธิ์ไม่สำเร็จ");
    } finally {
      setUpdatingUserId(null);
    }
  };

  // ✅ ดึงโปรไฟล์ผู้ใช้แล้วเปิดป็อปอัพ
  const openUserProfile = async (u) => {
    if (!u || !u._id) return;
    try {
      setLoadingProfile(true);
      const res = await fetch(`${API_BASE}/api/profile/${u._id}`, {
        headers: authHeader(),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "ดึงโปรไฟล์ไม่สำเร็จ");
      }

      setSelectedUserProfile(data);
    } catch (e) {
      console.error("openUserProfile error:", e);
      alert(e.message || "ดึงโปรไฟล์ไม่สำเร็จ");
    } finally {
      setLoadingProfile(false);
    }
  };

  // ✅ ดูรูปบัตรประชาชน
  const openIdCard = (app) => {
    if (!app.idCardPath) {
      alert("ยังไม่มีรูปบัตรประชาชนในใบสมัครนี้");
      return;
    }
    const base = API_BASE.replace(/\/api\/?$/, "");
    const url = `${base}/${app.idCardPath}`;
    window.open(url, "_blank");
  };

  // ✅ ยืนยัน / ยกเลิกยืนยันบัตร ปชช.
  const toggleIdVerify = async (app, verified) => {
    const msg = verified
      ? `ยืนยันตัวตนผู้สมัคร "${app.applicantName}" ใช่ไหม?`
      : `ยกเลิกการยืนยัน "${app.applicantName}" ใช่ไหม?`;

    if (!window.confirm(msg)) return;

    try {
      const res = await fetch(
        `${API_BASE}/api/admin/applications/${app._id}/verify`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...authHeader(),
          },
          body: JSON.stringify({ verified }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "อัปเดตการยืนยันไม่สำเร็จ");
      }

      setApplications((prev) =>
        prev.map((a) => (a._id === data._id ? data : a))
      );
    } catch (e) {
      console.error("toggleIdVerify error:", e);
      alert(e.message || "อัปเดตการยืนยันไม่สำเร็จ");
    }
  };

  // แสดงข้อความว่าใครตั้งสิทธิ์ + เมื่อไหร่
  const renderPromoteInfo = (u) => {
    if (!u || !u.promotedAt) return null;

    const promotedAt = new Date(u.promotedAt).toLocaleString();
    let who = "ระบบ";

    if (u.promotedBy && typeof u.promotedBy === "object") {
      who = u.promotedBy.name || u.promotedBy.email || "ระบบ";
    }

    return (
      <p className="text-[11px] text-gray-400 mt-0.5">
        ตั้งสิทธิ์โดย {who} เมื่อ {promotedAt}
      </p>
    );
  };

  // ✅ กันคนที่ไม่ใช่ admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold mb-2">ไม่มีสิทธิ์เข้าหน้านี้</h2>
          <p className="text-sm text-gray-600 mb-4">
            หน้านี้สำหรับผู้ดูแลระบบ (Admin) เท่านั้น
          </p>
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm hover:bg-blue-700"
          >
            กลับหน้าแรก
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 pb-16">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold">
                ⚙️ สวัสดี, Admin {user?.name || ""}
              </h1>
              <p className="text-sm opacity-90">
                แอดมิน - จัดการระบบทั้งหมด และกำหนดสิทธิ์ผู้ใช้งาน
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* ปุ่มไปกล่องแชทใหญ่ */}
              <button
                onClick={() => navigate("/chats")}
                className="bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg flex items-center gap-2 text-sm"
              >
                💬 กล่องแชท
                {unread > 0 && (
                  <span className="ml-1 text-xs bg-red-500 text-white rounded-full px-2 py-[1px]">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </button>

              <button
                onClick={loadAllData}
                className="bg:white/10 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg flex items-center gap-2 text-sm"
              >
                <RefreshCw
                  className={`w-4 h-4 ${loadingAll ? "animate-spin" : ""}`}
                />
                {loadingAll ? "กำลังโหลด..." : "รีเฟรชข้อมูล"}
              </button>
              <button
                onClick={onLogout}
                className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <UserIcon className="w-4 h-4" />
                ออกจากระบบ
              </button>
            </div>
          </div>

          {/* ✅ แสดง error รวม ถ้ามีปัญหาดึงข้อมูล */}
          {loadError && (
            <div className="mt-2 bg-red-600/20 border border-red-300/70 text-sm px-4 py-2 rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span>{loadError}</span>
            </div>
          )}
        </div>

        <div className="p-6 space-y-6">
          {/* Dashboard Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border">
              <Users className="w-8 h-8 text-blue-600 mb-2" />
              <p className="text-2xl font-bold">{stats.totalUsers}</p>
              <p className="text-sm text-gray-600">ผู้ใช้ทั้งหมด</p>
              <p className="text-[11px] text-gray-400 mt-1">
                👤 Jobseeker: {roleCounts.jobseeker} | 🏢 Employer:{" "}
                {roleCounts.employer} | ⚙️ Admin: {roleCounts.admin}
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <Briefcase className="w-8 h-8 text-green-600 mb-2" />
              <p className="text-2xl font-bold">{stats.totalJobs}</p>
              <p className="text-sm text-gray-600">งานทั้งหมด</p>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <FileText className="w-8 h-8 text-purple-600 mb-2" />
              <p className="text-2xl font-bold">{stats.totalApplications}</p>
              <p className="text-sm text-gray-600">ใบสมัครทั้งหมด</p>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <BarChart3 className="w-8 h-8 text-orange-600 mb-2" />
              <p className="text-2xl font-bold">{stats.activeJobs}</p>
              <p className="text-sm text-gray-600">งานที่เปิดอยู่</p>
            </div>
          </div>

          {/* ผู้ใช้ทั้งหมด */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">ผู้ใช้ทั้งหมด</h2>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>
                    แอดมินสามารถเปลี่ยน role และระบบจะบันทึกว่าใครเป็นคนตั้ง
                  </span>
                </div>
              </div>

              {/* ค้นหา + filter role */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-2 top-2.5" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="ค้นหาชื่อ / อีเมล"
                    className="text-sm pl-8 pr-3 py-2 border rounded-lg w-56 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <Filter className="w-3 h-3 text-gray-500" />
                  <button
                    type="button"
                    onClick={() => setUserRoleFilter("all")}
                    className={`px-2 py-1 rounded-full border ${
                      userRoleFilter === "all"
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-600 border-gray-200"
                    }`}
                  >
                    ทั้งหมด
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserRoleFilter("jobseeker")}
                    className={`px-2 py-1 rounded-full border text-[11px] ${
                      userRoleFilter === "jobseeker"
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-600 border-gray-200"
                    }`}
                  >
                    Jobseeker
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserRoleFilter("employer")}
                    className={`px-2 py-1 rounded-full border text-[11px] ${
                      userRoleFilter === "employer"
                        ? "bg-purple-600 text-white border-purple-600"
                        : "bg-white text-gray-600 border-gray-200"
                    }`}
                  >
                    Employer
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserRoleFilter("admin")}
                    className={`px-2 py-1 rounded-full border text-[11px] ${
                      userRoleFilter === "admin"
                        ? "bg-red-600 text-white border-red-600"
                        : "bg-white text-gray-600 border-gray-200"
                    }`}
                  >
                    Admin
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-semibold">
                      ชื่อ
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-semibold">
                      อีเมล
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-semibold">
                      Role
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-semibold">
                      ข้อมูลการตั้งสิทธิ์
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-semibold">
                      จัดการสิทธิ์
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => {
                    const myId = user?._id || user?.id || user?.userId;
                    const isMe = u._id === myId;

                    return (
                      <tr key={u._id} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-3">{u.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {u.email}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              u.role === "admin"
                                ? "bg-red-100 text-red-700"
                                : u.role === "employer"
                                ? "bg-purple-100 text-purple-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {renderPromoteInfo(u)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex flex-wrap gap-2">
                            {/* ✅ ปุ่มดูโปรไฟล์แบบป็อปอัพ */}
                            <button
                              type="button"
                              onClick={() => openUserProfile(u)}
                              className="px-2 py-1 text-xs rounded border border-emerald-200 text-emerald-700 hover:bg-emerald-50 flex items-center gap-1"
                            >
                              <UserIcon className="w-3 h-3" />
                              ดูโปรไฟล์
                            </button>

                            {/* ปุ่มเปลี่ยน role */}
                            <button
                              type="button"
                              disabled={updatingUserId === u._id}
                              onClick={() => changeUserRole(u, "jobseeker")}
                              className="px-2 py-1 text-xs rounded border border-blue-200 text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                            >
                              ผู้หางาน
                            </button>
                            <button
                              type="button"
                              disabled={updatingUserId === u._id}
                              onClick={() => changeUserRole(u, "employer")}
                              className="px-2 py-1 text-xs rounded border border-purple-200 text-purple-700 hover:bg-purple-50 disabled:opacity-50"
                            >
                              ผู้ประกาศงาน
                            </button>
                            <button
                              type="button"
                              disabled={updatingUserId === u._id}
                              onClick={() => changeUserRole(u, "admin")}
                              className="px-2 py-1 text-xs rounded border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
                            >
                              ตั้งเป็น Admin
                            </button>
                            {isMe && (
                              <span className="text-[10px] text-gray-400">
                                (บัญชีของคุณเอง)
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-4 text-center text-xs text-gray-400"
                      >
                        ไม่พบผู้ใช้ตามเงื่อนไขที่เลือก
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* งานทั้งหมด + ช่องค้นหา */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold">งานทั้งหมด (จัดการ)</h2>

              {/* ✅ ช่องค้นหางาน */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-2 top-2.5" />
                  <input
                    type="text"
                    value={jobSearch}
                    onChange={(e) => setJobSearch(e.target.value)}
                    placeholder="ค้นหาตำแหน่ง / บริษัท / ผู้โพสต์"
                    className="text-sm pl-8 pr-3 py-2 border rounded-lg w-64 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {jobSearch && (
                  <button
                    type="button"
                    onClick={() => setJobSearch("")}
                    className="text-xs px-2 py-1 border rounded-lg text-gray-600 hover:bg-gray-100"
                  >
                    ล้าง
                  </button>
                )}
              </div>
            </div>

            <p className="text-xs text-gray-500 mb-3">
              พบ {filteredJobs.length} งาน จากทั้งหมด {jobs.length} งาน
            </p>

            <div className="space-y-2">
              {filteredJobs.map((job) => (
                <div
                  key={job._id}
                  className="bg-white p-4 rounded-lg border flex justify-between items-center hover:shadow-md transition"
                >
                  <div>
                    <h3 className="font-bold">{job.title}</h3>
                    <p className="text-sm text-gray-600">{job.company}</p>
                    <p className="text-xs text-gray-400">
                      โพสต์โดย: {job.createdBy?.name || "Unknown"} (
                      {job.createdBy?.email || "-"})
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedJob(job)}
                      className="text-blue-600 hover:bg-blue-50 p-2 rounded"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteJob(job._id)}
                      className="text-red-600 hover:bg-red-50 p-2 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {filteredJobs.length === 0 && (
                <p className="text-center text-gray-400 text-sm py-6">
                  {jobSearch ? "ไม่พบงานที่ตรงกับคำค้นหา" : "ยังไม่มีงานในระบบ"}
                </p>
              )}
            </div>
          </div>

          {/* ใบสมัคร + ยืนยันบัตรประชาชน */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold">
                ใบสมัครงาน & การยืนยันบัตรประชาชน
              </h2>

              <div className="flex items-center gap-2 text-xs">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <button
                  type="button"
                  onClick={() => setAppFilter("all")}
                  className={`px-2 py-1 rounded-full border ${
                    appFilter === "all"
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-600 border-gray-200"
                  }`}
                >
                  ทั้งหมด ({applications.length})
                </button>
                <button
                  type="button"
                  onClick={() => setAppFilter("pending")}
                  className={`px-2 py-1 rounded-full border ${
                    appFilter === "pending"
                      ? "bg-yellow-500 text-white border-yellow-500"
                      : "bg-white text-gray-600 border-gray-200"
                  }`}
                >
                  รอตรวจสอบ (
                  {applications.filter((a) => !a.idVerified).length})
                </button>
                <button
                  type="button"
                  onClick={() => setAppFilter("verified")}
                  className={`px-2 py-1 rounded-full border ${
                    appFilter === "verified"
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-white text-gray-600 border-gray-200"
                  }`}
                >
                  ยืนยันแล้ว (
                  {applications.filter((a) => a.idVerified).length})
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">ผู้สมัคร</th>
                    <th className="px-4 py-2 text-left">อีเมล</th>
                    <th className="px-4 py-2 text-left">ชื่องาน</th>
                    <th className="px-4 py-2 text-left">บัตรประชาชน</th>
                    <th className="px-4 py-2 text-left">สถานะยืนยัน</th>
                    <th className="px-4 py-2 text-left">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApplications.map((app) => (
                    <tr key={app._id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-2">{app.applicantName}</td>
                      <td className="px-4 py-2 text-gray-600">
                        {app.applicantEmail}
                      </td>
                      <td className="px-4 py-2">
                        {app.jobTitle || app.job?.title}
                      </td>
                      <td className="px-4 py-2">
                        {app.idCardPath ? (
                          <button
                            type="button"
                            onClick={() => openIdCard(app)}
                            className="px-2 py-1 rounded border text-xs text-blue-700 border-blue-200 hover:bg-blue-50"
                          >
                            ดูรูปบัตร
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">
                            ยังไม่อัปโหลด
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {app.idVerified ? (
                          <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
                            ยืนยันแล้ว
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">
                            รอตรวจสอบ
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex gap-2">
                          {!app.idVerified ? (
                            <button
                              type="button"
                              onClick={() => toggleIdVerify(app, true)}
                              className="px-2 py-1 text-xs rounded border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                              disabled={!app.idCardPath}
                            >
                              ยืนยันตัวตน
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => toggleIdVerify(app, false)}
                              className="px-2 py-1 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
                            >
                              ยกเลิกยืนยัน
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredApplications.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-4 text-center text-xs text-gray-400"
                      >
                        ไม่พบใบสมัครตามเงื่อนไขที่เลือก
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Modal แสดงโปรไฟล์ผู้ใช้ */}
      {selectedUserProfile && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
            <button
              type="button"
              onClick={() => setSelectedUserProfile(null)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>

            <h2 className="text-xl font-bold mb-1">โปรไฟล์ผู้ใช้</h2>
            <p className="text-sm text-gray-500 mb-4">
              {selectedUserProfile.email}
            </p>

            <div className="space-y-2 text-sm">
              <div>
                <p className="font-semibold text-gray-700">ชื่อ - นามสกุล</p>
                <p className="text-gray-700">
                  {selectedUserProfile.profile?.fullName ||
                    selectedUserProfile.name ||
                    "-"}
                </p>
              </div>

              <div>
                <p className="font-semibold text-gray-700">
                  ตำแหน่ง / หัวข้อแนะนำตัว
                </p>
                <p className="text-gray-700">
                  {selectedUserProfile.profile?.headline || "-"}
                </p>
              </div>

              <div>
                <p className="font-semibold text-gray-700">
                  ที่อยู่ / พื้นที่ทำงาน
                </p>
                <p className="text-gray-700">
                  {selectedUserProfile.profile?.location || "-"}
                </p>
              </div>

              <div>
                <p className="font-semibold text-gray-700">ทักษะ</p>
                <p className="text-gray-700 whitespace-pre-line">
                  {selectedUserProfile.profile?.skillsText || "-"}
                </p>
              </div>

              <div>
                <p className="font-semibold text-gray-700">ประสบการณ์</p>
                <p className="text-gray-700 whitespace-pre-line max-h-40 overflow-y-auto">
                  {selectedUserProfile.profile?.experience || "-"}
                </p>
              </div>

              {selectedUserProfile.profile?.resumeUrl && (
                <div className="pt-2">
                  <a
                    href={`${API_BASE.replace(
                      /\/api\/?$/,
                      ""
                    )}/${selectedUserProfile.profile.resumeUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-blue-700 hover:underline"
                  >
                    📄 เปิดเรซูเม่
                  </a>
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedUserProfile(null)}
                className="px-4 py-2 rounded-xl border text-gray-700 text-sm"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal แสดงรายละเอียดงาน */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 relative">
            <button
              type="button"
              onClick={() => setSelectedJob(null)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>

            <h2 className="text-xl font-bold mb-2">{selectedJob.title}</h2>
            <p className="text-sm text-gray-600 mb-1">
              {selectedJob.company}
            </p>
            <p className="text-xs text-gray-500 mb-3">
              โพสต์โดย: {selectedJob.createdBy?.name || "Unknown"} (
              {selectedJob.createdBy?.email || "-"})
            </p>

            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              <div>
                <p className="font-semibold text-gray-700">ประเภทงาน</p>
                <p className="text-gray-600">{selectedJob.type}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">หมวดหมู่</p>
                <p className="text-gray-600">{selectedJob.category}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">สถานที่ทำงาน</p>
                <p className="text-gray-600">{selectedJob.location}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">เงินเดือน</p>
                <p className="text-gray-600">
                  {selectedJob.salary || "ตามตกลง"}
                </p>
              </div>
            </div>

            <div className="mb-4">
              <p className="font-semibold text-gray-700 mb-1">
                รายละเอียดงาน
              </p>
              <p className="text-sm text-gray-700 whitespace-pre-line max-h-60 overflow-y-auto">
                {selectedJob.description}
              </p>
            </div>

            {selectedJob.skills && selectedJob.skills.length > 0 && (
              <div className="mb-4">
                <p className="font-semibold text-gray-700 mb-1">
                  ทักษะที่ต้องการ
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedJob.skills.map((s) => (
                    <span
                      key={s}
                      className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedJob(null)}
                className="px-4 py-2 rounded-xl border text-gray-700 text-sm"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ปุ่ม + widget แชท */}
      <ChatWidget
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        user={user}
        token={token}
        onUnreadChange={setUnread}
      />
      <ChatDockButton
        open={chatOpen}
        unread={unread}
        onToggle={() => setChatOpen((v) => !v)}
      />
    </>
  );
}

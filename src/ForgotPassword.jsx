// src/EmployerView.jsx
import React, { useState, useEffect } from "react";
import {
  User as UserIcon,
  Building2,
  Users,
  CheckCircle2,
  Briefcase,
  Plus,            // ✅ เพิ่มไอคอนปุ่มประกาศงานใหม่
} from "lucide-react";
import { API_BASE, authHeader } from "./api";
import AddJobModal from "./components/AddJobModal";   // ✅ ใช้ตัวเดียวกับหน้า JobSearchHome

export default function EmployerView({ user, onLogout }) {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalJobs: 0,
    totalApplications: 0,
    totalAccepted: 0,
  });
  const [jobs, setJobs] = useState([]);
  const [latestApplications, setLatestApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✅ state สำหรับเปิด/ปิดฟอร์มเพิ่มงาน
  const [showAddForm, setShowAddForm] = useState(false);

  // ✅ token ใช้ส่งให้ AddJobModal
  const token = localStorage.getItem("token") || "";

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/employer/dashboard`, {
          headers: authHeader(),
        });

        let data = {};
        try {
          data = await res.json();
        } catch {
          data = {};
        }

        if (!res.ok) {
          console.error("employer dashboard error:", data);
          return;
        }

        setStats(data.stats || {});
        setJobs(Array.isArray(data.jobs) ? data.jobs : []);
        setLatestApplications(
          Array.isArray(data.latestApplications)
            ? data.latestApplications
            : []
        );
      } catch (e) {
        console.error("loadDashboard error:", e);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const formatDateTime = (value) => {
    if (!value) return "-";
    return new Date(value).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header ไล่สีชมพู-ม่วง */}
      <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-fuchsia-500 text-white p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="w-6 h-6" />
              <span>สวัสดี, {user?.name || "นายจ้าง"}</span>
            </h1>
            <p className="text-sm opacity-90">
              นายจ้าง – จัดการงานที่โพสต์และผู้สมัครของคุณ
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* ✅ ปุ่มประกาศงานใหม่ ใช้ AddJobModal */}
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              ประกาศงานใหม่
            </button>

            <button
              onClick={onLogout}
              className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg flex items-center gap-2 text-sm"
            >
              <UserIcon className="w-4 h-4" />
              ออกจากระบบ
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* การ์ดสรุปสถิติ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-sm border p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">งานที่โพสต์</p>
              <p className="text-2xl font-bold">
                {stats.totalJobs ?? 0}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">ผู้สมัครทั้งหมด</p>
              <p className="text-2xl font-bold">
                {stats.totalApplicants ?? 0}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">รับเข้าทำงาน</p>
              <p className="text-2xl font-bold">
                {stats.totalAccepted ?? 0}
              </p>
            </div>
          </div>
        </div>

        {/* สองคอลัมน์: งานที่ฉันโพสต์ / ผู้สมัครล่าสุด */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* งานที่ฉันโพสต์ */}
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <h2 className="text-lg font-semibold mb-3">
              งานที่ฉันโพสต์
            </h2>
            {loading ? (
              <p className="text-sm text-gray-400">กำลังโหลดข้อมูล...</p>
            ) : jobs.length === 0 ? (
              <p className="text-sm text-gray-400">
                ยังไม่มีงานที่โพสต์
              </p>
            ) : (
              <div className="space-y-3">
                {jobs.map((job) => (
                  <div
                    key={job._id}
                    className="border rounded-lg px-3 py-2 hover:bg-gray-50"
                  >
                    <p className="font-medium text-sm">
                      {job.title}
                    </p>
                    <p className="text-xs text-gray-500">
                      โพสต์เมื่อ {formatDateTime(job.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ผู้สมัครล่าสุด */}
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <h2 className="text-lg font-semibold mb-3">
              ผู้สมัครล่าสุด
            </h2>
            {loading ? (
              <p className="text-sm text-gray-400">กำลังโหลดข้อมูล...</p>
            ) : latestApplications.length === 0 ? (
              <p className="text-sm text-gray-400">
                ยังไม่มีผู้สมัคร
              </p>
            ) : (
              <div className="space-y-3">
                {latestApplications.map((app) => (
                  <div
                    key={app._id}
                    className="border rounded-lg px-3 py-2 hover:bg-gray-50"
                  >
                    <p className="font-medium text-sm">
                      {app.applicant?.name || "ไม่ทราบชื่อ"}
                    </p>
                    <p className="text-xs text-gray-500">
                      สมัครงาน: {app.job?.title || "-"}
                    </p>
                    <p className="text-[11px] text-gray-400">
                      เมื่อ {formatDateTime(app.createdAt)} | สถานะ:{" "}
                      {app.status || "pending"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ✅ โมดัลประกาศงานใหม่ ใช้โค้ดเหมือน JobSearchHome */}
      <AddJobModal
        open={showAddForm}
        onClose={() => setShowAddForm(false)}
        token={token}
        onCreated={(job) => {
          // ใส่งานใหม่เพิ่มเข้า list + อัปเดตตัวเลขสถิติ
          setJobs((prev) => [job, ...prev]);
          setStats((prev) => ({
            ...prev,
            totalJobs: (prev.totalJobs || 0) + 1,
          }));
          setShowAddForm(false);
        }}
      />
    </div>
  );
}

// src/AdminView.jsx
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  AlertTriangle,
  Menu,
  X,
  TrendingUp,
  Mail,
  ChevronUp,
  CreditCard,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { API_BASE, authHeader } from "./api";
import { getPhotoUrl } from "./utils/imageUtils";
import ChatWidget from "./components/ChatWidget";
import ChatDockButton from "./components/ChatDockButton";
import OnlineStatusWidget from "./components/OnlineStatusWidget";
import AdminPaymentManagement from "./components/AdminPaymentManagement";

// ✅ Static menu items (ย้ายออกนอก component เพื่อป้องกัน re-render)
const MENU_ITEMS = [
  {
    id: "dashboard",
    title: "Dashboard",
    icon: BarChart3,
    description: "สถิติและภาพรวมระบบ"
  },
  {
    id: "online-status",
    title: "สถานะออนไลน์",
    icon: TrendingUp,
    description: "ผู้ใช้ที่ออนไลน์"
  },
  {
    id: "users",
    title: "จัดการผู้ใช้",
    icon: Users,
    description: "ผู้ใช้ทั้งหมดและการตั้งสิทธิ์"
  },
  {
    id: "jobs",
    title: "จัดการงาน",
    icon: Briefcase,
    description: "งานทั้งหมดในระบบ"
  },
  {
    id: "applications",
    title: "ใบสมัครงาน",
    icon: FileText,
    description: "ใบสมัครและการยืนยันบัตร ปชช."
  },
  {
    id: "payments",
    title: "รายการชำระเงิน",
    icon: CreditCard,
    description: "จัดการรายการชำระเงินทั้งหมด"
  },
  {
    id: "email-validation",
    title: "ตรวจสอบอีเมล",
    icon: Mail,
    description: "จัดการอีเมลปลอมและน่าสงสัย"
  }
];

// ✅ Static color mapping สำหรับ Tailwind CSS
const COLOR_CLASSES = {
  blue: {
    bg: 'bg-blue-600',
    bgHover: 'hover:bg-blue-700',
    text: 'text-blue-700',
    bgLight: 'bg-blue-100',
    border: 'border-blue-200',
    hoverBg: 'hover:bg-blue-50'
  },
  yellow: {
    bg: 'bg-yellow-500',
    bgHover: 'hover:bg-yellow-600',
    text: 'text-yellow-700',
    bgLight: 'bg-yellow-100',
    border: 'border-yellow-200',
    hoverBg: 'hover:bg-yellow-50'
  },
  orange: {
    bg: 'bg-orange-500',
    bgHover: 'hover:bg-orange-600',
    text: 'text-orange-700',
    bgLight: 'bg-orange-100',
    border: 'border-orange-200',
    hoverBg: 'hover:bg-orange-50'
  },
  red: {
    bg: 'bg-red-500',
    bgHover: 'hover:bg-red-600',
    text: 'text-red-700',
    bgLight: 'bg-red-100',
    border: 'border-red-200',
    hoverBg: 'hover:bg-red-50'
  }
};
export default function AdminView({ user, onLogout }) {
  const navigate = useNavigate();
  
  // ✅ Token guard - ตรวจสอบ token ก่อน
  const token = localStorage.getItem("token");
  const isAdmin = user?.role === "admin";
  
  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    if (!isAdmin) {
      // ให้แสดง error แทน redirect ทันที
      return;
    }
  }, [token, isAdmin, navigate]);

  // State management
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalJobs: 0,
    totalApplications: 0,
    activeJobs: 0,
  });
  const [users, setUsers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [updatingUserId, setUpdatingUserId] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedUserProfile, setSelectedUserProfile] = useState(null);
  const [loadingAll, setLoadingAll] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [jobSearch, setJobSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [appFilter, setAppFilter] = useState("all");
  const [chatOpen, setChatOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [showScrollTop, setShowScrollTop] = useState(false);

  // ✅ Memoized auth header
  const authHeaders = useMemo(() => authHeader(), []);

  // ✅ AbortController สำหรับ cleanup
  const abortControllerRef = useRef(null);

  // ฟังก์ชันเลื่อนไปยังส่วนที่เลือก
  const scrollToSection = useCallback((sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
      setActiveSection(sectionId);
      setSidebarOpen(false);
    }
  }, []);

  // ฟังก์ชันกลับด้านบน
  const scrollToTop = useCallback(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, []);
  // ✅ ตรวจสอบ section ที่กำลังดูอยู่ (ใช้ static MENU_ITEMS)
  useEffect(() => {
    const handleScroll = () => {
      const sections = MENU_ITEMS.map(item => item.id);
      const scrollPosition = window.scrollY + 100;

      // แสดงปุ่มกลับด้านบน
      setShowScrollTop(window.scrollY > 300);

      for (const sectionId of sections) {
        const element = document.getElementById(sectionId);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(sectionId);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []); // ✅ ไม่มี dependency ที่เปลี่ยนแปลง

  // ✅ ดึงข้อมูลทั้งหมดพร้อม AbortController
  const loadAllData = useCallback(async () => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setLoadingAll(true);
    setLoadError("");
    
    try {
      // สถิติ
      const statsRes = await fetch(`${API_BASE}/api/admin/stats`, {
        headers: authHeaders,
        signal
      });
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }

      // ผู้ใช้ทั้งหมด
      const usersRes = await fetch(`${API_BASE}/api/admin/users`, {
        headers: authHeaders,
        signal
      });
      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(Array.isArray(data) ? data : []);
      }

      // งานทั้งหมด
      const jobsRes = await fetch(`${API_BASE}/api/admin/jobs`, {
        headers: authHeaders,
        signal
      });
      if (jobsRes.ok) {
        const data = await jobsRes.json();
        setJobs(Array.isArray(data) ? data : []);
      }

      // ใบสมัครทั้งหมด
      const appsRes = await fetch(`${API_BASE}/api/admin/applications`, {
        headers: authHeaders,
        signal
      });
      if (appsRes.ok) {
        const data = await appsRes.json();
        setApplications(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        setLoadError("โหลดข้อมูลแอดมินไม่สำเร็จ กรุณาลองกดรีเฟรชอีกครั้ง");
      }
    } finally {
      setLoadingAll(false);
    }
  }, [authHeaders]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    if (token && isAdmin) {
      loadAllData();
    }
  }, [loadAllData, token, isAdmin]);
  // ===== งานที่ผ่านการกรองจากช่องค้นหา =====
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const q = jobSearch.trim().toLowerCase();
      if (!q) return true;
      return (
        (job.title || "").toLowerCase().includes(q) ||
        (job.company || "").toLowerCase().includes(q) ||
        (job.createdBy?.name || "").toLowerCase().includes(q)
      );
    });
  }, [jobs, jobSearch]);

  // ===== ผู้ใช้ที่ผ่านการกรอง =====
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = userSearch.trim().toLowerCase();
      const matchText =
        !q ||
        (u.name || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q);
      const matchRole = userRoleFilter === "all" || u.role === userRoleFilter;
      return matchText && matchRole;
    });
  }, [users, userSearch, userRoleFilter]);

  // จำนวนผู้ใช้แต่ละ role
  const roleCounts = useMemo(() => {
    return users.reduce(
      (acc, u) => {
        if (u.role === "admin") acc.admin += 1;
        else if (u.role === "employer") acc.employer += 1;
        else acc.jobseeker += 1;
        return acc;
      },
      { admin: 0, employer: 0, jobseeker: 0 }
    );
  }, [users]);

  // ===== ใบสมัครหลัง filter =====
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      if (appFilter === "all") return true;
      if (appFilter === "verified") return !!app.idVerified;
      if (appFilter === "pending") return !app.idVerified && app.verificationStatus !== "rejected";
      if (appFilter === "rejected") return app.verificationStatus === "rejected";
      return true;
    });
  }, [applications, appFilter]);

  const deleteJob = async (jobId) => {
    if (!window.confirm("ลบงานนี้ใช่ไหม?")) return;
    try {
      await fetch(`${API_BASE}/api/admin/jobs/${jobId}`, {
        method: "DELETE",
        headers: authHeaders,
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
      alert("ป้องกันความปลอดภัย: ไม่อนุญาตให้ลดสิทธิ์ตัวเองออกจาก admin ผ่านหน้านี้");
      return;
    }

    const confirmText =
      role === "admin"
        ? `ยืนยันตั้ง "${targetUser.name}" เป็นผู้ดูแลระบบ (admin) ?`
        : `ยืนยันเปลี่ยนสิทธิ์ของ "${targetUser.name}" เป็น "${role}" ?`;

    if (!window.confirm(confirmText)) return;

    try {
      setUpdatingUserId(targetUser._id);
      const res = await fetch(`${API_BASE}/api/admin/users/${targetUser._id}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({ role }),
      });

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
      alert(e.message || "เปลี่ยนสิทธิ์ไม่สำเร็จ");
    } finally {
      setUpdatingUserId(null);
    }
  };

  // ✅ ลบผู้ใช้ (ยืนยัน 2 รอบ)
  const handleDeleteUser = async (targetUser) => {
    if (!targetUser || !targetUser._id) return;
    
    const myId = user?._id || user?.id || user?.userId;
    const isMe = targetUser._id === myId;

    if (isMe) {
      alert("ไม่สามารถลบบัญชีของตัวเองได้");
      return;
    }

    // ✅ การยืนยันรอบที่ 1
    const confirm1 = window.confirm(
      `⚠️ คุณต้องการลบผู้ใช้ "${targetUser.name}" (${targetUser.email}) หรือไม่?\n\n` +
      `Role: ${targetUser.role}\n\n` +
      `การลบนี้จะลบข้อมูลทั้งหมดของผู้ใช้รวมถึง:\n` +
      `- โปรไฟล์และข้อมูลส่วนตัว\n` +
      `- ใบสมัครงานทั้งหมด\n` +
      `- งานที่โพสต์ (ถ้าเป็น employer)\n` +
      `- ข้อความแชท\n\n` +
      `กดตกลงเพื่อดำเนินการต่อ`
    );

    if (!confirm1) return;

    // ✅ การยืนยันรอบที่ 2
    const confirm2 = window.confirm(
      `🚨 ยืนยันอีกครั้ง!\n\n` +
      `คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้ "${targetUser.name}"?\n\n` +
      `⚠️ การกระทำนี้ไม่สามารถย้อนกลับได้!\n\n` +
      `กดตกลงเพื่อลบผู้ใช้อย่างถาวร`
    );

    if (!confirm2) return;

    try {
      setUpdatingUserId(targetUser._id);
      
      const res = await fetch(`${API_BASE}/api/admin/users/${targetUser._id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
      });

      let data;
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (!res.ok) {
        throw new Error(data.message || "ลบผู้ใช้ไม่สำเร็จ");
      }

      // ✅ ลบผู้ใช้ออกจาก state
      setUsers((prev) => prev.filter((u) => u._id !== targetUser._id));
      
      alert(`✅ ลบผู้ใช้ "${targetUser.name}" เรียบร้อยแล้ว`);
    } catch (e) {
      alert(e.message || "ลบผู้ใช้ไม่สำเร็จ");
    } finally {
      setUpdatingUserId(null);
    }
  };

  // ✅ ดึงโปรไฟล์ผู้ใช้แล้วเปิดป็อปอัพ
  const openUserProfile = async (u) => {
    if (!u || !u._id) return;
    try {
      const res = await fetch(`${API_BASE}/api/profile/${u._id}`, {
        headers: authHeaders,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "ดึงโปรไฟล์ไม่สำเร็จ");
      }
      setSelectedUserProfile(data);
    } catch (e) {
      alert(e.message || "ดึงโปรไฟล์ไม่สำเร็จ");
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

  // ✅ ลบใบสมัครงาน (เฉพาะที่ตรวจสอบแล้ว)
  const deleteApplication = async (app) => {
    if (!app || !app._id) return;
    
    const confirmText = `ยืนยันลบใบสมัครของ "${app.applicantName}" สำหรับตำแหน่ง "${app.jobTitle || app.job?.title}" ?\n\n⚠️ การลบนี้ไม่สามารถย้อนกลับได้`;
    
    if (!window.confirm(confirmText)) return;

    try {
      const res = await fetch(`${API_BASE}/api/admin/applications/${app._id}`, {
        method: "DELETE",
        headers: authHeaders,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || "ลบใบสมัครไม่สำเร็จ");
      }

      setApplications((prev) => prev.filter((a) => a._id !== app._id));
      alert("ลบใบสมัครเรียบร้อยแล้ว");
    } catch (e) {
      alert(e.message || "ลบใบสมัครไม่สำเร็จ");
    }
  };

  // ✅ ยืนยัน / ยกเลิกยืนยันบัตร ปชช.
  const toggleIdVerify = async (app, verified) => {
    const msg = verified
      ? `ยืนยันตัวตนผู้สมัคร "${app.applicantName}" ใช่ไหม?`
      : `ยกเลิกการยืนยัน "${app.applicantName}" ใช่ไหม?`;

    if (!window.confirm(msg)) return;

    try {
      const res = await fetch(`${API_BASE}/api/admin/applications/${app._id}/verify`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({ verified }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "อัปเดตการยืนยันไม่สำเร็จ");
      }

      setApplications((prev) =>
        prev.map((a) => (a._id === data._id ? data : a))
      );
    } catch (e) {
      alert(e.message || "อัปเดตการยืนยันไม่สำเร็จ");
    }
  };
  // ✅ รีเซ็ตสถานะการยืนยัน
  const resetVerificationStatus = async (app) => {
    const confirmMsg = `รีเซ็ตสถานะการยืนยันของ "${app.applicantName}" ?\n\n` +
      `สถานะจะกลับเป็น "รอตรวจสอบ" และผู้สมัครสามารถอัปโหลดบัตรประชาชนใหม่ได้`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch(`${API_BASE}/api/admin/applications/${app._id}/reset-verification`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({ 
          resetBy: user?.name || "Admin"
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "รีเซ็ตสถานะไม่สำเร็จ");
      }

      setApplications((prev) =>
        prev.map((a) => (a._id === data._id ? data : a))
      );

      alert("รีเซ็ตสถานะเรียบร้อยแล้ว");
    } catch (e) {
      alert(e.message || "รีเซ็ตสถานะไม่สำเร็จ");
    }
  };

  // ✅ ปฏิเสธการยืนยันพร้อมแจ้งเตือนผู้สมัคร
  const rejectIdVerification = async (app) => {
    const reason = prompt(
      `เหตุผลที่ปฏิเสธการยืนยันบัตรประชาชนของ "${app.applicantName}":\n\n` +
      `(ข้อความนี้จะถูกส่งไปแจ้งเตือนผู้สมัคร)`,
      "รูปบัตรประชาชนไม่ชัดเจน หรือข้อมูลไม่ตรงกัน"
    );

    if (!reason || !reason.trim()) return;

    const confirmMsg = `ยืนยันปฏิเสธการยืนยันตัวตนของ "${app.applicantName}" ?\n\n` +
      `เหตุผล: ${reason.trim()}\n\n` +
      `⚠️ ผู้สมัครจะได้รับการแจ้งเตือนทางอีเมล`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch(`${API_BASE}/api/admin/applications/${app._id}/reject-verification`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({ 
          reason: reason.trim(),
          rejectedBy: user?.name || "Admin"
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "ปฏิเสธการยืนยันไม่สำเร็จ");
      }

      setApplications((prev) =>
        prev.map((a) => (a._id === data._id ? data : a))
      );

      alert(`ปฏิเสธการยืนยันเรียบร้อยแล้ว\nผู้สมัครจะได้รับอีเมลแจ้งเตือน`);
    } catch (e) {
      alert(e.message || "ปฏิเสธการยืนยันไม่สำเร็จ");
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
        {/* Sidebar Overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div className={`fixed top-0 left-0 h-full w-80 bg-white shadow-xl z-50 transform transition-transform duration-300 overflow-y-auto ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          {/* Sidebar Header */}
          <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">⚙️ Admin Menu</h2>
                <p className="text-sm opacity-90">เลือกส่วนที่ต้องการดู</p>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 hover:bg-white/20 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Quick Stats */}
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white/20 rounded-lg p-2 text-center">
                <p className="font-bold">{stats.totalUsers}</p>
                <p className="opacity-90">ผู้ใช้</p>
              </div>
              <div className="bg-white/20 rounded-lg p-2 text-center">
                <p className="font-bold">{stats.totalJobs}</p>
                <p className="opacity-90">งาน</p>
              </div>
            </div>
          </div>
          {/* Menu Items */}
          <div className="p-4 space-y-2">
            {MENU_ITEMS.map((item) => {
              const IconComponent = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={`w-full text-left p-3 rounded-lg transition-colors group ${
                    isActive 
                      ? 'bg-blue-100 border-l-4 border-blue-500' 
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <IconComponent className={`w-5 h-5 ${
                      isActive 
                        ? 'text-blue-600' 
                        : 'text-gray-600 group-hover:text-blue-600'
                    }`} />
                    <div>
                      <p className={`font-medium ${
                        isActive 
                          ? 'text-blue-600' 
                          : 'text-gray-800 group-hover:text-blue-600'
                      }`}>
                        {item.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Sidebar Footer */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-gray-50">
            <div className="text-center text-xs text-gray-500">
              <p>AOW Job Platform</p>
              <p>Admin Panel v1.0</p>
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white p-4 md:p-6">
          <div className="flex justify-between items-center mb-4 gap-2 flex-wrap">
            <div className="flex items-center gap-2 md:gap-4">
              {/* Hamburger Menu Button */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="bg-white/10 hover:bg-white/20 p-2 rounded-lg flex items-center gap-1 md:gap-2"
              >
                <Menu className="w-4 h-4 md:w-5 md:h-5" />
                <span className="text-xs md:text-sm">เมนู</span>
              </button>
              
              <div>
                <h1 className="text-lg md:text-2xl font-bold">
                  ⚙️ สวัสดี, Admin {user?.name || ""}
                </h1>
                <p className="text-xs md:text-sm opacity-90">
                  แอดมิน - จัดการระบบทั้งหมด และกำหนดสิทธิ์ผู้ใช้งาน
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 md:gap-3 flex-wrap">
              {/* ปุ่มไปกล่องแชทใหญ่ */}
              <button
                onClick={() => navigate("/chats")}
                className="bg-white/10 hover:bg-white/20 px-2 md:px-3 py-2 rounded-lg flex items-center gap-1 md:gap-2 text-xs md:text-sm"
                title="กล่องแชท"
              >
                <span className="text-base md:text-lg">💬</span>
                <span className="hidden sm:inline">กล่องแชท</span>
                {unread > 0 && (
                  <span className="text-[10px] bg-red-500 text-white rounded-full px-1.5 py-[1px]">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </button>
              <button
                onClick={loadAllData}
                className="bg-white/10 hover:bg-white/20 px-2 md:px-3 py-2 rounded-lg flex items-center gap-1 md:gap-2 text-xs md:text-sm"
                title="รีเฟรชข้อมูล"
              >
                <RefreshCw
                  className={`w-4 h-4 ${loadingAll ? "animate-spin" : ""}`}
                />
                <span className="hidden sm:inline">{loadingAll ? "กำลังโหลด..." : "รีเฟรชข้อมูล"}</span>
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
          {/* ✅ แสดง error รวม ถ้ามีปัญหาดึงข้อมูล */}
          {loadError && (
            <div className="mt-2 bg-red-600/20 border border-red-300/70 text-xs md:text-sm px-3 md:px-4 py-2 rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span>{loadError}</span>
            </div>
          )}
        </div>

        <div className="p-6 space-y-6">
          {/* Dashboard Stats */}
          <div id="dashboard">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-blue-600" />
              Dashboard & สถิติ
            </h2>
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
          </div>
          {/* Online Status Widget */}
          <div id="online-status">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-green-600" />
              สถานะออนไลน์
            </h2>
            <OnlineStatusWidget isAdmin={true} />
          </div>

          {/* ผู้ใช้ทั้งหมด */}
          <div id="users">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Users className="w-6 h-6 text-purple-600" />
                  จัดการผู้ใช้ทั้งหมด
                </h2>
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
                    id="userSearch"
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="ค้นหาชื่อ / อีเมล"
                    className="text-sm pl-8 pr-3 py-2 border rounded-lg w-56 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoComplete="off"
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
                            
                            {/* ✅ ปุ่มลบผู้ใช้ */}
                            {!isMe && (
                              <button
                                type="button"
                                disabled={updatingUserId === u._id}
                                onClick={() => handleDeleteUser(u)}
                                className="px-2 py-1 text-xs rounded border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50 flex items-center gap-1"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                ลบ
                              </button>
                            )}
                            
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
          <div id="jobs">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Briefcase className="w-6 h-6 text-green-600" />
                จัดการงานทั้งหมด
              </h2>

              {/* ✅ ช่องค้นหางาน */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-2 top-2.5" />
                  <input
                    id="jobSearch"
                    type="text"
                    value={jobSearch}
                    onChange={(e) => setJobSearch(e.target.value)}
                    placeholder="ค้นหาตำแหน่ง / บริษัท / ผู้โพสต์"
                    className="text-sm pl-8 pr-3 py-2 border rounded-lg w-64 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoComplete="off"
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
          <div id="applications">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <FileText className="w-6 h-6 text-orange-600" />
                  ใบสมัครงาน & การยืนยันบัตรประชาชน
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  💡 สามารถลบใบสมัครที่ตรวจสอบแล้วได้ | ❌ ปฏิเสธพร้อมแจ้งเตือนผู้สมัครทางอีเมล | 🔄 รีเซ็ตสถานะได้
                </p>
              </div>
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
                  {applications.filter((a) => !a.idVerified && a.verificationStatus !== "rejected").length})
                </button>
                <button
                  type="button"
                  onClick={() => setAppFilter("rejected")}
                  className={`px-2 py-1 rounded-full border ${
                    appFilter === "rejected"
                      ? "bg-red-500 text-white border-red-500"
                      : "bg-white text-gray-600 border-gray-200"
                  }`}
                >
                  ปฏิเสธแล้ว (
                  {applications.filter((a) => a.verificationStatus === "rejected").length})
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
                  ยืนยันแล้ว ({applications.filter((a) => a.idVerified).length})
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
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center">
                            {getPhotoUrl(app.applicant.profile) ? (
                              <img
                                src={getPhotoUrl(app.applicant.profile)}
                                alt={app.applicantName}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  console.log("Image load error:", e.target.src);
                                  e.target.style.display = 'none';
                                  e.target.parentElement.innerHTML = '<svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>';
                                }}
                              />
                            ) : app.applicant?.avatar ? (
                              <img
                                src={app.applicant.avatar}
                                alt={app.applicantName}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  console.log("Avatar load error:", e.target.src);
                                  e.target.style.display = 'none';
                                  e.target.parentElement.innerHTML = '<svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>';
                                }}
                              />
                            ) : (
                              <UserIcon className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{app.applicantName}</p>
                            {app.applicant?.profile?.fullName && app.applicant.profile.fullName !== app.applicantName && (
                              <p className="text-xs text-gray-500">{app.applicant.profile.fullName}</p>
                            )}
                          </div>
                        </div>
                      </td>
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
                            ✅ ยืนยันแล้ว
                          </span>
                        ) : app.verificationStatus === "rejected" ? (
                          <div className="space-y-1">
                            <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 block">
                              ❌ ปฏิเสธแล้ว
                            </span>
                            {app.rejectionReason && (
                              <p className="text-[10px] text-red-600 max-w-32 truncate" title={app.rejectionReason}>
                                {app.rejectionReason}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">
                            ⏳ รอตรวจสอบ
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex gap-2 flex-wrap">
                          {!app.idVerified ? (
                            <>
                              <button
                                type="button"
                                onClick={() => toggleIdVerify(app, true)}
                                className="px-2 py-1 text-xs rounded border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                disabled={!app.idCardPath}
                              >
                                ✅ ยืนยันตัวตน
                              </button>
                              
                              {/* ปุ่มปฏิเสธพร้อมแจ้งเตือน - ซ่อนถ้าปฏิเสธแล้ว */}
                              {app.verificationStatus !== "rejected" && (
                                <button
                                  type="button"
                                  onClick={() => rejectIdVerification(app)}
                                  className="px-2 py-1 text-xs rounded border border-red-200 text-red-700 hover:bg-red-50"
                                  disabled={!app.idCardPath}
                                >
                                  ❌ ปฏิเสธ & แจ้งเตือน
                                </button>
                              )}
                              
                              {/* ปุ่มรีเซ็ตสถานะ - แสดงเฉพาะเมื่อปฏิเสธแล้ว */}
                              {app.verificationStatus === "rejected" && (
                                <button
                                  type="button"
                                  onClick={() => resetVerificationStatus(app)}
                                  className="px-2 py-1 text-xs rounded border border-blue-200 text-blue-700 hover:bg-blue-50"
                                >
                                  🔄 รีเซ็ตสถานะ
                                </button>
                              )}
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => toggleIdVerify(app, false)}
                              className="px-2 py-1 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
                            >
                              ยกเลิกยืนยัน
                            </button>
                          )}
                          
                          {/* ✅ ปุ่มดูโปรไฟล์ผู้สมัคร */}
                          {app.applicant && (
                            <button
                              type="button"
                              onClick={() => openUserProfile(app.applicant)}
                              className="px-2 py-1 text-xs rounded border border-blue-200 text-blue-700 hover:bg-blue-50 flex items-center gap-1"
                              title="ดูโปรไฟล์ผู้สมัคร"
                            >
                              <Eye className="w-3 h-3" />
                              โปรไฟล์
                            </button>
                          )}
                          
                          {/* ปุ่มลบใบสมัคร - แสดงเฉพาะเมื่อยืนยันแล้ว */}
                          {app.idVerified && (
                            <button
                              type="button"
                              onClick={() => deleteApplication(app)}
                              className="px-2 py-1 text-xs rounded border border-red-200 text-red-700 hover:bg-red-50 flex items-center gap-1"
                              title="ลบใบสมัครที่ตรวจสอบแล้ว"
                            >
                              <Trash2 className="w-3 h-3" />
                              ลบรายการ
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
      
      {/* ✅ Payment Management Section */}
      <div id="payments">
        <div className="p-6">
          <AdminPaymentManagement />
        </div>
      </div>
      
      {/* ✅ Email Validation Management Section */}
      <div id="email-validation">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Mail className="w-6 h-6 text-blue-600" />
            จัดการการตรวจสอบอีเมล
          </h2>
          <EmailValidationSection user={user} />
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

            {/* ✅ รูปโปรไฟล์ */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-16 h-16 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center">
                {getPhotoUrl(selectedUserProfile.profile) ? (
                  <img
                    src={getPhotoUrl(selectedUserProfile.profile)}
                    alt={selectedUserProfile.name || "ผู้ใช้"}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.log("Profile image load error:", e.target.src);
                      e.target.style.display = 'none';
                    }}
                  />
                ) : selectedUserProfile.avatar ? (
                  <img
                    src={selectedUserProfile.avatar}
                    alt={selectedUserProfile.name || "ผู้ใช้"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <UserIcon className="w-8 h-8 text-gray-400" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold">{selectedUserProfile.name || "ผู้ใช้"}</h2>
                <p className="text-sm text-gray-500">{selectedUserProfile.email}</p>
                <p className="text-xs text-gray-400">
                  สมัครเมื่อ: {selectedUserProfile.createdAt ? new Date(selectedUserProfile.createdAt).toLocaleString('th-TH', {
                    year: 'numeric',
                    month: 'short', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : "-"}
                </p>
              </div>
            </div>

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
            <p className="text-sm text-gray-600 mb-1">{selectedJob.company}</p>
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

            {/* ✅ ภาพงานเบื้อต้น */}
            <div className="mb-4">
              <p className="font-semibold text-gray-700 mb-2">🏢 ภาพงานเบื้อต้น</p>
              
              {selectedJob?.workplacePhotos && selectedJob.workplacePhotos.length > 0 ? (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedJob.workplacePhotos.map((photo, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={photo}
                          alt={`ภาพงาน ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition"
                          onClick={() => window.open(photo, '_blank')}
                          onError={(e) => {
                            console.error("Failed to load image:", photo);
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

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-20 right-6 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg z-30 transition-all duration-300"
          title="กลับด้านบน"
        >
          <ChevronUp className="w-5 h-5" />
        </button>
      )}
    </>
  );
}
// ✅ Email Validation Management Component (แยกออกมาเป็น component ย่อย)
function EmailValidationSection({ user }) {
  const [suspiciousUsers, setSuspiciousUsers] = useState([]);
  const [emailStats, setEmailStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [filter, setFilter] = useState('all');
  const [testEmail, setTestEmail] = useState('');
  const [testResult, setTestResult] = useState(null);
  
  // ✅ Track component mount status
  const mountedRef = useRef(true);

  // ✅ Memoized auth header
  const authHeaders = useMemo(() => authHeader(), []);

  // ✅ Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ดึงข้อมูลผู้ใช้ที่น่าสงสัย
  const loadSuspiciousUsers = useCallback(async () => {
    if (!mountedRef.current) return;
    
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/suspicious-users?status=${filter}`, {
        headers: authHeaders,
      });
      if (res.ok) {
        const data = await res.json();
        if (mountedRef.current) {
          setSuspiciousUsers(data.users || []);
        }
      }
    } catch (err) {
      console.error('Load suspicious users error:', err);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [filter, authHeaders]);

  // ดึงสถิติอีเมล
  const loadEmailStats = useCallback(async () => {
    if (!mountedRef.current) return;
    
    try {
      const res = await fetch(`${API_BASE}/api/admin/email-stats`, {
        headers: authHeaders,
      });
      if (res.ok) {
        const data = await res.json();
        if (mountedRef.current) {
          setEmailStats(data);
        }
      }
    } catch (err) {
      console.error('Load email stats error:', err);
    }
  }, [authHeaders]);

  // ตรวจสอบอีเมลแบบ batch
  const validateUsersBatch = async () => {
    if (!window.confirm('ตรวจสอบอีเมลผู้ใช้ทั้งหมด? (อาจใช้เวลาสักครู่)')) return;
    
    if (!mountedRef.current) return;
    
    setValidating(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/validate-users-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({ limit: 100 }),
      });
      
      if (res.ok) {
        const data = await res.json();
        if (mountedRef.current) {
          alert(`ตรวจสอบเรียบร้อย!\n\nประมวลผล: ${data.processed} คน\nน่าสงสัย: ${data.suspicious} คน\nต้องตรวจสอบ: ${data.needsReview} คน`);
          loadSuspiciousUsers();
          loadEmailStats();
        }
      } else {
        const error = await res.json();
        if (mountedRef.current) {
          alert(`เกิดข้อผิดพลาด: ${error.message}`);
        }
      }
    } catch (err) {
      if (mountedRef.current) {
        alert(`เกิดข้อผิดพลาด: ${err.message}`);
      }
    } finally {
      if (mountedRef.current) {
        setValidating(false);
      }
    }
  };

  // ทดสอบอีเมล
  const testEmailValidation = async () => {
    if (!testEmail.trim()) return;
    if (!mountedRef.current) return;
    
    try {
      const res = await fetch(`${API_BASE}/api/admin/validate-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({ email: testEmail.trim() }),
      });
      
      if (res.ok) {
        const data = await res.json();
        if (mountedRef.current) {
          setTestResult(data.validation);
        }
      } else {
        const error = await res.json();
        if (mountedRef.current) {
          alert(`เกิดข้อผิดพลาด: ${error.message}`);
        }
      }
    } catch (err) {
      if (mountedRef.current) {
        alert(`เกิดข้อผิดพลาด: ${err.message}`);
      }
    }
  };
  // ระงับบัญชี
  const suspendUser = async (userId, userName) => {
    const reason = prompt(`ระบุเหตุผลในการระงับบัญชี "${userName}":`);
    if (!reason) return;
    if (!mountedRef.current) return;
    
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${userId}/suspend`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      
      if (res.ok) {
        const data = await res.json();
        if (mountedRef.current) {
          alert(data.message);
          loadSuspiciousUsers();
        }
      } else {
        const error = await res.json();
        if (mountedRef.current) {
          alert(`เกิดข้อผิดพลาด: ${error.message}`);
        }
      }
    } catch (err) {
      if (mountedRef.current) {
        alert(`เกิดข้อผิดพลาด: ${err.message}`);
      }
    }
  };

  // ยกเลิกการระงับ
  const unsuspendUser = async (userId, userName) => {
    const notes = prompt(`หมายเหตุการยกเลิกระงับบัญชี "${userName}" (ไม่บังคับ):`);
    if (!mountedRef.current) return;
    
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${userId}/unsuspend`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({ notes: notes || '' }),
      });
      
      if (res.ok) {
        const data = await res.json();
        if (mountedRef.current) {
          alert(data.message);
          loadSuspiciousUsers();
        }
      } else {
        const error = await res.json();
        if (mountedRef.current) {
          alert(`เกิดข้อผิดพลาด: ${error.message}`);
        }
      }
    } catch (err) {
      if (mountedRef.current) {
        alert(`เกิดข้อผิดพลาด: ${err.message}`);
      }
    }
  };

  // ตรวจสอบและอนุมัติ/ปฏิเสธ
  const reviewUser = async (userId, userName, approved) => {
    const notes = prompt(`หมายเหตุการตรวจสอบ "${userName}":`);
    if (!notes) return;
    if (!mountedRef.current) return;
    
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${userId}/review`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({ 
          approved, 
          notes: notes.trim() 
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        if (mountedRef.current) {
          alert(data.message);
          loadSuspiciousUsers();
        }
      } else {
        const error = await res.json();
        if (mountedRef.current) {
          alert(`เกิดข้อผิดพลาด: ${error.message}`);
        }
      }
    } catch (err) {
      if (mountedRef.current) {
        alert(`เกิดข้อผิดพลาด: ${err.message}`);
      }
    }
  };

  useEffect(() => {
    loadSuspiciousUsers();
    loadEmailStats();
  }, [loadSuspiciousUsers, loadEmailStats]);
  // ✅ Static filter options สำหรับ Tailwind CSS
  const FILTER_OPTIONS = [
    { key: 'all', label: 'ทั้งหมด', colorClass: COLOR_CLASSES.blue },
    { key: 'suspicious', label: 'น่าสงสัย', colorClass: COLOR_CLASSES.yellow },
    { key: 'review', label: 'ต้องตรวจสอบ', colorClass: COLOR_CLASSES.orange },
    { key: 'suspended', label: 'ถูกระงับ', colorClass: COLOR_CLASSES.red },
  ];

  return (
    <div className="space-y-6">
      {/* Email Validation Stats */}
      {emailStats && (
        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            📧 สถิติการตรวจสอบอีเมล
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{emailStats.overview.totalUsers}</p>
              <p className="text-xs text-gray-600">ผู้ใช้ทั้งหมด</p>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-600">{emailStats.overview.disposableEmails}</p>
              <p className="text-xs text-gray-600">อีเมลชั่วคราว</p>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <p className="text-2xl font-bold text-yellow-600">{emailStats.overview.suspiciousEmails}</p>
              <p className="text-xs text-gray-600">อีเมลน่าสงสัย</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{emailStats.overview.trustedEmails}</p>
              <p className="text-xs text-gray-600">อีเมลน่าเชื่อถือ</p>
            </div>
          </div>

          <div className="flex gap-2 text-xs">
            <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded">
              ต้องตรวจสอบ: {emailStats.overview.needsReview}
            </span>
            <span className="px-2 py-1 bg-red-100 text-red-700 rounded">
              ถูกระงับ: {emailStats.overview.suspended}
            </span>
            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
              ความครอบคลุม: {emailStats.overview.validationCoverage}%
            </span>
          </div>
        </div>
      )}

      {/* Email Validation Tools */}
      <div className="bg-white p-6 rounded-lg border">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          🔧 เครื่องมือตรวจสอบอีเมล
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Test Email */}
          <div>
            <label className="block text-sm font-medium mb-2">ทดสอบอีเมล</label>
            <div className="flex gap-2">
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="example@domain.com"
                className="flex-1 px-3 py-2 border rounded-lg text-sm"
              />
              <button
                onClick={testEmailValidation}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
              >
                ทดสอบ
              </button>
            </div>
            
            {testResult && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-1 rounded text-xs ${
                    testResult.status === 'trusted' ? 'bg-green-100 text-green-700' :
                    testResult.status === 'disposable' ? 'bg-red-100 text-red-700' :
                    testResult.status === 'suspicious' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {testResult.status}
                  </span>
                  <span className="font-medium">คะแนน: {testResult.score}/100</span>
                </div>
                <div className="text-xs text-gray-600">
                  <p>Domain: {testResult.domain}</p>
                  <p>หมายเหตุ: {testResult.notes?.join(', ') || 'ไม่มี'}</p>
                </div>
              </div>
            )}
          </div>

          {/* Batch Validation */}
          <div>
            <label className="block text-sm font-medium mb-2">ตรวจสอบแบบ Batch</label>
            <button
              onClick={validateUsersBatch}
              disabled={validating}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50"
            >
              {validating ? 'กำลังตรวจสอบ...' : 'ตรวจสอบอีเมลผู้ใช้ทั้งหมด'}
            </button>
            <p className="text-xs text-gray-500 mt-1">
              ตรวจสอบอีเมลผู้ใช้ที่ยังไม่ได้ตรวจสอบหรือตรวจสอบนานแล้ว
            </p>
          </div>
        </div>
      </div>
      {/* Suspicious Users Management */}
      <div className="bg-white p-6 rounded-lg border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            ⚠️ จัดการผู้ใช้ที่น่าสงสัย
          </h2>
          
          {/* ✅ Filter ใช้ static classes */}
          <div className="flex gap-2">
            {FILTER_OPTIONS.map(({ key, label, colorClass }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-3 py-1 rounded-lg text-xs transition-colors ${
                  filter === key
                    ? `${colorClass.bg} text-white`
                    : `${colorClass.bgLight} ${colorClass.text} ${colorClass.hoverBg}`
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-sm text-gray-500 mt-2">กำลังโหลด...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">ผู้ใช้</th>
                  <th className="px-4 py-2 text-left">อีเมล</th>
                  <th className="px-4 py-2 text-left">สถานะ</th>
                  <th className="px-4 py-2 text-left">คะแนน</th>
                  <th className="px-4 py-2 text-left">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {suspiciousUsers.map((user) => (
                  <tr key={user._id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-xs text-gray-500">
                          สมัคร: {new Date(user.createdAt).toLocaleDateString('th-TH')}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <div>
                        <p>{user.email}</p>
                        {user.emailValidation?.domain && (
                          <p className="text-xs text-gray-500">
                            Domain: {user.emailValidation.domain}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="space-y-1">
                        {user.isSuspended && (
                          <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">
                            ระงับ
                          </span>
                        )}
                        {user.requiresReview && (
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs">
                            ต้องตรวจสอบ
                          </span>
                        )}
                        {user.emailValidation?.isDisposable && (
                          <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">
                            อีเมลชั่วคราว
                          </span>
                        )}
                        {user.emailValidation?.isSuspicious && (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">
                            น่าสงสัย
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      {user.emailValidation?.validationScore ? (
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${
                            user.emailValidation.validationScore >= 70 ? 'text-green-600' :
                            user.emailValidation.validationScore >= 50 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {user.emailValidation.validationScore}/100
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">ไม่ได้ตรวจสอบ</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2 flex-wrap">
                        {user.isSuspended ? (
                          <button
                            onClick={() => unsuspendUser(user._id, user.name)}
                            className="px-2 py-1 text-xs rounded border border-green-200 text-green-700 hover:bg-green-50"
                          >
                            ยกเลิกระงับ
                          </button>
                        ) : (
                          <button
                            onClick={() => suspendUser(user._id, user.name)}
                            className="px-2 py-1 text-xs rounded border border-red-200 text-red-700 hover:bg-red-50"
                          >
                            ระงับบัญชี
                          </button>
                        )}
                        
                        {user.requiresReview && (
                          <>
                            <button
                              onClick={() => reviewUser(user._id, user.name, true)}
                              className="px-2 py-1 text-xs rounded border border-green-200 text-green-700 hover:bg-green-50"
                            >
                              อนุมัติ
                            </button>
                            <button
                              onClick={() => reviewUser(user._id, user.name, false)}
                              className="px-2 py-1 text-xs rounded border border-red-200 text-red-700 hover:bg-red-50"
                            >
                              ปฏิเสธ
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {suspiciousUsers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      ไม่พบผู้ใช้ตามเงื่อนไขที่เลือก
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
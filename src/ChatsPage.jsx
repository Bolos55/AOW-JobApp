// src/ChatsPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  Filter,
  Users,
  Briefcase,
  Clock,
  MessageCircle,
  Circle,
  RefreshCw,
} from "lucide-react";
import { API_BASE } from "./api";
import ChatWindow from "./components/ChatWindow";

export default function ChatsPage({ user }) {
  const token = localStorage.getItem("token") || "";
  const meId = user?._id || user?.id || user?.userId || null;

  const [threads, setThreads] = useState([]);
  const [active, setActive] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all"); // all | employer | jobseeker | admin
  const [filterType, setFilterType] = useState("all"); // all | job | admin
  const [sortMode, setSortMode] = useState("recent"); // recent | unread

  // เก็บเวลา "อ่านล่าสุดของแต่ละห้อง" ใน localStorage => ใช้ทำ badge ข้อความใหม่
  const [seenMap, setSeenMap] = useState(() => {
    try {
      const raw = localStorage.getItem("chat:lastSeenMap");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  // sync seenMap -> localStorage
  useEffect(() => {
    try {
      localStorage.setItem("chat:lastSeenMap", JSON.stringify(seenMap));
    } catch {
      // เงียบไปก็ได้ ไม่ต้องทำอะไร
    }
  }, [seenMap]);

  // ถ้าเลือกห้องใหม่ ให้บันทึกว่า "เพิ่งอ่านแล้ว"
  useEffect(() => {
    if (!active?._id) return;
    setSeenMap((prev) => ({
      ...prev,
      [active._id]: new Date().toISOString(),
    }));
  }, [active?._id]);

  const loadThreads = async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/chats/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "โหลดรายการแชทไม่สำเร็จ");
      }
      setThreads(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("load threads error:", e);
      setError(e.message || "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้");
      setThreads([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadThreads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // หา "อีกฝ่าย" ของห้องแชทนั้น (คนที่ไม่ใช่เรา)
  const getOtherUser = (t) => {
    const employer = t.employer;
    const worker = t.worker;
    const meStr = meId ? String(meId) : "";

    if (employer && String(employer._id || employer.id) !== meStr) {
      return employer;
    }
    if (worker && String(worker._id || worker.id) !== meStr) {
      return worker;
    }
    return employer || worker || null;
  };

  // แต่ง threads ให้มี field ที่ใช้ใน UI พร้อม unread flag
  const decoratedThreads = useMemo(() => {
    return threads.map((t) => {
      const other = getOtherUser(t);
      const lastAt = t.lastMessageAt || t.updatedAt || t.createdAt;
      const seenStr = seenMap[t._id];
      const unread =
        lastAt &&
        (!seenStr || new Date(lastAt) > new Date(seenStr));

      return {
        ...t,
        other,
        lastAt,
        unread,
      };
    });
  }, [threads, seenMap, meId]);

  // filter + sort
  const filteredThreads = useMemo(() => {
    const q = search.trim().toLowerCase();

    let list = decoratedThreads.filter((t) => {
      const other = t.other || {};
      const job = t.job || {};

      // filter คำค้น
      const matchSearch =
        q === "" ||
        (other.name || "").toLowerCase().includes(q) ||
        (other.email || "").toLowerCase().includes(q) ||
        (job.title || "").toLowerCase().includes(q) ||
        (job.jobCode || "").toLowerCase().includes(q) ||
        (t.title || "").toLowerCase().includes(q);

      if (!matchSearch) return false;

      // filter ประเภทห้อง
      if (filterType === "job" && t.isAdminThread) return false;
      if (filterType === "admin" && !t.isAdminThread) return false;

      // filter role อีกฝ่าย
      if (filterRole !== "all") {
        const r = (other.role || "").toLowerCase();
        if (r !== filterRole) return false;
      }

      return true;
    });

    // sort
    list.sort((a, b) => {
      if (sortMode === "unread") {
        // ให้ห้องที่มี unread ขึ้นก่อน
        if (a.unread && !b.unread) return -1;
        if (!a.unread && b.unread) return 1;
      }
      const at = a.lastAt ? new Date(a.lastAt).getTime() : 0;
      const bt = b.lastAt ? new Date(b.lastAt).getTime() : 0;
      return bt - at;
    });

    return list;
  }, [decoratedThreads, search, filterRole, filterType, sortMode]);

  // UI helper: แสดง label role สั้น ๆ
  const renderRolePill = (u) => {
    const role = (u?.role || "").toLowerCase();
    if (role === "employer") {
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
          นายจ้าง
        </span>
      );
    }
    if (role === "jobseeker") {
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
          ผู้หางาน
        </span>
      );
    }
    if (role === "admin") {
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700">
          แอดมิน
        </span>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold">กล่องแชท</h1>
          <p className="text-xs text-gray-500 mt-1">
            แชททั้งหมดระหว่างคุณกับผู้ใช้ในระบบ (นายจ้าง / ผู้หางาน / แอดมิน)
          </p>
        </div>

        <button
          onClick={loadThreads}
          className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
        >
          <RefreshCw className="w-4 h-4" />
          รีเฟรช
        </button>
      </div>

      {/* แสดง error ถ้ามี */}
      {!!error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* คอลัมน์ซ้าย: รายการห้องแชท */}
        <div className="bg-white rounded-2xl shadow-sm border p-3 flex flex-col">
          {/* search box */}
          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-2 top-2.5" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหาชื่อ / อีเมล / ชื่องาน / รหัสงาน"
                className="w-full pl-8 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* filter bar */}
          <div className="flex flex-wrap gap-2 mb-3 text-[11px]">
            <div className="flex items-center gap-1 text-gray-400">
              <Filter className="w-3 h-3" />
              ฟิลเตอร์:
            </div>

            {/* ประเภทห้อง */}
            <div className="flex flex-wrap gap-1">
              {[
                { id: "all", label: "ทุกประเภท" },
                { id: "job", label: "แชทเรื่องงาน" },
                { id: "admin", label: "แชทติดต่อแอดมิน" },
              ].map((b) => (
                <button
                  key={b.id}
                  onClick={() => setFilterType(b.id)}
                  className={
                    "px-2 py-1 rounded-full border " +
                    (filterType === b.id
                      ? "bg-blue-50 border-blue-400 text-blue-700"
                      : "bg-white border-gray-200 text-gray-600")
                  }
                >
                  {b.label}
                </button>
              ))}
            </div>

            {/* role อีกฝ่าย */}
            <div className="flex flex-wrap gap-1">
              <Users className="w-3 h-3 text-gray-400" />
              {[
                { id: "all", label: "ทุก role" },
                { id: "employer", label: "นายจ้าง" },
                { id: "jobseeker", label: "ผู้หางาน" },
                { id: "admin", label: "แอดมิน" },
              ].map((b) => (
                <button
                  key={b.id}
                  onClick={() => setFilterRole(b.id)}
                  className={
                    "px-2 py-1 rounded-full border " +
                    (filterRole === b.id
                      ? "bg-purple-50 border-purple-400 text-purple-700"
                      : "bg-white border-gray-200 text-gray-600")
                  }
                >
                  {b.label}
                </button>
              ))}
            </div>

            {/* sort */}
            <div className="flex flex-wrap gap-1">
              <Clock className="w-3 h-3 text-gray-400" />
              {[
                { id: "recent", label: "ล่าสุด" },
                { id: "unread", label: "มีข้อความใหม่" },
              ].map((b) => (
                <button
                  key={b.id}
                  onClick={() => setSortMode(b.id)}
                  className={
                    "px-2 py-1 rounded-full border " +
                    (sortMode === b.id
                      ? "bg-green-50 border-green-400 text-green-700"
                      : "bg-white border-gray-200 text-gray-600")
                  }
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          {/* list threads */}
          <div className="flex-1 overflow-y-auto">
            {loading && (
              <p className="text-sm text-gray-400 py-4 text-center">
                กำลังโหลดรายการแชท...
              </p>
            )}

            {!loading && filteredThreads.length === 0 && (
              <p className="text-sm text-gray-400 py-4 text-center">
                {threads.length === 0
                  ? "ยังไม่มีห้องแชท"
                  : "ไม่พบห้องแชทที่ตรงกับการค้นหา"}
              </p>
            )}

            <div className="divide-y">
              {filteredThreads.map((t) => {
                const other = t.other || {};
                const job = t.job || {};
                const isActive = active?._id === t._id;

                return (
                  <button
                    key={t._id}
                    onClick={() => setActive(t)}
                    className={
                      "w-full text-left py-3 px-2 rounded-xl mb-1 transition " +
                      (isActive
                        ? "bg-blue-50"
                        : "hover:bg-slate-50 bg-white")
                    }
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">
                            {other.name || other.email || "คู่สนทนา"}
                          </span>
                          {renderRolePill(other)}
                          {t.isAdminThread && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                              แอดมิน
                            </span>
                          )}
                          {t.unread && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-blue-600">
                              <Circle className="w-2 h-2 fill-blue-500 text-blue-500" />
                              ใหม่
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-gray-500 mt-1">
                          {job.title && (
                            <>
                              <Briefcase className="w-3 h-3" />
                              <span className="truncate">
                                {job.title}
                                {job.jobCode ? ` (${job.jobCode})` : ""}
                              </span>
                            </>
                          )}
                          {!job.title && t.title && (
                            <>
                              <MessageCircle className="w-3 h-3" />
                              <span className="truncate">{t.title}</span>
                            </>
                          )}
                        </div>
                      </div>
                      {t.lastAt && (
                        <span className="text-[10px] text-gray-400 whitespace-nowrap">
                          {new Date(t.lastAt).toLocaleString()}
                        </span>
                      )}
                    </div>

                    {t.lastMessage && (
                      <div className="mt-1 text-[11px] text-gray-500 line-clamp-1">
                        ข้อความล่าสุด: {t.lastSenderName
                          ? `${t.lastSenderName}: `
                          : ""}
                        {t.lastMessage}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* คอลัมน์ขวา: แชทจริง */}
        <div className="md:col-span-2 relative min-h-[320px]">
          {!active && (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 border border-dashed border-gray-200 rounded-2xl bg-white">
              <MessageCircle className="w-10 h-10 mb-2" />
              <p className="text-sm">เลือกรายการแชทจากด้านซ้ายเพื่อเริ่มสนทนา</p>
            </div>
          )}

          {/* ใช้ ChatWindow ตัวเดิม (ป๊อปอัปมุมขวาล่าง) */}
          <ChatWindow
            open={!!active}
            onClose={() => setActive(null)}
            thread={active}
            token={token}
            meId={meId}
          />
        </div>
      </div>
    </div>
  );
}

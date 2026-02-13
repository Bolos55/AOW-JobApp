// src/components/ChatWidget.jsx
import React, { useEffect, useRef, useState } from "react";
import { X, MessageCircle, Mail } from "lucide-react";
import { listMyThreads, fetchMessages, sendMessage, contactAdmin } from "../api/chat";
import { API_BASE } from "../api";

// helper แปลง id เป็น string แบบชัวร์
const idStr = (v) => {
  if (!v) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object") return String(v._id || v.id || v.userId || "");
  return String(v);
};

export default function ChatWidget({ open, onClose, user, token, onUnreadChange }) {
  const [threads, setThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingContactAdmin, setLoadingContactAdmin] = useState(false);
  const [text, setText] = useState("");

  const messagesEndRef = useRef(null);

  const meId = idStr(user?._id || user?.id || user?.userId);

  // เลื่อนลงล่างสุดเมื่อมีข้อความใหม่
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // เวลา close ให้ reset บาง state กันค้าง
  useEffect(() => {
    if (!open) {
      setSelectedThread(null);
      setMessages([]);
      setText("");
    }
  }, [open]);

  // ---------- helper หา "คู่สนทนาอีกฝั่ง" ----------
  const getPartnerForThread = (t) => {
    if (!meId || !t) return null;

    const employerId = idStr(t.employer);
    const workerId = idStr(t.worker);

    if (employerId && employerId === meId) return t.worker || null;
    if (workerId && workerId === meId) return t.employer || null;

    // fallback: บางระบบใช้ participants
    if (Array.isArray(t.participants)) {
      const other = t.participants.find((p) => idStr(p) !== meId);
      return other || null;
    }
    return null;
  };

  // ---------- helper ตั้งชื่อห้อง ----------
  const getThreadTitle = (t) => {
    if (!t) return "ห้องแชท";
    const partner = getPartnerForThread(t);

    if (partner && partner.name) {
      if (t.isAdminThread) return `${partner.name} • ติดต่อแอดมิน`;
      if (t.job && (t.job.title || t.job.jobCode)) {
        return `${partner.name} • ${t.job.title || "งาน"}${t.job.jobCode ? ` • ${t.job.jobCode}` : ""}`;
      }
      return partner.name;
    }

    if (t.title) return t.title;
    if (t.isAdminThread) return "ติดต่อแอดมิน";
    if (t.job && (t.job.title || t.job.jobCode)) {
      return `${t.job.title || "งาน"}${t.job.jobCode ? ` • ${t.job.jobCode}` : ""}`;
    }
    return "ห้องแชท";
  };

  // โหลดรายการห้องแชท
  const loadThreads = async () => {
    if (!token) return;
    setLoadingThreads(true);
    try {
      console.log("🔵 Loading threads...");
      const data = await listMyThreads({ token });
      console.log("✅ Threads loaded:", data);
      
      const arr = Array.isArray(data) ? data : [];
      setThreads(arr);

      if (onUnreadChange) {
        const totalUnread = arr.reduce((sum, t) => sum + (Number(t.unreadCount) || 0), 0);
        onUnreadChange(totalUnread);
      }
    } catch (e) {
      console.error("❌ loadThreads error:", e);
      setThreads([]);
      if (onUnreadChange) onUnreadChange(0);
    } finally {
      setLoadingThreads(false);
    }
  };

  // โหลดข้อความของห้องที่เลือก
  const loadMessages = async (thread) => {
    if (!thread?._id || !token) return;
    setLoadingMessages(true);
    try {
      const data = await fetchMessages({ threadId: thread._id, token });
      setMessages(Array.isArray(data) ? data : []);
      
      // ✅ Mark as read
      try {
        await fetch(`${API_BASE}/api/chats/${thread._id}/mark-read`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });
        
        // อัปเดต local state
        setThreads(prev => prev.map(t => 
          t._id === thread._id 
            ? { ...t, unreadCount: { ...t.unreadCount, [meId]: 0 } }
            : t
        ));
      } catch (err) {
        console.error("Mark as read error:", err);
      }
    } catch (e) {
      console.error("loadMessages error:", e);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  // เวลาเปิด widget ให้โหลด threads
  useEffect(() => {
    if (open) {
      loadThreads();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, token]);

  // เวลาเปลี่ยนห้อง ให้โหลดข้อความ
  useEffect(() => {
    if (selectedThread) {
      loadMessages(selectedThread);
    } else {
      setMessages([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedThread]);

  // ส่งข้อความ
  const handleSend = async () => {
    const message = text.trim();
    if (!message || !selectedThread?._id || !token) return;

    try {
      const created = await sendMessage({
        threadId: selectedThread._id,
        text: message,
        token,
      });
      if (created) {
        setMessages((prev) => [...prev, created]);
        setText("");
        // อัปเดต thread list ให้ lastMessage ใหม่ (optional)
        setThreads((prev) =>
          prev.map((t) =>
            t._id === selectedThread._id
              ? { ...t, lastMessage: message, updatedAt: new Date().toISOString() }
              : t
          )
        );
      }
    } catch (e) {
      console.error("sendMessage error:", e);
      alert("ส่งข้อความไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    }
  };

  // ปุ่ม: ติดต่อแอดมิน → ขอห้องแชทแอดมินจาก backend แล้วเลือกห้องนั้น
  const handleContactAdmin = async () => {
    if (!token) {
      alert("กรุณาเข้าสู่ระบบก่อนติดต่อแอดมิน");
      return;
    }

    try {
      setLoadingContactAdmin(true);

      console.log("🔵 Calling contactAdmin API...");
      const resp = await contactAdmin({ token });
      console.log("✅ contactAdmin response:", resp);
      
      const thread = resp?.thread || resp; // รองรับทั้ง {thread: {...}} หรือ {...}

      if (!thread?._id) {
        console.error("❌ No thread._id in response:", resp);
        throw new Error("ไม่พบข้อมูลห้องแชทแอดมินจากเซิร์ฟเวอร์");
      }

      console.log("✅ Got admin thread:", thread._id);

      setThreads((prev) => {
        const exists = prev.find((t) => t._id === thread._id);
        if (exists) {
          return prev.map((t) => (t._id === thread._id ? thread : t));
        }
        return [thread, ...prev];
      });

      setSelectedThread(thread);
      await loadMessages(thread);
    } catch (e) {
      console.error("❌ handleContactAdmin error:", e);
      alert(e?.message || "ไม่สามารถเปิดห้องแชทแอดมินได้");
    } finally {
      setLoadingContactAdmin(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 md:inset-auto md:bottom-4 md:right-4 md:w-[900px] md:h-[520px] z-50 flex items-center justify-center md:items-end md:justify-end">
      {/* ฉากหลังมืดบน mobile */}
      <div className="absolute inset-0 bg-black/40 md:bg-transparent" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[900px] h-[520px] flex overflow-hidden">
        {/* ปุ่มปิด */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* ฝั่งซ้าย: รายการห้องแชท */}
        <div className="w-1/3 border-r flex flex-col">
          <div className="px-4 pt-4 pb-3 border-b bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-blue-500" />
              <div>
                <p className="text-sm font-semibold">สื่อสารกับผู้สมัคร / ผู้ประกาศงาน</p>
                <p className="text-[11px] text-gray-500">เลือกห้องจากรายการด้านล่าง</p>
              </div>
            </div>

            {/* ปุ่ม: ติดต่อแอดมิน - ซ่อนถ้าเป็น admin */}
            {user?.role !== "admin" && (
              <button
                type="button"
                onClick={handleContactAdmin}
                disabled={loadingContactAdmin}
                className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-orange-50 text-orange-700 hover:bg-orange-100 disabled:opacity-60"
              >
                <Mail className="w-3 h-3" />
                {loadingContactAdmin ? "กำลังเปิด..." : "ติดต่อแอดมิน"}
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto text-sm">
            {loadingThreads && (
              <p className="p-3 text-xs text-gray-500">กำลังโหลดห้องแชท...</p>
            )}

            {!loadingThreads && threads.length === 0 && (
              <p className="p-3 text-xs text-gray-400">ยังไม่มีห้องแชท</p>
            )}

            {threads.map((t) => {
              const isActive = selectedThread && selectedThread._id === t._id;
              const last = t.lastMessage;

              return (
                <button
                  key={t._id}
                  onClick={async () => {
                    setSelectedThread(t);
                    await loadMessages(t);
                  }}
                  className={
                    "w-full text-left px-3 py-2 flex flex-col border-b hover:bg-slate-50 " +
                    (isActive ? "bg-slate-100" : "")
                  }
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-gray-800">
                      {getThreadTitle(t)}
                    </span>
                    {(() => {
                      // ✅ ดึง unread count สำหรับ user ปัจจุบัน
                      const unread = t.unreadCount?.[meId] || 0;
                      return unread > 0 ? (
                        <span className="text-[10px] bg-red-500 text-white rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                          {unread > 9 ? "9+" : unread}
                        </span>
                      ) : null;
                    })()}
                  </div>
                  {last && (
                    <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">
                      {typeof last === "string" ? last : String(last)}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ฝั่งขวา: เนื้อหาห้องแชท */}
        <div className="flex-1 flex flex-col">
          {/* header ขวา */}
          <div className="px-4 pt-4 pb-3 border-b bg-white flex items-center justify-between">
            {selectedThread ? (
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  {getThreadTitle(selectedThread)}
                </p>
                <p className="text-[11px] text-gray-500">สนทนากับคู่สนทนาในห้องนี้</p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-semibold text-gray-800">เลือกห้องแชทจากด้านซ้าย</p>
                <p className="text-[11px] text-gray-500">
                  หรือกดปุ่ม “ติดต่อแอดมิน” เพื่อแจ้งปัญหาการใช้งาน
                </p>
              </div>
            )}
          </div>

          {/* รายการข้อความ */}
          <div className="flex-1 overflow-y-auto px-4 py-3 bg-slate-50">
            {loadingMessages && selectedThread && (
              <p className="text-xs text-gray-500">กำลังโหลดข้อความ...</p>
            )}

            {!selectedThread && (
              <p className="text-xs text-gray-400">ยังไม่ได้เลือกห้องแชท</p>
            )}

            {selectedThread &&
              !loadingMessages &&
              messages.map((m) => {
                const senderId = idStr(m.senderId || m.sender);
                const senderName = m.senderName || m.sender?.name;

                const isMe = senderId && meId && senderId === meId;

                return (
                  <div
                    key={m._id || `${senderId}-${m.createdAt || Math.random()}`}
                    className={"mb-2 flex " + (isMe ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={
                        "max-w-[70%] rounded-2xl px-3 py-2 text-[13px] " +
                        (isMe
                          ? "bg-blue-600 text-white rounded-br-sm"
                          : "bg-white text-gray-800 rounded-bl-sm")
                      }
                    >
                      {!isMe && (
                        <p className="text-[10px] text-gray-500 mb-0.5">
                          {senderName || "คู่สนทนา"}
                        </p>
                      )}
                      <p className="whitespace-pre-line">{m.text}</p>
                      {m.createdAt && (
                        <p className="mt-1 text-[9px] opacity-70 text-right">
                          {new Date(m.createdAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}

            <div ref={messagesEndRef} />
          </div>

          {/* กล่องพิมพ์ข้อความ */}
          <div className="border-t px-3 py-2 bg-white">
            {selectedThread ? (
              <form
                className="flex items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
              >
                <input
                  id="chatWidgetInput"
                  type="text"
                  className="flex-1 border rounded-full px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="พิมพ์ข้อความ..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  autoComplete="off"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-full bg-blue-600 text-white text-sm hover:bg-blue-700"
                >
                  ส่ง
                </button>
              </form>
            ) : (
              <p className="text-[11px] text-gray-400 text-center">
                เลือกห้องแชทด้านซ้าย หรือกด “ติดต่อแอดมิน” ด้านบนซ้ายเพื่อเริ่มสนทนา
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

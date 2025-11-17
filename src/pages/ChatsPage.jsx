// src/pages/ChatsPage.jsx
import React, { useEffect, useState } from "react";
import { listMyThreads } from "../api/chat";
import ChatWidget from "../components/ChatWidget";
import { MessageSquare } from "lucide-react";

export default function ChatsPage({ user: userFromProps }) {
  const [user, setUser] = useState(() => {
    if (userFromProps) return userFromProps;
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  });

  const token = localStorage.getItem("token") || "";
  const [threads, setThreads] = useState([]);
  const [openThread, setOpenThread] = useState(null);
  const [open, setOpen] = useState(false);

  // โหลดรายการห้องแชท
  const load = async () => {
    try {
      const data = await listMyThreads({ token });
      setThreads(Array.isArray(data) ? data : []);

      // ถ้ามี lastThread ใน localStorage พยายามเลือกให้
      const lastId = localStorage.getItem("chat:lastThread");
      if (lastId && Array.isArray(data)) {
        const found = data.find((t) => String(t._id) === String(lastId));
        if (found) {
          setOpenThread(found);
          setOpen(true);
        }
      }
    } catch (e) {
      console.error("load threads error:", e);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-xl font-bold flex items-center gap-2 mb-3">
        <MessageSquare className="w-5 h-5" />
        กล่องข้อความ
      </h1>

      <div className="mt-2 space-y-2">
        {threads.map((t) => (
          <button
            key={t._id}
            onClick={() => {
              setOpenThread(t);
              setOpen(true);
              localStorage.setItem("chat:lastThread", t._id);
            }}
            className="w-full text-left bg-white border hover:bg-slate-50 rounded-xl p-3"
          >
            <p className="text-sm font-semibold">
              {t?.job?.title || "งานไม่ทราบชื่อ"}
            </p>
            <p className="text-xs text-gray-500">
              รหัสงาน: {t?.job?.jobCode || "-"}
            </p>
            {t.otherUser && (
              <p className="text-xs text-gray-500 mt-0.5">
                คู่สนทนา: {t.otherUser.name || t.otherUser.email || "-"}
              </p>
            )}
            {t.lastMessage && (
              <p className="text-xs text-gray-600 mt-1 truncate">
                ล่าสุด: {t.lastMessage}
              </p>
            )}
          </button>
        ))}
        {threads.length === 0 && (
          <p className="text-sm text-gray-400">ยังไม่มีการสนทนา</p>
        )}
      </div>

      <ChatWidget
        open={open}
        onClose={() => setOpen(false)}
        thread={openThread}
        token={token}
        user={user}
        onUnreadChange={() => {}}
      />
    </div>
  );
}

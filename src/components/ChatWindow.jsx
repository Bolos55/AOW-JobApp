// src/components/ChatWindow.jsx
import React, { useEffect, useRef, useState } from "react";
import { X, Send } from "lucide-react";
import { API_BASE } from "../api";

export default function ChatWindow({ open, onClose, thread, token, meId }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const boxRef = useRef(null);

  // โหลดข้อความห้องนี้
  useEffect(() => {
    if (!open || !thread?._id || !token) return;
    let alive = true;

    const load = async () => {
      try {
        const r = await fetch(
          `${API_BASE}/api/chats/${thread._id}/messages`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = await r.json().catch(() => []);
        if (!alive) return;
        setMessages(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("load messages error:", e);
      } finally {
        if (alive) {
          setTimeout(load, 2500); // โพลทุก 2.5 วิ
        }
      }
    };

    load();
    return () => {
      alive = false;
    };
  }, [open, thread?._id, token]);

  // เลื่อน scroll ลงล่างสุดเสมอ
  useEffect(() => {
    if (boxRef.current) {
      boxRef.current.scrollTop = boxRef.current.scrollHeight;
    }
  }, [messages]);

  const send = async (e) => {
    e?.preventDefault();
    const msg = text.trim();
    if (!msg || !thread?._id) return;

    setText("");

    try {
      const r = await fetch(
        `${API_BASE}/api/chats/${thread._id}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          // ✅ backend รอ field ชื่อ text
          body: JSON.stringify({ text: msg }),
        }
      );

      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        console.error("send message failed:", data);
      }
      // ไม่ต้อง setMessages เอง ให้รอบ polling ถัดไปดึง
    } catch (e) {
      console.error("send message error:", e);
    }
  };

  if (!open || !thread) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[60] w-[360px] bg-white rounded-2xl shadow-2xl overflow-hidden">
      <div className="px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white flex items-center justify-between">
        <div className="font-semibold truncate">
          แชทกับ {thread?.other?.name || thread?.other?.email || "คู่สนทนา"}
        </div>
        <button
          onClick={onClose}
          className="opacity-80 hover:opacity-100"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div
        ref={boxRef}
        className="h-80 overflow-y-auto p-3 space-y-2 bg-slate-50"
      >
        {messages.map((m) => {
          const senderId = m.sender?._id || m.sender;
          const isMe =
            meId && senderId && String(senderId) === String(meId);

          return (
            <div
              key={m._id}
              className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                isMe
                  ? "ml-auto bg-blue-600 text-white"
                  : "mr-auto bg-white shadow"
              }`}
            >
              {/* ✅ backend เก็บข้อความใน field text */}
              {m.text}
              <div className="text-[10px] opacity-60 mt-1">
                {m.createdAt
                  ? new Date(m.createdAt).toLocaleString()
                  : ""}
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={send} className="p-3 flex gap-2 border-t">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="พิมพ์ข้อความ…"
          className="flex-1 px-3 py-2 rounded-xl border outline-none"
        />
        <button
          type="submit"
          className="px-3 py-2 rounded-xl bg-blue-600 text-white flex items-center gap-1"
        >
          <Send className="w-4 h-4" /> ส่ง
        </button>
      </form>
    </div>
  );
}

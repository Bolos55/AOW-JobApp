// src/components/ChatWindow.jsx
import React, { useEffect, useRef, useState } from "react";
import { X, Send } from "lucide-react";
import { API_BASE } from "../api";

export default function ChatWindow({ open, onClose, thread, token, meId }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const boxRef = useRef(null);

  useEffect(() => {
    if (!open || !thread?._id) return;
    let alive = true;

    const load = async () => {
      const r = await fetch(`${API_BASE}/api/chats/${thread._id}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await r.json();
      if (alive) setMessages(Array.isArray(data) ? data : []);
      setTimeout(load, 2500); // โพลลิ่งทุก 2.5s (ง่ายๆก่อน)
    };
    load();

    return () => { alive = false; };
  }, [open, thread?._id, token]);

  useEffect(() => {
    if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight;
  }, [messages]);

  const send = async (e) => {
    e?.preventDefault();
    const body = text.trim();
    if (!body) return;
    setText("");
    await fetch(`${API_BASE}/api/chats/${thread._id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ body }),
    });
  };

  if (!open || !thread) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[60] w-[360px] bg-white rounded-2xl shadow-2xl overflow-hidden">
      <div className="px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white flex items-center justify-between">
        <div className="font-semibold truncate">
          แชทกับ {thread?.other?.name || thread?.other?.email || "คู่สนทนา"}
        </div>
        <button onClick={onClose} className="opacity-80 hover:opacity-100"><X className="w-5 h-5"/></button>
      </div>

      <div ref={boxRef} className="h-80 overflow-y-auto p-3 space-y-2 bg-slate-50">
        {messages.map(m => (
          <div key={m._id} className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm
            ${m.sender === meId ? "ml-auto bg-blue-600 text-white" : "mr-auto bg-white shadow"}`
          }>
            {m.body}
            <div className="text-[10px] opacity-60 mt-1">
              {new Date(m.createdAt).toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={send} className="p-3 flex gap-2 border-t">
        <input
          value={text}
          onChange={e=>setText(e.target.value)}
          placeholder="พิมพ์ข้อความ…"
          className="flex-1 px-3 py-2 rounded-xl border outline-none"
        />
        <button className="px-3 py-2 rounded-xl bg-blue-600 text-white flex items-center gap-1">
          <Send className="w-4 h-4"/> ส่ง
        </button>
      </form>
    </div>
  );
}
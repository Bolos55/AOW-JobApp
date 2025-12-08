// src/components/ChatBell.jsx
import React, { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";
import { API_BASE } from "../api";

export default function ChatBell({ token, onOpenList }) {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const tick = async () => {
      if (!token) return;
      const r = await fetch(`${API_BASE}/chats/unread-count`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await r.json();
      setUnread(Number(data?.count || 0));
      setTimeout(tick, 4000);
    };
    tick();
  }, [token]);

  return (
    <button
      onClick={onOpenList}
      className="relative bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-xl flex items-center gap-2"
      title="แชท"
    >
      <MessageSquare className="w-5 h-5"/>
      {unread > 0 && (
        <span className="absolute -top-1 -right-1 text-[11px] px-1.5 py-0.5 rounded-full bg-pink-500 text-white">
          {unread}
        </span>
      )}
      แชท
    </button>
  );
}
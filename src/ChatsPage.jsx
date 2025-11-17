// src/ChatsPage.jsx
import React, { useEffect, useState } from "react";
import { API_BASE } from "./api";
import ChatWindow from "./components/ChatWindow";

export default function ChatsPage({ user }) {
  const token = localStorage.getItem("token") || "";
  const [threads, setThreads] = useState([]);
  const [active, setActive] = useState(null);

  const load = async () => {
    const r = await fetch(`${API_BASE}/api/chats/threads`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await r.json();
    setThreads(Array.isArray(data) ? data : []);
  };

  useEffect(() => { load(); }, []); // load once

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">กล่องแชท</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow p-3">
          {threads.length === 0 && <p className="text-sm text-gray-500">ยังไม่มีห้องแชท</p>}
          <div className="divide-y">
            {threads.map(t => (
              <button
                key={t._id}
                onClick={() => setActive(t)}
                className="w-full text-left py-3 hover:bg-slate-50"
              >
                <div className="font-medium">{t.other?.name || t.other?.email || "คู่สนทนา"}</div>
                <div className="text-xs text-gray-500">งาน: {t.job?.title} • {t.job?.jobCode}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="md:col-span-2">
          <ChatWindow
            open={!!active}
            onClose={() => setActive(null)}
            thread={active}
            token={token}
            meId={user?.id}
          />
        </div>
      </div>
    </div>
  );
}
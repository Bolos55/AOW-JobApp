// src/components/ChatWidget.jsx
import React, { useEffect, useRef, useState } from "react";
import { X, MessageCircle } from "lucide-react";
import { listMyThreads, fetchMessages, sendMessage } from "../api/chat";

export default function ChatWidget({
  open,
  onClose,
  user,
  token,
  onUnreadChange,
}) {
  const [threads, setThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [text, setText] = useState("");
  const messagesEndRef = useRef(null);

  const meId = user?.id || user?._id || user?._id?.toString?.();

  // ---------- helper หาชื่อฝั่งตรงข้าม + ชื่องาน ----------
  const getOtherUser = (thread) => {
    // ถ้า backend ใส่ otherUser มาให้แล้ว ใช้อันนั้นเลย
    if (thread.otherUser) return thread.otherUser;

    const employer = thread.employer;
    const worker = thread.worker;

    if (!employer && !worker) return null;

    const empId =
      employer?._id?.toString?.() || employer?.id || employer?._id || "";
    const workerId =
      worker?._id?.toString?.() || worker?.id || worker?._id || "";
    const my = meId?.toString?.() || meId;

    if (my && empId && empId === my) return worker || employer;
    if (my && workerId && workerId === my) return employer || worker;

    // ถ้าเดาไม่ได้ก็คืน employer ก่อน
    return worker || employer || null;
  };

  const getThreadDisplay = (thread) => {
    const jobTitle =
      thread?.job?.title ||
      thread?.jobTitle ||
      "งานไม่ระบุ";

    const other = getOtherUser(thread);

    const otherName =
      other?.name ||
      (other?.email ? other.email.split("@")[0] : null) ||
      thread.otherUserName ||
      "ไม่ทราบชื่อ";

    return { jobTitle, otherName };
  };
  // --------------------------------------------------------

  // โหลดรายการห้องแชท
  const loadThreads = async () => {
    setLoadingThreads(true);
    try {
      const data = await listMyThreads({ token });
      setThreads(Array.isArray(data) ? data : []);
      if (typeof onUnreadChange === "function") {
        // ยังไม่ได้ทำระบบ unread จริงจัง ให้ส่ง 0 ไปก่อน
        onUnreadChange(0);
      }
    } catch (e) {
      console.error("โหลดห้องแชทไม่สำเร็จ:", e);
      setThreads([]);
    } finally {
      setLoadingThreads(false);
    }
  };

  // โหลดข้อความของห้องที่เลือก
  const loadMessages = async (thread) => {
    if (!thread?._id) return;
    setLoadingMessages(true);
    try {
      const data = await fetchMessages({
        threadId: thread._id,
        token,
      });
      setMessages(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("โหลดข้อความไม่สำเร็จ:", e);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  // เวลา widget เปิดให้โหลดห้องแชท
  useEffect(() => {
    if (open) {
      loadThreads();
    }
  }, [open]);

  // เลื่อน scroll ไปล่างสุดทุกครั้งที่ข้อความเปลี่ยน
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, selectedThread]);

  const handleSelectThread = (t) => {
    setSelectedThread(t);
    loadMessages(t);
  };

  const handleSend = async (e) => {
    e?.preventDefault?.();
    const trimmed = text.trim();
    if (!trimmed || !selectedThread?._id) return;

    try {
      const newMsg = await sendMessage({
        threadId: selectedThread._id,
        text: trimmed,
        token,
      });
      setMessages((prev) => [...prev, newMsg]);
      setText("");
    } catch (e) {
      console.error("ส่งข้อความไม่สำเร็จ:", e);
      alert(e.message || "ส่งข้อความไม่สำเร็จ");
    }
  };

  if (!open) return null;

  const headerDisplay = selectedThread
    ? getThreadDisplay(selectedThread)
    : null;

  return (
    <div className="fixed inset-0 md:inset-auto md:right-6 md:bottom-6 md:top-auto md:w-[420px] md:h-[520px] bg-black/40 md:bg-transparent flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full h-full max-w-[900px] max-h-[600px] flex flex-col md:flex-row overflow-hidden">
        {/* ซ้าย: รายการห้องแชท */}
        <div className="w-full md:w-1/3 border-r border-gray-200 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-sm">
                สื่อสารกับผู้สมัคร / ผู้ประกาศงาน
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loadingThreads && (
              <p className="text-xs text-gray-400 p-3">
                กำลังโหลดห้องแชท...
              </p>
            )}

            {!loadingThreads && threads.length === 0 && (
              <p className="text-xs text-gray-400 p-3">
                ยังไม่มีห้องแชท
              </p>
            )}

            {threads.map((t) => {
              const { jobTitle, otherName } = getThreadDisplay(t);
              const isActive = selectedThread?._id === t._id;

              return (
                <button
                  key={t._id}
                  onClick={() => handleSelectThread(t)}
                  className={`w-full text-left px-3 py-2 text-sm border-b border-gray-100 flex flex-col hover:bg-slate-50 ${
                    isActive ? "bg-blue-50" : "bg-white"
                  }`}
                >
                  <span className="font-semibold truncate">
                    {otherName}
                  </span>
                  <span className="text-xs text-gray-500 truncate">
                    {jobTitle}
                  </span>
                  {t.lastMessage && (
                    <span className="text-[11px] text-gray-400 mt-0.5 truncate">
                      ล่าสุด: {t.lastMessage}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ขวา: กล่องข้อความ */}
        <div className="flex-1 flex flex-col">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            {selectedThread ? (
              <div className="flex flex-col">
                <span className="text-sm font-semibold">
                  แชทกับ{" "}
                  {headerDisplay?.otherName || "ไม่ทราบชื่อ"}
                </span>
                <span className="text-xs text-gray-500">
                  {headerDisplay?.jobTitle || "งานไม่ระบุ"}
                </span>
              </div>
            ) : (
              <span className="text-sm text-gray-500">
                เลือกห้องแชทจากด้านซ้าย
              </span>
            )}

            {/* ปุ่มปิดใน mobile */}
            <button
              onClick={onClose}
              className="md:hidden text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* รายการข้อความ */}
          <div className="flex-1 overflow-y-auto px-4 py-3 bg-slate-50">
            {!selectedThread && (
              <p className="text-xs text-gray-400">
                ยังไม่ได้เลือกห้องแชท
              </p>
            )}

            {selectedThread && loadingMessages && (
              <p className="text-xs text-gray-400">
                กำลังโหลดข้อความ...
              </p>
            )}

            {selectedThread &&
              !loadingMessages &&
              messages.map((m) => {
                const mine =
                  m.sender === meId ||
                  m.sender?._id?.toString?.() === meId;

                return (
                  <div
                    key={m._id}
                    className={`mb-2 flex ${
                      mine ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-3 py-2 text-xs ${
                        mine
                          ? "bg-blue-600 text-white rounded-br-none"
                          : "bg-white text-gray-800 border rounded-bl-none"
                      }`}
                    >
                      {!mine && (
                        <div className="text-[10px] text-gray-400 mb-0.5">
                          {m.sender?.name ||
                            m.sender?.email ||
                            "คู่สนทนา"}
                        </div>
                      )}
                      <div className="whitespace-pre-wrap break-words">
                        {m.text}
                      </div>
                      <div className="text-[9px] opacity-70 mt-0.5 text-right">
                        {m.createdAt
                          ? new Date(m.createdAt).toLocaleTimeString()
                          : ""}
                      </div>
                    </div>
                  </div>
                );
              })}

            <div ref={messagesEndRef} />
          </div>

          {/* กล่องพิมพ์ข้อความ */}
          <form
            onSubmit={handleSend}
            className="border-t px-3 py-2 flex items-center gap-2 bg-white"
          >
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                selectedThread
                  ? "พิมพ์ข้อความ..."
                  : "เลือกห้องแชทก่อน"
              }
              disabled={!selectedThread}
              className="flex-1 border rounded-full px-3 py-2 text-sm outline-none disabled:bg-slate-100"
            />
            <button
              type="submit"
              disabled={!selectedThread || !text.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              ส่ง
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
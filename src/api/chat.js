// src/api/chat.js
import { API_BASE } from "../api";

function authHeaders(token) {
  const realToken = token || localStorage.getItem("token") || "";
  const headers = { "Content-Type": "application/json" };
  if (realToken) headers.Authorization = `Bearer ${realToken}`;
  return headers;
}

// เริ่ม / สร้างห้องแชท
export async function ensureThread({ jobId, participantId, token }) {
  if (!jobId || !participantId) {
    throw new Error("ไม่พบข้อมูลงานหรือผู้สนทนา (jobId / participantId)");
  }

  const res = await fetch(`${API_BASE}/api/chats/start`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ jobId, participantId }),
  });

  let data;
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok) {
    console.error("❌ ensureThread failed:", res.status, data);
    throw new Error(
      data.message || `เริ่มแชทไม่สำเร็จ (HTTP ${res.status})`
    );
  }

  return data; // คือ object ของ ChatThread
}

// ดึงห้องแชทของเรา
export async function listMyThreads({ token } = {}) {
  const res = await fetch(`${API_BASE}/api/chats/my`, {
    headers: {
      Authorization: `Bearer ${token || localStorage.getItem("token") || ""}`,
    },
  });

  let data;
  try {
    data = await res.json();
  } catch {
    data = [];
  }

  if (!res.ok) {
    console.error("❌ listMyThreads failed:", res.status, data);
    throw new Error(data.message || "ดึงรายการแชทไม่สำเร็จ");
  }

  return Array.isArray(data) ? data : [];
}

// ดึงข้อความในห้องแชท
export async function fetchMessages({ threadId, after, token }) {
  const url = new URL(`${API_BASE}/api/chats/${threadId}/messages`);
  if (after) url.searchParams.set("after", after);

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token || localStorage.getItem("token") || ""}`,
    },
  });

  let data;
  try {
    data = await res.json();
  } catch {
    data = [];
  }

  if (!res.ok) {
    console.error("❌ fetchMessages failed:", res.status, data);
    throw new Error(data.message || "ดึงข้อความไม่สำเร็จ");
  }

  return Array.isArray(data) ? data : [];
}

// ส่งข้อความ
export async function sendMessage({ threadId, text, token }) {
  const res = await fetch(`${API_BASE}/api/chats/${threadId}/messages`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ text }),
  });

  let data;
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok) {
    console.error("❌ sendMessage failed:", res.status, data);
    throw new Error(data.message || "ส่งข้อความไม่สำเร็จ");
  }

  return data;
}

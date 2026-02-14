// src/api/chat.js
import { API_BASE } from "../api";

function authHeaders(token) {
  const realToken = token || localStorage.getItem("token") || "";
  const headers = { "Content-Type": "application/json" };
  if (realToken) headers.Authorization = `Bearer ${realToken}`;
  return headers;
}

/**
 * เริ่ม / สร้างห้องแชทสำหรับงาน
 * ใช้ได้ 2 แบบ:
 *   ensureThread({ jobId, participantId, token })
 *   ensureThread(jobId, participantId, token)
 */
export async function ensureThread(arg1, arg2, arg3) {
  let jobId, participantId, token;

  if (typeof arg1 === "object" && arg1 !== null) {
    jobId = arg1.jobId;
    participantId = arg1.participantId;
    token = arg1.token;
  } else {
    jobId = arg1;
    participantId = arg2;
    token = arg3;
  }

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
    throw new Error(
      data.message || `เริ่มแชทไม่สำเร็จ (HTTP ${res.status})`
    );
  }

  return data;
}

/**
 * ดึงห้องแชทของเรา
 * ใช้ได้ 2 แบบ:
 *   listMyThreads({ token })
 *   listMyThreads(token)
 */
export async function listMyThreads(arg) {
  const token =
    typeof arg === "string" ? arg : arg && typeof arg === "object"
      ? arg.token
      : undefined;

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
    throw new Error(data.message || "ดึงรายการแชทไม่สำเร็จ");
  }

  return Array.isArray(data) ? data : [];
}

/**
 * ดึงข้อความในห้องแชท
 * ใช้ได้ 2 แบบ:
 *   fetchMessages({ threadId, after, token })
 *   fetchMessages(threadId, token)
 */
export async function fetchMessages(arg1, arg2) {
  let threadId, after, token;

  if (typeof arg1 === "object" && arg1 !== null) {
    threadId = arg1.threadId;
    after = arg1.after;
    token = arg1.token;
  } else {
    threadId = arg1;
    token = arg2;
  }

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
    throw new Error(data.message || "ดึงข้อความไม่สำเร็จ");
  }

  return Array.isArray(data) ? data : [];
}

/**
 * ส่งข้อความ
 * ใช้ได้ 2 แบบ:
 *   sendMessage({ threadId, text, token })
 *   sendMessage(threadId, text, token)
 */
export async function sendMessage(arg1, arg2, arg3) {
  let threadId, text, token;

  if (typeof arg1 === "object" && arg1 !== null) {
    threadId = arg1.threadId;
    text = arg1.text;
    token = arg1.token;
  } else {
    threadId = arg1;
    text = arg2;
    token = arg3;
  }

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
    throw new Error(data.message || "ส่งข้อความไม่สำเร็จ");
  }

  return data;
}

/**
 * ติดต่อแอดมิน – คืน thread ของห้องแชทแอดมิน
 * ใช้ได้ 2 แบบ:
 *   contactAdmin({ token })
 *   contactAdmin(token)
 */
export async function contactAdmin(arg) {
  const token =
    typeof arg === "string" ? arg : arg && typeof arg === "object"
      ? arg.token
      : undefined;

  const res = await fetch(`${API_BASE}/api/chats/contact-admin`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({}),
  });

  let data;
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok) {
    throw new Error(data.message || "ไม่สามารถติดต่อแอดมินได้");
  }

  return data;
}

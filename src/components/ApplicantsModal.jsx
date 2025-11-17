// src/components/ApplicantsModal.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  X,
  Users,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Download,
  FileText,
  MessageCircle,
} from "lucide-react";
import { API_BASE } from "../api";
import { ensureThread } from "../api/chat";

export default function ApplicantsModal({
  open,
  onClose,
  job,
  token,

  applicants: extApplicants,
  loading: extLoading,
  error: extError,
  onRefresh,

  // callback เปิดแชท จาก JobSearchHome หรือจากหน้าอื่น
  onOpenChat,
}) {
  const [intLoading, setIntLoading] = useState(false);
  const [intError, setIntError] = useState("");
  const [intApplicants, setIntApplicants] = useState([]);

  // --- helper หา id ผู้สมัครให้ชัดเจนที่เดียว ---
  const getParticipantId = (app) => {
    if (!app) return null;
    // applicant อาจจะเป็น object, id ตรง ๆ หรือเก็บไว้ใน applicantId
    return (
      app.applicant?._id ||
      app.applicantId ||
      (typeof app.applicant === "string" ? app.applicant : null)
    );
  };

  const controlled = useMemo(
    () =>
      typeof extApplicants !== "undefined" ||
      typeof extLoading !== "undefined" ||
      typeof extError !== "undefined",
    [extApplicants, extLoading, extError]
  );

  const loadInternal = async () => {
    if (!job?._id) return;
    setIntLoading(true);
    setIntError("");
    try {
      const res = await fetch(`${API_BASE}/api/jobs/${job._id}/applications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.message || "ดึงรายชื่อผู้สมัครไม่สำเร็จ");
      setIntApplicants(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("โหลดรายชื่อผู้สมัคร error:", e);
      setIntApplicants([]);
      setIntError(e.message || "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้");
    } finally {
      setIntLoading(false);
    }
  };

  useEffect(() => {
    if (open && job?._id && !controlled) {
      loadInternal();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, job?._id, controlled]);

  const applicants = controlled ? extApplicants || [] : intApplicants;
  const loading = controlled ? !!extLoading : intLoading;
  const error = controlled ? extError || "" : intError;

  // ------------------ ฟังก์ชันเริ่มแชท ------------------
  const handleStartChat = async (app) => {
    if (!job?._id || !app) {
      alert("ไม่พบข้อมูลผู้สมัครหรือรหัสงาน");
      return;
    }

    const participantId = getParticipantId(app);

    if (!participantId) {
      console.error("ไม่มี participantId ใน application:", app);
      alert("ไม่พบรหัสผู้ใช้ของผู้สมัคร (participantId)");
      return;
    }

    try {
      const payload = {
        jobId: job._id,
        // บังคับเป็น string กัน backend งง
        participantId: String(participantId),
      };
      console.log("ensureThread payload:", payload);

      const thread = await ensureThread({
        ...payload,
        token,
      });

      console.log("ensureThread success, thread:", thread);

      if (typeof onOpenChat === "function") {
        onOpenChat(thread);
      } else {
        alert("สร้างห้องแชทสำเร็จ");
      }
    } catch (e) {
      console.error("❌ start chat error:", e);
      alert(e.message || "เกิดข้อผิดพลาดในการสร้างห้องแชท");
    }
  };
  // ------------------------------------------------------

  // อัปเดตสถานะใบสมัคร + ถ้า hired → ensureThread อัตโนมัติ
  const patchStatus = async (app, status) => {
    try {
      const res = await fetch(
        `${API_BASE}/api/applications/${app._id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        console.error("อัปเดตสถานะใบสมัคร error:", data);
        alert(data.message || "อัปเดตสถานะไม่สำเร็จ");
        return;
      }

      // ถ้ารับเข้าทำงาน → พยายามสร้างห้องแชทให้ด้วย
      if (status === "hired") {
        try {
          const participantId = getParticipantId(app);

          if (!participantId) {
            console.warn(
              "hired แต่ไม่มี participantId ไม่สามารถสร้างห้องแชทอัตโนมัติได้",
              app
            );
          } else {
            const payload = {
              jobId: job._id,
              participantId: String(participantId),
            };
            console.log("ensureThread (from hired) payload:", payload);

            const thread = await ensureThread({
              ...payload,
              token,
            });
            console.log("ensureThread (from hired) success:", thread);
            if (typeof onOpenChat === "function") {
              onOpenChat(thread);
            }
          }
        } catch (e) {
          console.error("ensureThread เมื่อ hired error:", e);
          alert(
            e.message ||
              "สร้างห้องแชทไม่สำเร็จ แต่สถานะใบสมัครถูกอัปเดตแล้ว"
          );
        }
      }

      if (typeof onRefresh === "function") onRefresh();
      else await loadInternal();
    } catch (e) {
      console.error("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ตอน patchStatus:", e);
      alert("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้");
    }
  };

  if (!open || !job) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 relative shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Users className="w-5 h-5" />
            ผู้สมัครงาน: {job.title} • {job.jobCode}
          </h2>
          <p className="text-sm text-gray-500">{job.company}</p>
        </div>

        {loading && <p className="text-sm text-gray-500">กำลังโหลด...</p>}
        {!!error && (
          <div className="bg-red-100 text-red-600 px-3 py-2 rounded-lg text-sm mb-3">
            {error}
          </div>
        )}
        {!loading && applicants.length === 0 && !error && (
          <p className="text-sm text-gray-400">ยังไม่มีผู้สมัคร</p>
        )}

        <div className="space-y-3">
          {applicants.map((a) => (
            <div key={a._id} className="border rounded-lg p-4 bg-white">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <p className="font-semibold">
                    {a.applicantName || "ผู้ใช้"}
                  </p>
                  <p className="text-sm text-gray-600">
                    {a.applicantEmail || "—"}
                  </p>

                  {a.message && (
                    <div className="mt-2 text-sm text-gray-700 whitespace-pre-line">
                      <span className="font-medium inline-flex items-center gap-1">
                        <FileText className="w-4 h-4" />
                        ข้อความถึงผู้ว่าจ้าง:
                      </span>
                      <div className="mt-1">{a.message}</div>
                    </div>
                  )}

                  {a.personalProfile && (
                    <p className="mt-1 text-sm text-gray-700 whitespace-pre-line">
                      <span className="font-medium">โปรไฟล์ย่อ:</span>{" "}
                      {a.personalProfile}
                    </p>
                  )}

                  <p className="text-xs text-gray-400 mt-1">
                    สมัครเมื่อ:{" "}
                    {a.createdAt
                      ? new Date(a.createdAt).toLocaleString()
                      : "—"}
                  </p>
                </div>

                <div className="text-right">
                  {/* ลิงก์เรซูเม่ */}
                  <div className="flex items-center gap-2 justify-end">
                    {a.resumePath ? (
                      <a
                        href={`${API_BASE}/${String(a.resumePath).replace(
                          /^\/?/,
                          ""
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                        title="ดาวน์โหลดเรซูเม่"
                      >
                        <Download className="w-4 h-4" />
                        ดาวน์โหลดเรซูเม่
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400">
                        ไม่มีเรซูเม่แนบ
                      </span>
                    )}
                  </div>

                  {/* สถานะ */}
                  <div className="mt-2">
                    <span
                      className={
                        "text-xs px-2 py-1 rounded-full " +
                        ((a.status || "pending") === "hired"
                          ? "bg-green-100 text-green-700"
                          : (a.status || "pending") === "rejected"
                          ? "bg-red-100 text-red-600"
                          : "bg-gray-100 text-gray-600")
                      }
                    >
                      {a.status || "pending"}
                    </span>
                  </div>

                  {/* ปุ่มต่าง ๆ */}
                  <div className="flex flex-wrap gap-2 mt-3 justify-end">
                    {/* ปุ่มเริ่มแชท */}
                    <button
                      onClick={() => handleStartChat(a)}
                      className="inline-flex items-center gap-1 text-blue-700 bg-blue-100 hover:bg-blue-200 px-2 py-1 rounded"
                    >
                      <MessageCircle className="w-4 h-4" />
                      เริ่มแชท
                    </button>

                    <button
                      onClick={() => patchStatus(a, "hired")}
                      className="inline-flex items-center gap-1 text-green-700 bg-green-100 hover:bg-green-200 px-2 py-1 rounded"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      รับเข้าทำงาน
                    </button>
                    <button
                      onClick={() => patchStatus(a, "rejected")}
                      className="inline-flex items-center gap-1 text-red-700 bg-red-100 hover:bg-red-200 px-2 py-1 rounded"
                    >
                      <XCircle className="w-4 h-4" />
                      ปฏิเสธ
                    </button>
                    <button
                      onClick={() => patchStatus(a, "pending")}
                      className="inline-flex items-center gap-1 text-gray-700 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
                    >
                      <RotateCcw className="w-4 h-4" />
                      กลับเป็นรอตรวจ
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
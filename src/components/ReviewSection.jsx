// src/components/ReviewSection.jsx
import React, { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { API_BASE, authHeader } from "../api";

export default function ReviewSection({ jobId, readOnly = false, isJobOwner = false }) {
  const [reviews, setReviews] = useState([]);
  const [canReview, setCanReview] = useState(false);
  const [checkReason, setCheckReason] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [loadingCheck, setLoadingCheck] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  
  // State สำหรับการตอบกลับ
  const [replyingTo, setReplyingTo] = useState(null); // review ID ที่กำลังตอบกลับ
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);

  // โหลดรีวิวทั้งหมดของงานนี้
  const loadReviews = async () => {
    if (!jobId) return;
    setLoadingReviews(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/api/reviews/job/${jobId}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "โหลดรีวิวไม่สำเร็จ");
      }
      setReviews(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setError(e.message || "โหลดรีวิวไม่สำเร็จ");
    } finally {
      setLoadingReviews(false);
    }
  };

  // เช็คว่าสามารถรีวิวได้ไหม
  const checkCanReview = async () => {
    if (!jobId) return;
    setLoadingCheck(true);
    setCheckReason("");
    try {
      const res = await fetch(`${API_BASE}/api/reviews/can-review/${jobId}`, {
        headers: {
          ...authHeader(),
        },
      });

      // ถ้าไม่ล็อกอินเลย backend จะส่ง 401 กลับมา
      if (res.status === 401) {
        setCanReview(false);
        setCheckReason("กรุณาเข้าสู่ระบบเพื่อเขียนรีวิว");
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "ตรวจสอบสิทธิ์รีวิวไม่สำเร็จ");
      }

      setCanReview(!!data.canReview);
      if (!data.canReview && data.message) {
        setCheckReason(data.message);
      } else {
        setCheckReason("");
      }
    } catch (e) {
      console.error(e);
      setCanReview(false);
      setCheckReason(e.message || "ตรวจสอบสิทธิ์รีวิวไม่สำเร็จ");
    } finally {
      setLoadingCheck(false);
    }
  };

useEffect(() => {
  loadReviews();
  if (!readOnly) {
    checkCanReview();
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [jobId, readOnly]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canReview || !jobId) return;
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/api/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeader(),
        },
        body: JSON.stringify({ jobId, rating, comment }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "ส่งรีวิวไม่สำเร็จ");
      }

      // เคลียร์ฟอร์ม + โหลดรีวิวใหม่ + บอกว่าหมดสิทธิ์แล้ว (กันรีวิวซ้ำ)
      setComment("");
      setRating(5);
      await loadReviews();
      await checkCanReview();
    } catch (e) {
      console.error(e);
      setError(e.message || "ส่งรีวิวไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  // ✅ ฟังก์ชันตอบกลับรีวิว (สำหรับเจ้าของงาน)
  const handleReplySubmit = async (reviewId) => {
    if (!replyText.trim()) return;
    
    setSubmittingReply(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/api/reviews/${reviewId}/reply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeader(),
        },
        body: JSON.stringify({ replyText }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "ตอบกลับไม่สำเร็จ");
      }

      // รีเฟรชรีวิว
      await loadReviews();
      setReplyingTo(null);
      setReplyText("");
    } catch (e) {
      console.error(e);
      setError(e.message || "ตอบกลับไม่สำเร็จ");
    } finally {
      setSubmittingReply(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* สถานะโหลด / error */}
      {loadingReviews && (
        <p className="text-xs text-gray-500">กำลังโหลดรีวิว...</p>
      )}
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

      {/* รายการรีวิว */}
      {reviews.length === 0 && !loadingReviews && !error && (
        <p className="text-xs text-gray-400">ยังไม่มีรีวิวสำหรับงานนี้</p>
      )}

      {reviews.map((r) => (
        <div key={r._id} className="bg-gray-50 rounded-xl p-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold">
              {r.user?.name || "ผู้ใช้ไม่ระบุชื่อ"}
            </p>
            <div className="flex items-center gap-1 text-yellow-500 text-xs">
              {Array.from({ length: r.rating || 0 }).map((_, i) => (
                <Star key={i} className="w-3 h-3 fill-current" />
              ))}
            </div>
          </div>
          <p className="text-[11px] text-gray-400">
            {r.createdAt && new Date(r.createdAt).toLocaleString()}
          </p>
          <p className="text-sm text-gray-700 mt-1 whitespace-pre-line">
            {r.comment}
          </p>

          {/* ✅ การตอบกลับจากผู้ว่าจ้าง */}
          {r.employerReply && r.employerReply.text && (
            <div className="mt-2 ml-4 pl-3 border-l-2 border-blue-300 bg-blue-50 rounded-r-lg p-2">
              <p className="text-xs font-semibold text-blue-900 mb-1">
                💼 ตอบกลับจากผู้ว่าจ้าง
              </p>
              <p className="text-xs text-blue-800 whitespace-pre-line">
                {r.employerReply.text}
              </p>
              <p className="text-[10px] text-blue-600 mt-1">
                {r.employerReply.repliedAt && new Date(r.employerReply.repliedAt).toLocaleString()}
              </p>
            </div>
          )}

          {/* ✅ ปุ่มตอบกลับ (แสดงเฉพาะเจ้าของงาน และยังไม่มีการตอบกลับ) */}
          {isJobOwner && !r.employerReply?.text && (
            <div className="mt-2">
              {replyingTo === r._id ? (
                <div className="space-y-2">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={2}
                    placeholder="เขียนข้อความตอบกลับ..."
                    className="w-full border rounded-lg text-xs px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReplySubmit(r._id)}
                      disabled={submittingReply || !replyText.trim()}
                      className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {submittingReply ? "กำลังส่ง..." : "ส่งคำตอบ"}
                    </button>
                    <button
                      onClick={() => {
                        setReplyingTo(null);
                        setReplyText("");
                      }}
                      className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded-lg hover:bg-gray-300"
                    >
                      ยกเลิก
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setReplyingTo(r._id)}
                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                >
                  💬 ตอบกลับรีวิวนี้
                </button>
              )}
            </div>
          )}
        </div>
      ))}

      {/* ข้อความบอกสิทธิ์ (แสดงเฉพาะฝั่งผู้สมัคร) */}
      {!readOnly && !loadingCheck && checkReason && (
        <p className="text-[11px] text-gray-500">
          {checkReason}
        </p>
      )}

      {/* ฟอร์มเขียนรีวิว – แสดงเฉพาะตอนที่ backend อนุญาต และไม่ใช่โหมด readOnly */}
      {!readOnly && canReview && (
        <form onSubmit={handleSubmit} className="space-y-2 mt-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">ให้คะแนน:</span>
            <select
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              className="border rounded-lg text-xs px-2 py-1"
            >
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} ดาว
                </option>
              ))}
            </select>
          </div>

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder="เขียนความเห็นเกี่ยวกับงาน/บริษัท..."
            className="w-full border rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-blue-700 disabled:opacity-60"
          >
            {submitting ? "กำลังส่งรีวิว..." : "ส่งรีวิว"}
          </button>
        </form>
      )}
    </div>
  );
}

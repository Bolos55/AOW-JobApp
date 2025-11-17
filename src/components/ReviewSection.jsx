// src/components/ReviewSection.jsx
import React, { useEffect, useState } from "react";
import { MessageCircle, Star } from "lucide-react";
import { API_BASE, authHeader } from "../api";

export default function ReviewSection({ jobId }) {
  const [reviews, setReviews] = useState([]);
  const [lock, setLock] = useState({ locked: false, reason: "" });
  const [text, setText] = useState("");
  const [rating, setRating] = useState(5);

  // โหลดรีวิว
  useEffect(() => {
    if (!jobId) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/jobs/${jobId}/reviews`, {
          headers: { ...authHeader() },
        });
        if (res.status === 403) {
          const d = await res.json().catch(() => ({}));
          setLock({ locked: true, reason: d.message || "" });
          setReviews([]);
          return;
        }
        const data = await res.json();
        setReviews(Array.isArray(data) ? data : []);
        setLock({ locked: false, reason: "" });
      } catch {
        setReviews([]);
      }
    })();
  }, [jobId]);

  // ส่งรีวิว
  const submit = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/jobs/${jobId}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeader(),
        },
        body: JSON.stringify({ rating, comment: text }),
      });
      if (res.status === 403) {
        const j = await res.json().catch(() => ({}));
        alert(j.message || "ยังไม่สามารถรีวิวงานนี้ได้");
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "รีวิวไม่ได้");
        return;
      }
      setReviews((p) => [data, ...p]);
      setText("");
      setRating(5);
    } catch {
      alert("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้");
    }
  };

  return (
    <div className="border-t pt-4">
      <h3 className="font-semibold mb-3 flex items-center gap-2">
        <MessageCircle className="w-4 h-4" />
        รีวิวงานนี้
      </h3>

      {lock.locked ? (
        <div className="bg-yellow-50 text-yellow-700 text-sm p-3 rounded-lg mb-3">
          {lock.reason ||
            "รีวิวและประวัติรีวิวจะเปิดให้เฉพาะผู้ที่ทำงานนี้เสร็จแล้ว ภายใน 7 วันหลังปิดงาน"}
        </div>
      ) : (
        <>
          {/* ฟอร์มรีวิว */}
          <div className="mb-4 bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  className={n <= rating ? "text-yellow-400" : "text-gray-300"}
                >
                  <Star className="w-5 h-5" />
                </button>
              ))}
            </div>
            <textarea
              className="w-full border rounded-md px-3 py-2 text-sm mb-2"
              placeholder="เขียนความเห็นของคุณ"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button onClick={submit} className="bg-blue-600 text-white text-sm px-4 py-2 rounded-md">
              ส่งรีวิว
            </button>
          </div>

          {/* รายการรีวิว */}
          <div className="space-y-3">
            {reviews.length === 0 && (
              <p className="text-xs text-gray-400">ยังไม่มีรีวิวสำหรับงานนี้</p>
            )}
            {reviews.map((rv) => (
              <div key={rv._id} className="border rounded-lg p-3 bg-white text-sm">
                <div className="flex justify-between items-center mb-1">
                  <p className="font-medium">{rv.userName || "ผู้ใช้"}</p>
                  <p className="flex gap-1">
                    {Array.from({ length: rv.rating || 5 }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-yellow-400" />
                    ))}
                  </p>
                </div>
                <p className="text-gray-600">{rv.comment}</p>
                <p className="text-[10px] text-gray-400 mt-1">
                  {rv.createdAt ? new Date(rv.createdAt).toLocaleString() : ""}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
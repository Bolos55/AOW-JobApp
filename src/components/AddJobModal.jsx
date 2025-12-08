// src/components/AddJobModal.jsx
import React, { useState } from "react";
import { X } from "lucide-react";
import { API_BASE, authHeader } from "../api";

// ✅ หมวดหมู่งาน (Job Categories)
const CATEGORIES = [
  { id: "it", name: "IT & Tech" },
  { id: "mkt", name: "การตลาด" },
  { id: "acc", name: "บัญชี" },
  { id: "pt", name: "พาร์ทไทม์ (ทั่วไป)" },
  { id: "remote", name: "รีโมต (ทั่วไป)" },

  { id: "law", name: "งานกฎหมาย" },
  { id: "arch", name: "งานสถาปัตย์/เขียนแบบ" },
  { id: "fin", name: "งานการเงิน/ธนาคาร" },
  { id: "sale", name: "งานขาย/เซลส์" },
  { id: "cs", name: "งานบริการลูกค้า/คอลเซ็นเตอร์" },
  { id: "hr", name: "งานทรัพยากรบุคคล (HR)" },
  { id: "admin", name: "งานธุรการ/ประสานงาน/เลขา" },
  { id: "logistic", name: "งานขนส่ง/โลจิสติกส์/คลังสินค้า" },
  { id: "driver", name: "งานขับรถ" },

  { id: "design", name: "งานออกแบบ/กราฟิก/สื่อสร้างสรรค์" },
  { id: "content", name: "งานคอนเทนต์/โซเชียลมีเดีย" },
  { id: "media", name: "งานสื่อ/โฆษณา/ประชาสัมพันธ์" },

  { id: "eng", name: "งานวิศวกรรม/ช่างเทคนิค" },
  { id: "factory", name: "งานผลิต/ควบคุมคุณภาพ/โรงงาน" },

  { id: "health", name: "งานการแพทย์/พยาบาล/เภสัช" },
  { id: "beauty", name: "งานความงาม/สปา/ฟิตเนส" },

  { id: "hotel", name: "งานโรงแรม/ท่องเที่ยว/ร้านอาหาร" },
  { id: "service", name: "งานบริการทั่วไป" },

  { id: "teacher", name: "งานสอน/ติวเตอร์/การศึกษา" },
  { id: "research", name: "งานวิจัย/วิเคราะห์ข้อมูล" },

  { id: "house", name: "งานแม่บ้าน/ทำความสะอาด/ซักรีด" },
  { id: "security", name: "งานรักษาความปลอดภัย" },

  { id: "agri", name: "งานเกษตร/ปศุสัตว์/ประมง" },
  { id: "pet", name: "งานดูแลสัตว์เลี้ยง" },

  { id: "other", name: "อื่นๆ" },
];

const emptyForm = {
  title: "",
  company: "",
  description: "",
  minSalary: "",
  maxSalary: "",
  skills: [],
  category: "it",
  type: "Full-time",
  workMode: "On-site",
  location: "",
  mapLink: "",
  workingHours: "",
  dayOff: "",
  benefits: "",
  contactEmail: "",
  contactPhone: "",
  contactWebsite: "",
  deadline: "",
};

const salaryText = (min, max) => {
  const a = Number(min || 0);
  const b = Number(max || 0);
  if (!a && !b) return "ตามตกลง";
  if (a && b) return `฿${a.toLocaleString()} - ฿${b.toLocaleString()}`;
  if (a && !b) return `เริ่มต้น ฿${a.toLocaleString()}`;
  if (!a && b) return `สูงสุด ฿${b.toLocaleString()}`;
  return "ตามตกลง";
};

export default function AddJobModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState(emptyForm);
  const [skillInput, setSkillInput] = useState("");
  const [message, setMessage] = useState("");

  if (!open) return null;

  const addSkillFromInput = () => {
    const v = skillInput.trim();
    if (!v) return;
    if (form.skills.includes(v)) {
      setSkillInput("");
      return;
    }
    setForm((p) => ({ ...p, skills: [...p.skills, v] }));
    setSkillInput("");
  };

  const removeSkill = (s) => {
    setForm((p) => ({ ...p, skills: p.skills.filter((x) => x !== s) }));
  };

  const validateForm = () => {
    if (!form.title.trim()) return "กรุณากรอกชื่อตำแหน่งงาน";
    if (!form.company.trim()) return "กรุณากรอกชื่อบริษัท";
    if (!form.description.trim() || form.description.trim().length < 50)
      return "กรุณากรอกรายละเอียดงานอย่างน้อย 50 ตัวอักษร";
    const min = Number(form.minSalary || 0);
    const max = Number(form.maxSalary || 0);
    if (min && max && min > max) return "เงินเดือนขั้นต่ำต้องไม่มากกว่าสูงสุด";
    if (form.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail))
      return "อีเมลติดต่อไม่ถูกต้อง";
    return "";
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    const err = validateForm();
    if (err) return setMessage(err);
    setMessage("");

    const payload = {
      title: form.title,
      company: form.company,
      salary: salaryText(form.minSalary, form.maxSalary),
      location: form.location || "ไม่ระบุ",
      type: form.type,
      category: form.category || "it",
      description: form.description,
      skills: form.skills,
      workMode: form.workMode,
      mapLink: form.mapLink,
      workingHours: form.workingHours,
      dayOff: form.dayOff,
      benefits: form.benefits,
      contactEmail: form.contactEmail,
      contactPhone: form.contactPhone,
      contactWebsite: form.contactWebsite,
      deadline: form.deadline,
    };

    try {
      const res = await fetch(`${API_BASE}/api/jobs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeader(),          // ✅ ดึง token จาก localStorage
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMessage(data.message || "เพิ่มงานไม่สำเร็จ");
        return;
      }

      // ✅ แจ้งให้ parent รู้ว่าเพิ่มงานสำเร็จแล้ว
      onCreated?.(data);

      // เคลียร์ฟอร์ม + ปิด modal
      setForm(emptyForm);
      setSkillInput("");
      onClose?.();
    } catch (err) {
      console.error("POST /api/jobs error:", err);
      setMessage("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl relative flex flex-col max-h-[90vh]">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="px-6 pt-6 pb-2">
          <h2 className="text-xl font-bold">เพิ่มงานใหม่</h2>
          {message && (
            <div className="bg-red-100 text-red-600 px-3 py-2 rounded-lg text-sm mt-3">
              {message}
            </div>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-6 pt-2 pb-4 space-y-5"
        >
          {/* แถว: ชื่อตำแหน่ง / บริษัท */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ชื่อตำแหน่งงาน *
              </label>
              <input
                className="w-full border rounded-xl px-3 py-2 text-sm"
                value={form.title}
                onChange={(e) =>
                  setForm((p) => ({ ...p, title: e.target.value }))
                }
                placeholder="เช่น Frontend Developer"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                บริษัท *
              </label>
              <input
                className="w-full border rounded-xl px-3 py-2 text-sm"
                value={form.company}
                onChange={(e) =>
                  setForm((p) => ({ ...p, company: e.target.value }))
                }
                placeholder="เช่น Fastmark Co., Ltd."
                required
              />
            </div>
          </div>

          {/* เงินเดือน */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ช่วงเงินเดือน
            </label>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                min="0"
                className="w-full border rounded-xl px-3 py-2 text-sm"
                value={form.minSalary}
                onChange={(e) =>
                  setForm((p) => ({ ...p, minSalary: e.target.value }))
                }
                placeholder="ขั้นต่ำ (บาท)"
              />
              <input
                type="number"
                min="0"
                className="w-full border rounded-xl px-3 py-2 text-sm"
                value={form.maxSalary}
                onChange={(e) =>
                  setForm((p) => ({ ...p, maxSalary: e.target.value }))
                }
                placeholder="สูงสุด (บาท)"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              แสดงผลเป็น: {salaryText(form.minSalary, form.maxSalary)}
            </p>
          </div>

          {/* รายละเอียดงาน */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              รายละเอียดงาน *
            </label>
            <textarea
              className="w-full border rounded-xl px-3 py-2 text-sm min-h-[120px]"
              value={form.description}
              onChange={(e) =>
                setForm((p) => ({ ...p, description: e.target.value }))
              }
              placeholder="สรุปหน้าที่ ความรับผิดชอบ และคุณสมบัติ"
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              อย่างน้อย 50 ตัวอักษร (ปัจจุบัน {form.description.trim().length} ตัว)
            </p>
          </div>

          {/* ทักษะ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ทักษะที่ต้องการ
            </label>
            <div className="flex gap-2">
              <input
                className="flex-1 border rounded-xl px-3 py-2 text-sm"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSkillFromInput();
                  }
                }}
                placeholder="เช่น React, Node.js (กด Enter เพื่อเพิ่ม)"
              />
              <button
                type="button"
                onClick={addSkillFromInput}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm"
              >
                เพิ่ม
              </button>
            </div>
            {form.skills.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {form.skills.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs"
                  >
                    {s}
                    <button
                      type="button"
                      onClick={() => removeSkill(s)}
                      className="hover:text-red-600"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* ประเภท/หมวด/โหมดทำงาน */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ประเภทงาน
              </label>
              <select
                className="w-full border rounded-xl px-3 py-2 text-sm"
                value={form.type}
                onChange={(e) =>
                  setForm((p) => ({ ...p, type: e.target.value }))
                }
              >
                <option>Full-time</option>
                <option>Part-time</option>
                <option>Contract</option>
                <option>Internship</option>
                <option>Freelance</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                หมวดหมู่
              </label>
              <select
                className="w-full border rounded-xl px-3 py-2 text-sm"
                value={form.category}
                onChange={(e) =>
                  setForm((p) => ({ ...p, category: e.target.value }))
                }
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                โหมดการทำงาน
              </label>
              <select
                className="w-full border rounded-xl px-3 py-2 text-sm"
                value={form.workMode}
                onChange={(e) =>
                  setForm((p) => ({ ...p, workMode: e.target.value }))
                }
              >
                <option>On-site</option>
                <option>Hybrid</option>
                <option>Remote</option>
              </select>
            </div>
          </div>

          {/* สถานที่/ลิงก์แผนที่ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                สถานที่ทำงาน
              </label>
              <input
                className="w-full border rounded-xl px-3 py-2 text-sm"
                value={form.location}
                onChange={(e) =>
                  setForm((p) => ({ ...p, location: e.target.value }))
                }
                placeholder="เช่น Bangkok, Thailand"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ลิงก์แผนที่ (ถ้ามี)
              </label>
              <input
                className="w-full border rounded-xl px-3 py-2 text-sm"
                value={form.mapLink}
                onChange={(e) =>
                  setForm((p) => ({ ...p, mapLink: e.target.value }))
                }
                placeholder="ลิงก์ Google Maps"
              />
            </div>
          </div>

          {/* เวลา/วันหยุด/สวัสดิการ */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                เวลาทำงาน
              </label>
              <input
                className="w-full border rounded-xl px-3 py-2 text-sm"
                value={form.workingHours}
                onChange={(e) =>
                  setForm((p) => ({ ...p, workingHours: e.target.value }))
                }
                placeholder="เช่น จันทร์–ศุกร์ 9:00–18:00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                วันหยุด
              </label>
              <input
                className="w-full border rounded-xl px-3 py-2 text-sm"
                value={form.dayOff}
                onChange={(e) =>
                  setForm((p) => ({ ...p, dayOff: e.target.value }))
                }
                placeholder="เช่น หยุดเสาร์–อาทิตย์"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                วันปิดรับสมัคร
              </label>
              <input
                type="date"
                className="w-full border rounded-xl px-3 py-2 text-sm"
                value={form.deadline}
                onChange={(e) =>
                  setForm((p) => ({ ...p, deadline: e.target.value }))
                }
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              สวัสดิการ
            </label>
            <textarea
              className="w-full border rounded-xl px-3 py-2 text-sm min-h-[90px]"
              value={form.benefits}
              onChange={(e) =>
                setForm((p) => ({ ...p, benefits: e.target.value }))
              }
              placeholder="เช่น ประกันสุขภาพ/โบนัส/OT/กองทุนสำรองเลี้ยงชีพ"
            />
          </div>

          {/* ติดต่อ */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                อีเมลติดต่อ
              </label>
              <input
                type="email"
                className="w-full border rounded-xl px-3 py-2 text-sm"
                value={form.contactEmail}
                onChange={(e) =>
                  setForm((p) => ({ ...p, contactEmail: e.target.value }))
                }
                placeholder="hr@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                เบอร์ติดต่อ
              </label>
              <input
                className="w-full border rounded-xl px-3 py-2 text-sm"
                value={form.contactPhone}
                onChange={(e) =>
                  setForm((p) => ({ ...p, contactPhone: e.target.value }))
                }
                placeholder="080-xxx-xxxx"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                เว็บไซต์/ลิงก์
              </label>
              <input
                className="w-full border rounded-xl px-3 py-2 text-sm"
                value={form.contactWebsite}
                onChange={(e) =>
                  setForm((p) => ({ ...p, contactWebsite: e.target.value }))
                }
                placeholder="ลิงก์ประกาศงาน/เว็บไซต์บริษัท"
              />
            </div>
          </div>
        </form>

        <div className="px-6 py-4 border-t flex gap-3">
          <button
            type="button"
            onClick={handleSubmit}
            className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-medium text-center"
          >
            บันทึกงาน
          </button>
          <button
            type="button"
            onClick={() => setForm(emptyForm)}
            className="px-4 py-3 rounded-xl border text-gray-600"
          >
            ล้างฟอร์ม
          </button>
        </div>
      </div>
    </div>
  );
}

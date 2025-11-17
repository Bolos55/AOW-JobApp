// src/utils/jobs.js

// แปลงช่วงเงินเดือนเป็นข้อความสั้น
export function salaryText(min, max) {
  const a = Number(min || 0);
  const b = Number(max || 0);
  if (!a && !b) return "ตามตกลง";
  if (a && b) return `฿${a.toLocaleString()} - ฿${b.toLocaleString()}`;
  if (a && !b) return `เริ่มต้น ฿${a.toLocaleString()}`;
  if (!a && b) return `สูงสุด ฿${b.toLocaleString()}`;
  return "ตามตกลง";
}

// ตรวจฟอร์มโพสต์งาน
export function validateJobForm(form) {
  if (!form.title?.trim()) return "กรุณากรอกชื่อตำแหน่งงาน";
  if (!form.company?.trim()) return "กรุณากรอกชื่อบริษัท";
  if (!form.description?.trim() || form.description.trim().length < 50)
    return "กรุณากรอกรายละเอียดงานอย่างน้อย 50 ตัวอักษร";
  const min = Number(form.minSalary || 0);
  const max = Number(form.maxSalary || 0);
  if (min && max && min > max) return "เงินเดือนขั้นต่ำต้องน้อยกว่าหรือเท่ากับเงินเดือนสูงสุด";
  if (form.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail))
    return "อีเมลติดต่อไม่ถูกต้อง";
  return "";
}
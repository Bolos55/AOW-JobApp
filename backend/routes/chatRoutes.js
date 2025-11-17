// backend/routes/chatRoutes.js
import express from "express";
import ChatThread from "../models/ChatThread.js";
import ChatMessage from "../models/ChatMessage.js";
import Job from "../models/Job.js";
import auth from "../middleware/auth.js";

const router = express.Router();

function getMyId(req) {
  return (
    req.userId ||
    (req.user && (req.user._id || req.user.id)) ||
    null
  );
}

/**
 * POST /api/chats/start
 * body รองรับทั้ง { jobId, participantId } และ { job_id, participant_id }
 */
router.post("/start", auth, async (req, res) => {
  try {
    const { jobId, participantId, job_id, participant_id } = req.body;

    const jobIdFinal = jobId || job_id;
    const participantIdFinal = participantId || participant_id;

    if (!jobIdFinal || !participantIdFinal) {
      return res
        .status(400)
        .json({ message: "ข้อมูลไม่ครบ (jobId / participantId)" });
    }

    const job = await Job.findById(jobIdFinal);
    if (!job) {
      return res.status(404).json({ message: "ไม่พบนงานนี้" });
    }
    if (!job.createdBy) {
      return res
        .status(400)
        .json({ message: "งานนี้ไม่มีข้อมูลผู้ประกาศ (createdBy)" });
    }

    const employerId = job.createdBy.toString();
    const workerId = participantIdFinal.toString();

    // หา thread เดิม: งานเดียวกัน + คนประกาศ + ผู้สมัครคนนี้
    let thread = await ChatThread.findOne({
      job: jobIdFinal,
      employer: employerId,
      worker: workerId,
    });

    // ถ้ายังไม่มี → สร้างใหม่
    if (!thread) {
      thread = await ChatThread.create({
        job: jobIdFinal,
        employer: employerId,
        worker: workerId,
        participants: [employerId, workerId],
        lastMessage: "",
        lastMessageAt: null,
      });
    }

    thread = await ChatThread.populate(thread, [
  { path: "job", select: "title company jobCode" },
  { path: "employer", select: "name email" },
  { path: "worker", select: "name email" },
]);

    return res.json(thread);
  } catch (err) {
    console.error("ensure thread error:", err);
    return res.status(500).json({
      message: err.message || "เกิดข้อผิดพลาดในการสร้างห้องแชท",
    });
  }
});

/**
 * GET /api/chats/my
 * ดึงห้องแชททั้งหมดของ user ปัจจุบัน
 */
router.get("/my", auth, async (req, res) => {
  try {
    const me = getMyId(req);
    if (!me) {
      return res
        .status(401)
        .json({ message: "ไม่พบข้อมูลผู้ใช้ใน token (userId)" });
    }

    const threads = await ChatThread.find({
      $or: [{ employer: me }, { worker: me }],
    })
      .populate("job", "title company jobCode")
      .populate("employer", "name email")
      .populate("worker", "name email")
      .sort({ updatedAt: -1 });

    return res.json(threads);
  } catch (err) {
    console.error("list threads error:", err);
    return res
      .status(500)
      .json({ message: "เกิดข้อผิดพลาดในการดึงห้องแชท" });
  }
});

/**
 * GET /api/chats/:threadId/messages
 */
router.get("/:threadId/messages", auth, async (req, res) => {
  try {
    const { threadId } = req.params;

    const msgs = await ChatMessage.find({ thread: threadId })
      .sort({ createdAt: 1 })
      .populate("sender", "name email");

    return res.json(msgs);
  } catch (err) {
    console.error("fetch messages error:", err);
    return res
      .status(500)
      .json({ message: "เกิดข้อผิดพลาดในการดึงข้อความ" });
  }
});

/**
 * POST /api/chats/:threadId/messages
 * body: { text }
 */
router.post("/:threadId/messages", auth, async (req, res) => {
  try {
    const { threadId } = req.params;
    const { text } = req.body;
    const me = getMyId(req);

    if (!text || !text.trim()) {
      return res.status(400).json({ message: "ข้อความว่าง" });
    }

    const msg = await ChatMessage.create({
      thread: threadId,
      sender: me,
      text,
    });

    await ChatThread.findByIdAndUpdate(threadId, {
      $set: {
        lastMessage: text,
        lastMessageAt: new Date(),
      },
    });

    const populated = await msg.populate("sender", "name email");
    return res.status(201).json(populated);
  } catch (err) {
    console.error("send message error:", err);
    return res
      .status(500)
      .json({ message: "ส่งข้อความไม่สำเร็จ" });
  }
});

export default router;
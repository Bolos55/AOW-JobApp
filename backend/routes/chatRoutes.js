// backend/routes/chatRoutes.js
import express from "express";
import ChatThread from "../models/ChatThread.js";
import ChatMessage from "../models/ChatMessage.js";
import Job from "../models/Job.js";
import User from "../models/User.js";
import auth from "../middleware/auth.js";

const router = express.Router();

/** ดึง userId จาก token ที่ middleware auth ใส่ไว้ */
function getMyId(req) {
  return (
    req.userId ||
    (req.user && (req.user._id || req.user.id)) ||
    null
  );
}

/* ---------- helper ใช้ร่วมกัน: ดึงห้องแชทของ user ปัจจุบัน ---------- */
async function listMyThreads(req, res) {
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
      .populate("employer", "name email role")
      .populate("worker", "name email role")
      .sort({ updatedAt: -1 });

    return res.json(threads);
  } catch (err) {
    console.error("list threads error:", err);
    return res
      .status(500)
      .json({ message: "เกิดข้อผิดพลาดในการดึงห้องแชท" });
  }
}

/**
 * POST /api/chats/start
 * สำหรับห้องแชทผูกกับ “งาน”
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
      return res.status(404).json({ message: "ไม่พบงานนี้" });
    }
    if (!job.createdBy) {
      return res
        .status(400)
        .json({ message: "งานนี้ไม่มีข้อมูลผู้ประกาศ (createdBy)" });
    }

    // ✅ เช็ค trial period หรือชำระเงินแล้ว (แต่ยังให้สร้าง thread ได้)
    const now = new Date();
    const isInTrial = job.trialEndsAt && now < new Date(job.trialEndsAt);
    const hasPaid = job.isPaid;
    
    const canChat = isInTrial || hasPaid;

    const employerId = job.createdBy.toString();
    const workerId = participantIdFinal.toString();

    let thread = await ChatThread.findOne({
      job: jobIdFinal,
      employer: employerId,
      worker: workerId,
    });

    if (!thread) {
      thread = await ChatThread.create({
        job: jobIdFinal,
        employer: employerId,
        worker: workerId,
        participants: [employerId, workerId],
        lastMessage: "",
        lastMessageAt: null,
        isAdminThread: false,
        title: job.title || "ห้องแชทงาน",
      });
    }

    thread = await ChatThread.populate(thread, [
      { path: "job", select: "title company jobCode isPaid trialEndsAt" },
      { path: "employer", select: "name email role" },
      { path: "worker", select: "name email role" },
    ]);

    // ✅ เพิ่มข้อมูล trial status
    const response = thread.toObject();
    response.trialInfo = {
      isInTrial,
      hasPaid,
      canChat,
      trialEndsAt: job.trialEndsAt,
      timeRemaining: isInTrial ? new Date(job.trialEndsAt) - now : 0
    };

    return res.json(response);
  } catch (err) {
    console.error("ensure thread error:", err);
    return res.status(500).json({
      message: err.message || "เกิดข้อผิดพลาดในการสร้างห้องแชท",
    });
  }
});

/**
 * POST /api/chats/contact-admin
 */
router.post("/contact-admin", auth, async (req, res) => {
  try {
    const me = getMyId(req);
    if (!me) {
      return res
        .status(401)
        .json({ message: "ไม่พบข้อมูลผู้ใช้ใน token (userId)" });
    }

    let admin = await User.findOne({ role: "admin", isActive: true });
    if (!admin) {
      admin = await User.findOne({ role: "admin" });
    }

    if (!admin) {
      return res
        .status(404)
        .json({ message: "ยังไม่มีผู้ใช้ที่เป็นแอดมินในระบบ" });
    }

    let thread = await ChatThread.findOne({
      job: null,
      employer: admin._id,
      worker: me,
    });

    if (!thread) {
      thread = await ChatThread.create({
        job: null,
        employer: admin._id,
        worker: me,
        participants: [admin._id, me],
        lastMessage: "",
        lastMessageAt: null,
        isAdminThread: true,
        title: "ติดต่อแอดมิน",
      });
    }

    thread = await ChatThread.populate(thread, [
      { path: "job", select: "title company jobCode" },
      { path: "employer", select: "name email role" },
      { path: "worker", select: "name email role" },
    ]);

    return res.json({ thread });
  } catch (err) {
    console.error("contact-admin error:", err);
    return res.status(500).json({
      message: err.message || "ไม่สามารถเปิดห้องแชทแอดมินได้",
    });
  }
});

/**
 * ✅ GET /api/chats/my
 * ✅ GET /api/chats/threads   <-- เพิ่ม endpoint นี้ให้ frontend ใช้
 */
router.get("/my", auth, listMyThreads);
router.get("/threads", auth, listMyThreads);

/**
 * GET /api/chats/:threadId/messages
 */
router.get("/:threadId/messages", auth, async (req, res) => {
  try {
    const { threadId } = req.params;
    const me = getMyId(req);
    if (!me) {
      return res
        .status(401)
        .json({ message: "ไม่พบข้อมูลผู้ใช้ใน token (userId)" });
    }

    const thread = await ChatThread.findById(threadId).select("participants");
    if (!thread) {
      return res.status(404).json({ message: "ไม่พบห้องแชท" });
    }

    const isParticipant = thread.participants
      .map((p) => p.toString())
      .includes(me.toString());

    if (!isParticipant) {
      return res
        .status(403)
        .json({ message: "คุณไม่มีสิทธิ์ดูข้อความของห้องนี้" });
    }

    const msgs = await ChatMessage.find({ thread: threadId })
      .sort({ createdAt: 1 })
      .populate("sender", "name email role");

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
 */
router.post("/:threadId/messages", auth, async (req, res) => {
  try {
    const { threadId } = req.params;
    const { text } = req.body;
    const me = getMyId(req);

    if (!me) {
      return res
        .status(401)
        .json({ message: "ไม่พบข้อมูลผู้ใช้ใน token (userId)" });
    }

    if (!text || !text.trim()) {
      return res.status(400).json({ message: "ข้อความว่าง" });
    }

    const thread = await ChatThread.findById(threadId).populate('job').select("participants job");
    if (!thread) {
      return res.status(404).json({ message: "ไม่พบห้องแชท" });
    }

    const isParticipant = thread.participants
      .map((p) => p.toString())
      .includes(me.toString());

    if (!isParticipant) {
      return res
        .status(403)
        .json({ message: "คุณไม่มีสิทธิ์ส่งข้อความในห้องนี้" });
    }

    // ✅ เช็ค trial period สำหรับ employer เท่านั้น
    if (thread.job && !thread.isAdminThread) {
      const job = thread.job;
      const now = new Date();
      const isInTrial = job.trialEndsAt && now < new Date(job.trialEndsAt);
      const hasPaid = job.isPaid;
      
      // ถ้าเป็น employer และไม่อยู่ใน trial และยังไม่จ่ายเงิน
      if (job.createdBy.toString() === me.toString() && !isInTrial && !hasPaid) {
        return res.status(403).json({ 
          message: "ระยะทดลองใช้ฟรี 24 ชม. หมดแล้ว กรุณาชำระค่าบริการเพื่อแชทต่อ",
          trialExpired: true,
          requiresPayment: true
        });
      }
    }

    const senderUser = await User.findById(me).select("name");
    const senderName = senderUser?.name || "ไม่ทราบชื่อ";

    const msg = await ChatMessage.create({
      thread: threadId,
      sender: me,
      senderName,
      text,
    });

    await ChatThread.findByIdAndUpdate(threadId, {
      $set: {
        lastMessage: text,
        lastMessageAt: new Date(),
        lastSenderName: senderName,
      },
    });

    const populated = await msg.populate("sender", "name email role");
    return res.status(201).json(populated);
  } catch (err) {
    console.error("send message error:", err);
    return res
      .status(500)
      .json({ message: "ส่งข้อความไม่สำเร็จ" });
  }
});

export default router;

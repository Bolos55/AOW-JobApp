// backend/models/ChatThread.js
import mongoose from "mongoose";

const { Schema } = mongoose;

const chatThreadSchema = new Schema(
  {
    job: {
      type: Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },

    // คนประกาศงาน
    employer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ผู้สมัครที่คุยกับเรา
    worker: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ไว้เผื่อใช้ในอนาคต / query ง่าย ๆ
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    lastMessage: { type: String, default: "" },
    lastMessageAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

// index เดียวกับที่ Mongo เคยสร้างไว้ (กันซ้ำ 1 งานต่อคู่คนคุย)
chatThreadSchema.index(
  { job: 1, employer: 1, worker: 1 },
  { unique: true }
);

const ChatThread = mongoose.model("ChatThread", chatThreadSchema);
export default ChatThread;
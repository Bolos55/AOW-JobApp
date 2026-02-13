import mongoose from "mongoose";

const chatThreadSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: function () {
        // ✅ บังคับ job เฉพาะห้องแชทงานจริง
        return !this.isAdminThread;
      },
    },

    employer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],

    lastMessage: {
      type: String,
      default: "",
    },

    lastMessageAt: {
      type: Date,
      default: null,
    },
    
    lastSenderName: {
      type: String,
      default: "",
    },

    // ✅ Unread count for each participant
    unreadCount: {
      type: Map,
      of: Number,
      default: {}
    },

    // ✅ ใช้แยกว่าเป็นห้องแอดมิน
    isAdminThread: {
      type: Boolean,
      default: false,
    },

    title: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

export default mongoose.model("ChatThread", chatThreadSchema);

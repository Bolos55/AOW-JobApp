// backend/models/ChatMessage.js
import mongoose from "mongoose";

const { Schema } = mongoose;

const chatMessageSchema = new Schema(
  {
    thread: {
      type: Schema.Types.ObjectId,
      ref: "ChatThread",
      required: true,
    },

        senderName: {
      type: String,
      trim: true,
    },

    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ✅ เก็บชื่อผู้ส่งซ้ำไว้ตรงนี้เลย (เอาไปโชว์หน้าแชททันที)
    senderName: {
      type: String,
      default: "",
    },

    text: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const ChatMessage = mongoose.model("ChatMessage", chatMessageSchema);
export default ChatMessage;

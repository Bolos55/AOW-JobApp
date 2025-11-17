// src/components/ChatDockButton.jsx
import React from "react";
import { Link } from "react-router-dom";
import { MessageSquare } from "lucide-react";

export default function ChatDockButton() {
  return (
    <Link
      to="/chats"
      className="fixed bottom-4 right-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-2xl px-4 py-3 flex items-center gap-2 z-40"
      title="ดูแชท"
    >
      <MessageSquare className="w-5 h-5" />
      แชท
    </Link>
  );
}
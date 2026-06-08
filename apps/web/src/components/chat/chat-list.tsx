"use client";

import { cn } from "@/lib/utils";
import type { ChatRoomItem } from "@/lib/api";
import { MessageSquare, Users } from "lucide-react";

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

export function ChatList({
  chats,
  activeId,
  onSelect,
}: {
  chats: ChatRoomItem[];
  activeId: string | null;
  onSelect: (chat: ChatRoomItem) => void;
}) {
  if (!chats.length) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-text-muted">
        <MessageSquare className="mb-2 h-8 w-8 opacity-40" />
        <p className="text-sm">Нет чатов</p>
        <p className="mt-1 text-xs">Добавьте друзей и начните переписку</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {chats.map((chat) => (
        <li key={chat.id}>
          <button
            type="button"
            onClick={() => onSelect(chat)}
            className={cn(
              "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-bg-elevated",
              activeId === chat.id && "bg-bg-elevated border-l-2 border-accent",
            )}
          >
            <div
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                chat.type === "group" ? "bg-accent/20 text-accent" : "gradient-brand text-white",
              )}
            >
              {chat.type === "group" ? (
                <Users className="h-5 w-5" />
              ) : (
                chat.peer?.displayName?.[0] ?? "?"
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate font-medium">{chat.name}</p>
                {chat.lastMessage && (
                  <span className="shrink-0 text-[10px] text-text-muted">
                    {formatTime(chat.lastMessage.createdAt)}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-xs text-text-muted">
                  {chat.type === "private" && chat.peer?.username && (
                    <span className="text-accent">@{chat.peer.username} · </span>
                  )}
                  {chat.lastMessage
                    ? `${chat.type === "group" ? chat.lastMessage.senderName + ": " : ""}${chat.lastMessage.content}`
                    : "Нет сообщений"}
                </p>
                {chat.unread > 0 && (
                  <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-bold text-white">
                    {chat.unread > 99 ? "99+" : chat.unread}
                  </span>
                )}
              </div>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}

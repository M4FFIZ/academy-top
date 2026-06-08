"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { Send } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export function ChatPanel({
  roomName,
  subtitle,
  messages,
  onSend,
  onTyping,
  onLoadMore,
  isLoadingMore,
  connected,
  typingLabel,
}: {
  roomName: string;
  subtitle?: string;
  messages: ChatMessage[];
  onSend: (content: string) => void;
  onTyping?: (isTyping: boolean) => void;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  connected?: boolean;
  typingLabel?: string | null;
}) {
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  const handleScroll = () => {
    const el = listRef.current;
    if (!el || !onLoadMore) return;
    if (el.scrollTop < 80) onLoadMore();
  };

  const handleInputChange = (value: string) => {
    setInput(value);
    onTyping?.(true);
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => onTyping?.(false), 1500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    onSend(text);
    setInput("");
    onTyping?.(false);
  };

  return (
    <div className="flex h-full flex-col bg-bg-secondary">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-semibold">{roomName}</h2>
          <p className="truncate text-xs text-text-muted">
            {typingLabel ?? (connected ? "● в сети" : "○ подключение…")}
            {subtitle && !typingLabel && ` · ${subtitle}`}
          </p>
        </div>
      </header>

      <div ref={listRef} onScroll={handleScroll} className="flex-1 overflow-y-auto space-y-3 p-4">
        {isLoadingMore && <p className="text-center text-xs text-text-muted">Загрузка…</p>}
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => {
            const showName =
              !msg.isOwn &&
              (i === 0 || messages[i - 1]?.senderId !== msg.senderId);
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex max-w-[80%] flex-col gap-0.5",
                  msg.isOwn ? "ml-auto items-end" : "items-start",
                )}
              >
                {showName && (
                  <span className="px-1 text-xs text-text-muted">
                    {msg.senderName}
                    {msg.senderUsername && (
                      <span className="text-accent"> @{msg.senderUsername}</span>
                    )}
                  </span>
                )}
                <div
                  className={cn(
                    "rounded-2xl px-4 py-2 text-sm break-words",
                    msg.isOwn ? "gradient-brand text-white rounded-br-md" : "bg-bg-elevated text-text rounded-bl-md",
                  )}
                >
                  {msg.content}
                </div>
                <time className="px-1 text-[10px] text-text-muted">
                  {new Date(msg.createdAt).toLocaleTimeString("ru-RU", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t border-border p-3">
        <textarea
          value={input}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="Сообщение…"
          rows={1}
          className="max-h-32 flex-1 resize-none rounded-xl border border-border bg-bg-primary px-4 py-2.5 text-sm focus:border-accent focus:outline-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />
        <Button type="submit" size="icon" className="shrink-0 rounded-xl" aria-label="Отправить">
          <Send className="h-5 w-5" />
        </Button>
      </form>
    </div>
  );
}

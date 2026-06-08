"use client";

import { useGlobalSocket } from "@/hooks/use-chat-socket";
import { useAuthStore } from "@/lib/auth-store";
import { useToastStore } from "@/lib/toast-store";
import { useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useCallback } from "react";

export function GlobalRealtime() {
  const { token } = useAuthStore();
  const pathname = usePathname();
  const qc = useQueryClient();
  const push = useToastStore((s) => s.push);

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["chats"] });
    qc.invalidateQueries({ queryKey: ["chat-summary"] });
    qc.invalidateQueries({ queryKey: ["friends"] });
    qc.invalidateQueries({ queryKey: ["friend-requests"] });
    qc.invalidateQueries({ queryKey: ["notifications"] });
  }, [qc]);

  const onNotification = useCallback(
    (data: { title?: string; body?: string; type?: string }) => {
      if (pathname.startsWith("/cabinet/chat") && data.type === "chat_message") return;
      push({
        title: data.title ?? "Уведомление",
        body: data.body,
        type: data.type === "chat_message" ? "message" : "info",
      });
      invalidate();
    },
    [pathname, push, invalidate],
  );

  useGlobalSocket(
    token,
    invalidate,
    invalidate,
    invalidate,
    onNotification,
  );

  return null;
}

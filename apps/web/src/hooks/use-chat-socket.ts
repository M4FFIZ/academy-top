"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import type { ChatMessage } from "@/lib/api";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:3001";

let globalSocket: Socket | null = null;
let globalSocketToken: string | null = null;

function getGlobalSocket(token: string): Socket {
  if (globalSocket && globalSocketToken === token) {
    if (!globalSocket.connected) globalSocket.connect();
    return globalSocket;
  }
  if (globalSocket) globalSocket.disconnect();

  globalSocketToken = token;
  globalSocket = io(`${WS_URL}/ws`, {
    auth: { token },
    transports: ["websocket", "polling"],
  });
  return globalSocket;
}

export function useGlobalSocket(
  token: string | null,
  onFriendRequest?: () => void,
  onFriendAccepted?: () => void,
  onChatUpdated?: () => void,
  onNotification?: (data: { title?: string; body?: string; type?: string }) => void,
) {
  const friendReqRef = useRef(onFriendRequest);
  const friendAccRef = useRef(onFriendAccepted);
  const chatUpdRef = useRef(onChatUpdated);
  const notifRef = useRef(onNotification);
  friendReqRef.current = onFriendRequest;
  friendAccRef.current = onFriendAccepted;
  chatUpdRef.current = onChatUpdated;
  notifRef.current = onNotification;

  useEffect(() => {
    if (!token) return;
    const socket = getGlobalSocket(token);

    const h1 = () => friendReqRef.current?.();
    const h2 = () => friendAccRef.current?.();
    const h3 = () => chatUpdRef.current?.();
    const h4 = (data: { title?: string; body?: string; type?: string }) =>
      notifRef.current?.(data);

    socket.on("friend_request", h1);
    socket.on("friend_accepted", h2);
    socket.on("chat_updated", h3);
    socket.on("notification_new", h4);

    return () => {
      socket.off("friend_request", h1);
      socket.off("friend_accepted", h2);
      socket.off("chat_updated", h3);
      socket.off("notification_new", h4);
    };
  }, [token]);
}

export function useChatSocket(roomId: string | null, token: string | null, currentUserId?: string) {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const roomIdRef = useRef(roomId);

  const setInitialMessages = useCallback((msgs: ChatMessage[]) => {
    setMessages(msgs);
  }, []);

  useEffect(() => {
    roomIdRef.current = roomId;
    setMessages([]);
    setTypingUser(null);
  }, [roomId, currentUserId]);

  useEffect(() => {
    if (!token) return;

    const socket = getGlobalSocket(token);

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    const onMessage = (msg: ChatMessage) => {
      if (msg.roomId !== roomIdRef.current) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [
          ...prev,
          {
            ...msg,
            isOwn: currentUserId ? msg.senderId === currentUserId : false,
          },
        ];
      });
    };

    const onTyping = (data: { userId: string; isTyping: boolean }) => {
      if (data.userId === currentUserId) return;
      setTypingUser(data.isTyping ? data.userId : null);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("message_new", onMessage);
    socket.on("typing", onTyping);

    setConnected(socket.connected);

    if (roomId) {
      socket.emit("join_room", { roomId });
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("message_new", onMessage);
      socket.off("typing", onTyping);
    };
  }, [token, roomId, currentUserId]);

  const sendMessage = useCallback(
    (content: string) => {
      if (!roomId || !token) return;
      const socket = getGlobalSocket(token);
      if (!socket.connected) return;

      const optimisticId = `temp-${Date.now()}`;
      const optimistic: ChatMessage = {
        id: optimisticId,
        roomId,
        senderId: currentUserId ?? "",
        senderName: "Вы",
        content,
        createdAt: new Date().toISOString(),
        isOwn: true,
      };
      setMessages((prev) => [...prev, optimistic]);

      socket.emit("send_message", { roomId, content }, (response: ChatMessage & { error?: string }) => {
        if (response?.error) {
          setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
          return;
        }
        if (response?.id) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === optimisticId ? { ...response, isOwn: true } : m,
            ),
          );
        }
      });
    },
    [roomId, token, currentUserId],
  );

  const sendTyping = useCallback(
    (isTyping: boolean) => {
      if (!roomId || !token) return;
      getGlobalSocket(token).emit("typing", { roomId, isTyping });
    },
    [roomId, token],
  );

  const prependMessages = useCallback((msgs: ChatMessage[]) => {
    setMessages((prev) => {
      const ids = new Set(prev.map((m) => m.id));
      const unique = msgs.filter((m) => !ids.has(m.id));
      return [...unique, ...prev];
    });
  }, []);

  return {
    connected,
    messages,
    sendMessage,
    sendTyping,
    typingUser,
    setInitialMessages,
    prependMessages,
  };
}

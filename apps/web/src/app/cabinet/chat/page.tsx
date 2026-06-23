"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { CabinetShell } from "@/components/layout/cabinet-shell";
import { ChatList } from "@/components/chat/chat-list";
import { ChatPanel } from "@/components/chat/chat-panel";
import { FriendsPanel } from "@/components/chat/friends-panel";
import { useChatSocket } from "@/hooks/use-chat-socket";
import { api, type ChatRoomItem, type FriendUser } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Users } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type Tab = "chats" | "friends";

export default function ChatPage() {
  const { token, user } = useAuthStore();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("chats");
  const [activeChat, setActiveChat] = useState<ChatRoomItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const { data: chats = [], refetch: refetchChats } = useQuery({
    queryKey: ["chats", token],
    queryFn: () => api.chats(token!),
    enabled: !!token,
    refetchInterval: 30000,
  });

  const { data: friends = [] } = useQuery({
    queryKey: ["friends", token],
    queryFn: () => api.getFriends(token!),
    enabled: !!token,
  });

  const { data: requests = { incoming: [], outgoing: [] } } = useQuery({
    queryKey: ["friend-requests", token],
    queryFn: () => api.getFriendRequests(token!),
    enabled: !!token,
  });

  const { data: searchResults = [], isFetching: isSearching } = useQuery({
    queryKey: ["user-search", token, searchQuery],
    queryFn: () => api.searchUsers(token!, searchQuery),
    enabled: !!token && searchQuery.length >= 2,
  });

  const roomId = activeChat?.id ?? null;

  const {
    data: fetchedMessages,
    isLoading: messagesLoading,
    isSuccess: messagesReady,
  } = useQuery({
    queryKey: ["chat-messages", token, roomId],
    queryFn: () => api.chatMessages(token!, roomId!),
    enabled: !!token && !!roomId,
  });

  const {
    connected,
    messages,
    sendMessage,
    sendTyping,
    typingUser,
    setInitialMessages,
    prependMessages,
  } = useChatSocket(roomId, token, user?.id);

  // Синхронизация истории с API (без resetMessages — хук сам очищает при смене roomId)
  const syncedRoomRef = useRef<string | null>(null);

  useEffect(() => {
    syncedRoomRef.current = null;
    setActiveChat(null);
    setMobileShowChat(false);
    setHasMore(true);
  }, [user?.id]);

  useEffect(() => {
    if (!roomId) {
      syncedRoomRef.current = null;
      return;
    }
    if (!messagesReady || !fetchedMessages) return;
    if (syncedRoomRef.current === roomId) return;

    syncedRoomRef.current = roomId;
    setHasMore(true);
    setInitialMessages(
      fetchedMessages.map((m) => ({
        ...m,
        isOwn: m.senderId === user?.id,
      })),
    );
  }, [roomId, messagesReady, fetchedMessages, setInitialMessages, user?.id]);

  useEffect(() => {
    if (!roomId || !token) return;
    api.markChatRead(token, roomId).then(() => {
      qc.invalidateQueries({ queryKey: ["chats"] });
      qc.invalidateQueries({ queryKey: ["chat-summary"] });
    });
  }, [roomId, token, messages.length, qc]);

  const invalidateSocial = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["friends"] });
    qc.invalidateQueries({ queryKey: ["friend-requests"] });
    qc.invalidateQueries({ queryKey: ["chats"] });
    qc.invalidateQueries({ queryKey: ["chat-summary"] });
    qc.invalidateQueries({ queryKey: ["user-search"] });
  }, [qc]);

  const loadMore = useCallback(async () => {
    if (!token || !roomId || loadingMore || !hasMore || messages.length === 0) return;
    setLoadingMore(true);
    try {
      const older = await api.chatMessages(token, roomId, messages[0].createdAt);
      if (older.length < 50) setHasMore(false);
      if (older.length > 0) {
        prependMessages(
          older.map((m) => ({ ...m, isOwn: m.senderId === user?.id })),
        );
      }
    } finally {
      setLoadingMore(false);
    }
  }, [token, roomId, loadingMore, hasMore, messages, user?.id, prependMessages]);

  const addFriendMutation = useMutation({
    mutationFn: (username: string) => api.sendFriendRequest(token!, username),
    onSuccess: invalidateSocial,
  });

  const acceptMutation = useMutation({
    mutationFn: (id: string) => api.acceptFriendRequest(token!, id),
    onSuccess: invalidateSocial,
  });

  const declineMutation = useMutation({
    mutationFn: (id: string) => api.declineFriendRequest(token!, id),
    onSuccess: invalidateSocial,
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => api.removeFriend(token!, userId),
    onSuccess: invalidateSocial,
  });

  const openDmMutation = useMutation({
    mutationFn: (userId: string) => api.openDm(token!, userId),
    onSuccess: (room) => {
      refetchChats();
      syncedRoomRef.current = null;
      setActiveChat(room);
      setTab("chats");
      setMobileShowChat(true);
    },
  });

  const selectChat = (chat: ChatRoomItem) => {
    syncedRoomRef.current = null;
    setActiveChat(chat);
    setMobileShowChat(true);
  };

  const handleMessageFriend = (friend: FriendUser) => {
    openDmMutation.mutate(friend.id);
  };

  const totalUnread = chats.reduce((s, c) => s + c.unread, 0);
  const pendingCount = requests.incoming.length;

  return (
    <AuthGuard>
      <CabinetShell>
        <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-6xl overflow-hidden rounded-xl border border-border pb-20 lg:h-[calc(100vh-10rem)] lg:pb-0">
          {/* Sidebar */}
          <aside
            className={cn(
              "flex w-full flex-col border-r border-border bg-bg-primary lg:w-80",
              mobileShowChat && "hidden lg:flex",
            )}
          >
            <div className="flex border-b border-border">
              <TabButton
                active={tab === "chats"}
                onClick={() => setTab("chats")}
                icon={<MessageSquare className="h-4 w-4" />}
                label="Чаты"
                badge={totalUnread}
              />
              <TabButton
                active={tab === "friends"}
                onClick={() => setTab("friends")}
                icon={<Users className="h-4 w-4" />}
                label="Друзья"
                badge={pendingCount}
              />
            </div>

            <div className="flex-1 overflow-hidden">
              {tab === "chats" ? (
                <ChatList chats={chats} activeId={activeChat?.id ?? null} onSelect={selectChat} />
              ) : (
                <FriendsPanel
                  friends={friends}
                  requests={requests}
                  searchResults={searchResults}
                  onSearch={setSearchQuery}
                  onAddFriend={(u) => addFriendMutation.mutate(u)}
                  onAccept={(id) => acceptMutation.mutate(id)}
                  onDecline={(id) => declineMutation.mutate(id)}
                  onRemove={(id) => removeMutation.mutate(id)}
                  onMessage={handleMessageFriend}
                  isSearching={isSearching}
                />
              )}
            </div>
          </aside>

          {/* Chat area */}
          <main
            className={cn(
              "flex flex-1 flex-col",
              !mobileShowChat && "hidden lg:flex",
            )}
          >
            {activeChat ? (
              <>
                <button
                  type="button"
                  className="border-b border-border px-4 py-2 text-left text-sm text-accent lg:hidden"
                  onClick={() => setMobileShowChat(false)}
                >
                  ← Назад
                </button>
                {messagesLoading && messages.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                  </div>
                ) : (
                  <ChatPanel
                    roomName={activeChat.name}
                    subtitle={
                      activeChat.type === "private" && activeChat.peer?.username
                        ? `@${activeChat.peer.username}`
                        : activeChat.type === "group"
                          ? "Групповой чат"
                          : undefined
                    }
                    messages={messages}
                    onSend={sendMessage}
                    onTyping={sendTyping}
                    onLoadMore={hasMore ? loadMore : undefined}
                    isLoadingMore={loadingMore}
                    connected={connected}
                    typingLabel={
                      typingUser
                        ? `${activeChat.peer?.displayName ?? activeChat.name} печатает…`
                        : null
                    }
                  />
                )}
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center text-text-muted">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl gradient-brand opacity-80">
                  <MessageSquare className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-lg font-semibold text-text">Мессенджер Академии ТОП</h2>
                <p className="max-w-sm text-sm">
                  Выберите чат или найдите друзей по @username — как в MAX
                </p>
                {!user?.username && (
                  <p className="text-xs text-warning">
                    Установите свой @username в профиле, чтобы вас могли найти
                  </p>
                )}
              </div>
            )}
          </main>
        </div>
      </CabinetShell>
    </AuthGuard>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium transition-colors",
        active ? "text-accent border-b-2 border-accent" : "text-text-muted hover:text-text",
      )}
    >
      {icon}
      {label}
      {!!badge && badge > 0 && (
        <span className="absolute right-4 top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-pink px-1 text-[10px] font-bold text-white">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </button>
  );
}

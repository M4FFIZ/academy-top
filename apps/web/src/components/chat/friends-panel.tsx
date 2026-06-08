"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FriendRequests, FriendUser, SearchUser } from "@/lib/api";
import { Check, MessageCircle, Search, UserMinus, UserPlus, X } from "lucide-react";
import { useState } from "react";

export function FriendsPanel({
  friends,
  requests,
  searchResults,
  onSearch,
  onAddFriend,
  onAccept,
  onDecline,
  onRemove,
  onMessage,
  isSearching,
}: {
  friends: FriendUser[];
  requests: FriendRequests;
  searchResults: SearchUser[];
  onSearch: (q: string) => void;
  onAddFriend: (username: string) => void;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
  onRemove: (userId: string) => void;
  onMessage: (user: FriendUser) => void;
  isSearching?: boolean;
}) {
  const [query, setQuery] = useState("");

  const handleSearch = (value: string) => {
    setQuery(value);
    onSearch(value.replace(/^@/, ""));
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Поиск @username"
            className="w-full rounded-lg border border-border bg-bg-primary py-2 pl-9 pr-3 text-sm focus:border-accent focus:outline-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {query.length >= 2 && (
          <section className="p-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-text-muted">Результаты</p>
            {isSearching ? (
              <p className="text-sm text-text-muted">Поиск…</p>
            ) : searchResults.length === 0 ? (
              <p className="text-sm text-text-muted">Никого не найдено</p>
            ) : (
              <ul className="space-y-1">
                {searchResults.map((u) => (
                  <UserRow
                    key={u.id}
                    user={u}
                    action={
                      u.relation === "friends" ? (
                        <Button size="sm" variant="secondary" onClick={() => onMessage(u)}>
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                      ) : u.relation === "pending_sent" ? (
                        <span className="text-xs text-text-muted">Отправлено</span>
                      ) : u.relation === "pending_received" && u.friendshipId ? (
                        <Button size="sm" onClick={() => onAccept(u.friendshipId!)}>
                          <Check className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button size="sm" onClick={() => onAddFriend(u.username!)}>
                          <UserPlus className="h-4 w-4" />
                        </Button>
                      )
                    }
                  />
                ))}
              </ul>
            )}
          </section>
        )}

        {requests.incoming.length > 0 && (
          <section className="border-t border-border p-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-text-muted">
              Заявки ({requests.incoming.length})
            </p>
            <ul className="space-y-1">
              {requests.incoming.map((r) => (
                <UserRow
                  key={r.id}
                  user={r.user}
                  action={
                    <div className="flex gap-1">
                      <Button size="sm" onClick={() => onAccept(r.id)}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => onDecline(r.id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  }
                />
              ))}
            </ul>
          </section>
        )}

        <section className="border-t border-border p-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-text-muted">
            Друзья ({friends.length})
          </p>
          {friends.length === 0 ? (
            <p className="text-sm text-text-muted">
              Найдите одногруппников по @username и добавьте в друзья
            </p>
          ) : (
            <ul className="space-y-1">
              {friends.map((f) => (
                <UserRow
                  key={f.id}
                  user={f}
                  action={
                    <div className="flex gap-1">
                      <Button size="sm" onClick={() => onMessage(f)}>
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => onRemove(f.id)}>
                        <UserMinus className="h-4 w-4 text-danger" />
                      </Button>
                    </div>
                  }
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function UserRow({
  user,
  action,
}: {
  user: FriendUser;
  action: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-bg-elevated">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full gradient-brand text-sm font-bold">
        {user.displayName[0]}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{user.displayName}</p>
        {user.username && (
          <p className="truncate text-xs text-accent">@{user.username}</p>
        )}
      </div>
      <div className="shrink-0">{action}</div>
    </li>
  );
}

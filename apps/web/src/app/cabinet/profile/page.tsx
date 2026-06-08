"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { CabinetShell } from "@/components/layout/cabinet-shell";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export default function ProfilePage() {
  const { token, user, updateUser } = useAuthStore();
  const qc = useQueryClient();

  const [phone, setPhone] = useState(user?.phone ?? "");
  const [telegram, setTelegram] = useState(user?.telegram ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [usernameError, setUsernameError] = useState("");

  const saveMutation = useMutation({
    mutationFn: () => api.updateProfile(token!, { phone, telegram }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dashboard"] }),
  });

  const usernameMutation = useMutation({
    mutationFn: () => api.setUsername(token!, username),
    onSuccess: (data) => {
      updateUser({ username: data.username });
      setUsernameError("");
    },
    onError: (err) => {
      setUsernameError(err instanceof ApiError ? err.message : "Ошибка");
    },
  });

  return (
    <AuthGuard>
      <CabinetShell>
        <div className="mx-auto max-w-lg space-y-6 pb-20 lg:pb-0">
          <h1 className="text-2xl font-bold">Профиль</h1>

          <div className="space-y-4 rounded-xl border border-border bg-bg-secondary p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full gradient-brand text-2xl font-bold">
                {user?.firstName[0]}
              </div>
              <div>
                <p className="font-semibold">{user?.displayName}</p>
                {user?.username && (
                  <p className="text-sm text-accent">@{user.username}</p>
                )}
                <p className="text-sm text-text-muted">{user?.email}</p>
                {user?.group && <p className="text-sm text-text-muted">{user.group.name}</p>}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm text-text-muted">
                Username (как в Telegram)
              </label>
              <div className="flex gap-2">
                <span className="flex items-center rounded-l-lg border border-r-0 border-border bg-bg-elevated px-3 text-sm text-text-muted">
                  @
                </span>
                <input
                  value={username}
                  onChange={(e) =>
                    setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
                  }
                  placeholder="mafffiz"
                  className="flex-1 rounded-r-lg border border-border bg-bg-primary px-3 py-2 text-sm focus:border-accent focus:outline-none"
                />
              </div>
              <p className="mt-1 text-xs text-text-muted">5–32 символа: a-z, 0-9, _</p>
              {usernameError && <p className="mt-1 text-xs text-danger">{usernameError}</p>}
              {username !== user?.username && (
                <Button
                  className="mt-2"
                  size="sm"
                  onClick={() => usernameMutation.mutate()}
                  disabled={usernameMutation.isPending || username.length < 5}
                >
                  {usernameMutation.isPending ? "Сохранение…" : "Сохранить username"}
                </Button>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm text-text-muted">Телефон</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-text-muted">Telegram</label>
              <input
                value={telegram}
                onChange={(e) => setTelegram(e.target.value)}
                className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm focus:border-accent focus:outline-none"
              />
            </div>

            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Сохранение…" : "Сохранить контакты"}
            </Button>
          </div>
        </div>
      </CabinetShell>
    </AuthGuard>
  );
}

"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { CabinetShell } from "@/components/layout/cabinet-shell";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export default function AdminUsersPage() {
  const { token } = useAuthStore();
  const qc = useQueryClient();
  const [roleFilter, setRoleFilter] = useState("");

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users", token, roleFilter],
    queryFn: () => api.adminUsers(token!, roleFilter || undefined),
    enabled: !!token,
  });

  const blockMutation = useMutation({
    mutationFn: (id: string) => api.blockUser(token!, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  return (
    <AuthGuard roles={["admin"]}>
      <CabinetShell>
        <div className="mx-auto max-w-5xl space-y-6 pb-20 lg:pb-0">
          <h1 className="text-2xl font-bold">Пользователи</h1>

          <div className="flex gap-2">
            {["", "student", "teacher", "admin"].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRoleFilter(r)}
                className={`rounded-lg px-3 py-1.5 text-sm ${roleFilter === r ? "gradient-brand text-white" : "border border-border hover:bg-bg-elevated"}`}
              >
                {r === "" ? "Все" : r === "student" ? "Ученики" : r === "teacher" ? "Преподаватели" : "Админы"}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="h-48 animate-pulse rounded-xl bg-bg-secondary" />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-bg-secondary">
                  <tr>
                    <th className="px-4 py-3 text-left">ФИО</th>
                    <th className="px-4 py-3 text-left">Email</th>
                    <th className="px-4 py-3 text-left">Роль</th>
                    <th className="px-4 py-3 text-left">Группа</th>
                    <th className="px-4 py-3 text-left">Статус</th>
                    <th className="px-4 py-3 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-t border-border">
                      <td className="px-4 py-3">{u.displayName}</td>
                      <td className="px-4 py-3 text-text-muted">{u.email}</td>
                      <td className="px-4 py-3 capitalize">{u.role}</td>
                      <td className="px-4 py-3">{u.group?.name ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className={u.status === "active" ? "text-success" : "text-danger"}>
                          {u.status === "active" ? "Активен" : "Заблокирован"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {u.status === "active" && u.role !== "admin" && (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => blockMutation.mutate(u.id)}
                          >
                            Блокировать
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </CabinetShell>
    </AuthGuard>
  );
}

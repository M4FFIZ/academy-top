"use client";

import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/types";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import {
  BarChart3,
  Bell,
  Calendar,
  ClipboardList,
  GraduationCap,
  Home,
  LogOut,
  MessageSquare,
  Settings,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
  badgeKey?: "chat";
}

const NAV_ITEMS: NavItem[] = [
  { href: "/cabinet", label: "Главная", icon: Home, roles: ["student", "teacher", "admin"] },
  { href: "/cabinet/schedule", label: "Расписание", icon: Calendar, roles: ["student", "teacher", "admin"] },
  { href: "/cabinet/grades", label: "Успеваемость", icon: GraduationCap, roles: ["student", "teacher"] },
  { href: "/cabinet/journal", label: "Ведомость", icon: ClipboardList, roles: ["teacher", "admin"] },
  { href: "/cabinet/chat", label: "Чат", icon: MessageSquare, roles: ["student", "teacher", "admin"], badgeKey: "chat" },
  { href: "/cabinet/admin/users", label: "Пользователи", icon: Users, roles: ["admin"] },
  { href: "/cabinet/admin/schedule", label: "Конструктор", icon: Calendar, roles: ["admin"] },
  { href: "/cabinet/admin/analytics", label: "Аналитика", icon: BarChart3, roles: ["admin"] },
  { href: "/cabinet/profile", label: "Профиль", icon: Settings, roles: ["student", "teacher", "admin"] },
];

export function CabinetShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const qc = useQueryClient();
  const { token, user, logout } = useAuthStore();
  const [notifOpen, setNotifOpen] = useState(false);

  const { data: chatSummary } = useQuery({
    queryKey: ["chat-summary", token],
    queryFn: () => api.chatSummary(token!),
    enabled: !!token,
    refetchInterval: 15000,
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", token],
    queryFn: () => api.notifications(token!),
    enabled: !!token,
    refetchInterval: 30000,
  });

  if (!user) return null;

  const items = NAV_ITEMS.filter((item) => item.roles.includes(user.role));
  const chatBadge =
    (chatSummary?.unreadMessages ?? 0) + (chatSummary?.pendingRequests ?? 0);
  const unreadNotifs = notifications.filter((n) => !n.isRead).length;

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const getBadge = (item: NavItem) => {
    if (item.badgeKey === "chat" && chatBadge > 0) return chatBadge;
    return 0;
  };

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-bg-secondary lg:flex">
        <div className="border-b border-border p-5">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg gradient-brand" />
            <div>
              <p className="text-sm font-semibold">Академия ТОП</p>
              <p className="text-xs text-text-muted">Личный кабинет</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {items.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/cabinet" && pathname.startsWith(item.href));
            const Icon = item.icon;
            const badge = getBadge(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                  active ? "bg-bg-elevated text-text" : "text-text-muted hover:bg-bg-elevated hover:text-text",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="nav-indicator"
                    className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full gradient-brand"
                  />
                )}
                <Icon className="h-5 w-5 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {badge > 0 && (
                  <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-4">
          <p className="truncate text-sm font-medium">{user.displayName}</p>
          {user.username && (
            <p className="truncate text-xs text-accent">@{user.username}</p>
          )}
          {user.group && <p className="truncate text-xs text-text-muted">{user.group.name}</p>}
          <button
            type="button"
            onClick={handleLogout}
            className="mt-2 flex items-center gap-2 text-xs text-text-muted hover:text-danger"
          >
            <LogOut className="h-4 w-4" />
            Выйти
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="relative flex h-16 items-center justify-between border-b border-border bg-bg-secondary/80 px-4 backdrop-blur lg:px-6">
          <p className="text-sm font-medium lg:hidden">Академия ТОП</p>
          <p className="hidden text-sm text-text-muted lg:block">
            {new Date().toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotifOpen((v) => !v)}
                className="relative rounded-lg p-2 hover:bg-bg-elevated"
                aria-label="Уведомления"
              >
                <Bell className="h-5 w-5" />
                {unreadNotifs > 0 && (
                  <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-accent-pink" />
                )}
              </button>
              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                  <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-border bg-bg-secondary shadow-xl">
                    <div className="flex items-center justify-between border-b border-border px-4 py-3">
                      <span className="font-semibold">Уведомления</span>
                      {unreadNotifs > 0 && (
                        <button
                          type="button"
                          className="text-xs text-accent"
                          onClick={() => {
                            if (token) {
                              api.markAllNotificationsRead(token).then(() =>
                                qc.invalidateQueries({ queryKey: ["notifications"] }),
                              );
                            }
                          }}
                        >
                          Прочитать все
                        </button>
                      )}
                    </div>
                    <ul className="max-h-72 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <li className="p-4 text-center text-sm text-text-muted">Нет уведомлений</li>
                      ) : (
                        notifications.map((n) => (
                          <li key={n.id}>
                            <button
                              type="button"
                              className={cn(
                                "w-full px-4 py-3 text-left hover:bg-bg-elevated",
                                !n.isRead && "bg-accent/5",
                              )}
                              onClick={() => {
                                if (token) {
                                  api.markNotificationRead(token, n.id).then(() =>
                                    qc.invalidateQueries({ queryKey: ["notifications"] }),
                                  );
                                }
                                setNotifOpen(false);
                                if (n.link) router.push(n.link);
                              }}
                            >
                              <p className="text-sm font-medium">{n.title}</p>
                              {n.body && <p className="text-xs text-text-muted">{n.body}</p>}
                            </button>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                </>
              )}
            </div>
            <span className="hidden rounded-full bg-bg-elevated px-2 py-1 text-xs capitalize text-text-muted sm:inline">
              {user.role === "student" ? "Ученик" : user.role === "teacher" ? "Преподаватель" : "Админ"}
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-full gradient-brand text-sm font-bold">
              {user.firstName[0]}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-10 flex border-t border-border bg-bg-secondary lg:hidden">
        {items.slice(0, 5).map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          const badge = getBadge(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-1 py-2 text-xs",
                active ? "text-accent" : "text-text-muted",
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="max-w-[4rem] truncate">{item.label}</span>
              {badge > 0 && (
                <span className="absolute right-3 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-pink px-1 text-[10px] font-bold text-white">
                  {badge > 9 ? "9+" : badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

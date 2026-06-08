"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { CabinetShell } from "@/components/layout/cabinet-shell";
import { CurrentLessonCard } from "@/components/dashboard/current-lesson-card";
import { api, type DashboardData } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";

export default function DashboardPage() {
  const { token, user } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", token],
    queryFn: () => api.dashboard(token!),
    enabled: !!token,
  });

  return (
    <AuthGuard>
      <CabinetShell>
        <DashboardContent
          data={data}
          isLoading={isLoading}
          userName={user?.firstName ?? ""}
          role={user?.role}
          username={user?.username}
        />
      </CabinetShell>
    </AuthGuard>
  );
}

import Link from "next/link";

function DashboardContent({
  data,
  isLoading,
  userName,
  role,
  username,
}: {
  data?: DashboardData;
  isLoading: boolean;
  userName: string;
  role?: string;
  username?: string | null;
}) {
  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-bg-secondary" />
        ))}
      </div>
    );
  }

  if (role === "admin") {
    return (
      <div className="mx-auto max-w-5xl space-y-6 pb-20 lg:pb-0">
        <h1 className="text-2xl font-bold">Панель администратора</h1>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Пользователей", value: data?.usersCount ?? 0 },
            { label: "Активных групп", value: data?.groupsCount ?? 0 },
            { label: "Занятий сегодня", value: data?.lessonsToday ?? 0 },
          ].map((s) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-border bg-bg-secondary p-6"
            >
              <p className="text-sm text-text-muted">{s.label}</p>
              <p className="text-3xl font-bold text-accent">{s.value}</p>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  if (role === "teacher") {
    return (
      <div className="mx-auto max-w-5xl space-y-6 pb-20 lg:pb-0">
        <h1 className="text-2xl font-bold">Добрый день, {userName}!</h1>
        <section>
          <h2 className="mb-3 text-lg font-semibold">Мои группы</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {data?.groups?.map((g) => (
              <div key={g.id} className="rounded-xl border border-border bg-bg-secondary p-4">
                <p className="font-semibold">{g.name}</p>
                <p className="text-sm text-text-muted">{g.subjectName}</p>
              </div>
            ))}
          </div>
        </section>
        <section>
          <h2 className="mb-3 text-lg font-semibold">Сегодня</h2>
          {data?.todayLessons?.length ? (
            data.todayLessons.map((l) => (
              <div key={l.id} className="mb-2 rounded-lg border border-border bg-bg-secondary p-3 text-sm">
                <span className="font-medium" style={{ color: l.subjectColor }}>{l.subjectName}</span>
                {" · "}
                {new Date(l.startsAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                {" · "}{l.groupName} · {l.roomName}
              </div>
            ))
          ) : (
            <p className="text-text-muted">Занятий сегодня нет</p>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-20 lg:pb-0">
      {!username && role === "student" && (
        <Link
          href="/cabinet/profile"
          className="block rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm transition-colors hover:bg-warning/15"
        >
          <span className="font-medium text-warning">Установите @username</span>
          <span className="text-text-muted"> — чтобы одногруппники могли добавить вас в друзья и написать в чате</span>
        </Link>
      )}
      <header>
        <h1 className="text-2xl font-bold">
          Добрый день,{" "}
          <span className="bg-gradient-to-r from-accent to-accent-purple bg-clip-text text-transparent">
            {userName}
          </span>
        </h1>
        {data?.group && <p className="text-text-muted">Группа {data.group.name}</p>}
      </header>

      <CurrentLessonCard lesson={data?.currentLesson ?? null} />

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-bg-secondary p-4">
          <p className="text-sm text-text-muted">Средний балл</p>
          <p className="text-3xl font-bold text-success">
            {data?.stats?.avgGrade?.toFixed(1) ?? "—"}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-bg-secondary p-4">
          <p className="text-sm text-text-muted">Посещаемость</p>
          <p className="text-3xl font-bold text-accent">
            {data?.stats?.attendancePct != null ? `${data.stats.attendancePct}%` : "—"}
          </p>
        </div>
      </section>

      {data?.todayLessons && data.todayLessons.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Расписание на сегодня</h2>
          <div className="space-y-2">
            {data.todayLessons.map((l) => (
              <div key={l.id} className="flex items-center gap-3 rounded-lg border border-border bg-bg-secondary p-3 text-sm">
                <span className="font-mono text-text-muted">
                  {new Date(l.startsAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                </span>
                <span className="font-medium" style={{ color: l.subjectColor }}>{l.subjectName}</span>
                <span className="text-text-muted">{l.roomName}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

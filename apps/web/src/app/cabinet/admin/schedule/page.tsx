"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { CabinetShell } from "@/components/layout/cabinet-shell";
import { Button } from "@/components/ui/button";
import { ScheduleGrid } from "@/components/schedule/schedule-grid";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { formatWeekLabel, getWeekRange } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addWeeks, subWeeks } from "date-fns";
import { useState } from "react";

export default function AdminSchedulePage() {
  const { token } = useAuthStore();
  const qc = useQueryClient();
  const [weekDate, setWeekDate] = useState(new Date());
  const [groupId, setGroupId] = useState("");
  const [showForm, setShowForm] = useState(false);

  const { start, end } = getWeekRange(weekDate);

  const { data: groups = [] } = useQuery({
    queryKey: ["admin-groups", token],
    queryFn: () => api.adminGroups(token!),
    enabled: !!token,
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ["admin-subjects", token],
    queryFn: () => api.adminSubjects(token!),
    enabled: !!token,
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ["admin-rooms", token],
    queryFn: () => api.adminRooms(token!),
    enabled: !!token,
  });

  const { data: teachers = [] } = useQuery({
    queryKey: ["admin-teachers", token],
    queryFn: () => api.adminTeachers(token!),
    enabled: !!token,
  });

  const { data: lessons = [] } = useQuery({
    queryKey: ["schedule", token, groupId, start.toISOString()],
    queryFn: () => api.schedule(token!, start.toISOString(), end.toISOString(), groupId),
    enabled: !!token && !!groupId,
  });

  const [form, setForm] = useState({
    subjectId: "",
    teacherId: "",
    roomId: "",
    lessonType: "lecture",
    day: 0,
    hour: 10,
    duration: 1.5,
  });

  const createMutation = useMutation({
    mutationFn: () => {
      const startsAt = new Date(start);
      startsAt.setDate(start.getDate() + form.day);
      startsAt.setHours(form.hour, 0, 0, 0);
      const endsAt = new Date(startsAt.getTime() + form.duration * 3600000);
      return api.createLesson(token!, {
        groupId,
        subjectId: form.subjectId,
        teacherId: form.teacherId,
        roomId: form.roomId,
        lessonType: form.lessonType,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schedule"] });
      setShowForm(false);
    },
  });

  return (
    <AuthGuard roles={["admin"]}>
      <CabinetShell>
        <div className="mx-auto max-w-6xl space-y-4 pb-20 lg:pb-0">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-2xl font-bold">Конструктор расписания</h1>
            <Button onClick={() => setShowForm(true)} disabled={!groupId}>
              + Добавить занятие
            </Button>
          </div>

          <div className="flex flex-wrap gap-3">
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm"
            >
              <option value="">Выберите группу</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setWeekDate(subWeeks(weekDate, 1))}
              className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-bg-elevated"
            >
              ←
            </button>
            <span className="rounded-lg bg-bg-elevated px-3 py-1.5 text-sm">{formatWeekLabel(start)}</span>
            <button
              type="button"
              onClick={() => setWeekDate(addWeeks(weekDate, 1))}
              className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-bg-elevated"
            >
              →
            </button>
          </div>

          {groupId ? (
            <ScheduleGrid lessons={lessons} />
          ) : (
            <p className="text-text-muted">Выберите группу для просмотра расписания</p>
          )}

          {showForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
              <div className="w-full max-w-md space-y-4 rounded-2xl border border-border bg-bg-secondary p-6">
                <h2 className="text-lg font-semibold">Новое занятие</h2>

                <select
                  value={form.subjectId}
                  onChange={(e) => setForm({ ...form, subjectId: e.target.value })}
                  className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm"
                >
                  <option value="">Предмет</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>

                <select
                  value={form.teacherId}
                  onChange={(e) => setForm({ ...form, teacherId: e.target.value })}
                  className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm"
                >
                  <option value="">Преподаватель</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.teacherProfile?.lastName} {t.teacherProfile?.firstName}
                    </option>
                  ))}
                </select>

                <select
                  value={form.roomId}
                  onChange={(e) => setForm({ ...form, roomId: e.target.value })}
                  className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm"
                >
                  <option value="">Аудитория</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>{r.name} ({r.building})</option>
                  ))}
                </select>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs text-text-muted">День</label>
                    <select
                      value={form.day}
                      onChange={(e) => setForm({ ...form, day: Number(e.target.value) })}
                      className="w-full rounded-lg border border-border bg-bg-primary px-2 py-2 text-sm"
                    >
                      {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб"].map((d, i) => (
                        <option key={d} value={i}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-text-muted">Час</label>
                    <input
                      type="number"
                      min={9}
                      max={20}
                      value={form.hour}
                      onChange={(e) => setForm({ ...form, hour: Number(e.target.value) })}
                      className="w-full rounded-lg border border-border bg-bg-primary px-2 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-text-muted">Часов</label>
                    <select
                      value={form.duration}
                      onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })}
                      className="w-full rounded-lg border border-border bg-bg-primary px-2 py-2 text-sm"
                    >
                      <option value={1}>1</option>
                      <option value={1.5}>1.5</option>
                      <option value={2}>2</option>
                    </select>
                  </div>
                </div>

                <select
                  value={form.lessonType}
                  onChange={(e) => setForm({ ...form, lessonType: e.target.value })}
                  className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm"
                >
                  <option value="lecture">Лекция</option>
                  <option value="practice">Практика</option>
                  <option value="lab">Лабораторная</option>
                  <option value="exam">Экзамен</option>
                </select>

                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => createMutation.mutate()}
                    disabled={createMutation.isPending || !form.subjectId || !form.teacherId}
                  >
                    {createMutation.isPending ? "Сохранение…" : "Создать"}
                  </Button>
                  <Button variant="secondary" onClick={() => setShowForm(false)}>Отмена</Button>
                </div>

                {createMutation.isError && (
                  <p className="text-sm text-danger">Ошибка: конфликт расписания или неверные данные</p>
                )}
              </div>
            </div>
          )}
        </div>
      </CabinetShell>
    </AuthGuard>
  );
}

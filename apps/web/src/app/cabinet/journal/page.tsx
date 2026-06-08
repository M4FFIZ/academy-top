"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { CabinetShell } from "@/components/layout/cabinet-shell";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

const ATTENDANCE_OPTIONS = [
  { value: "present", label: "Присутствовал" },
  { value: "late", label: "Опоздал" },
  { value: "absent", label: "Пропуск" },
  { value: "excused", label: "Уважительная" },
];

export default function JournalPage() {
  const { token } = useAuthStore();
  const qc = useQueryClient();
  const today = new Date().toISOString().split("T")[0];

  const { data: groups = [] } = useQuery({
    queryKey: ["groups", token],
    queryFn: () => api.groups(token!),
    enabled: !!token,
  });

  const [groupId, setGroupId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [date, setDate] = useState(today);
  const [entries, setEntries] = useState<Record<string, { grade?: number; attendance?: string }>>({});

  const selectedGroup = groups.find((g) => g.id === groupId);
  const subjects = selectedGroup?.subjects ?? [];

  const { data: session, refetch } = useQuery({
    queryKey: ["journal", token, groupId, subjectId, date],
    queryFn: () => api.journalSession(token!, groupId, subjectId, date),
    enabled: !!token && !!groupId && !!subjectId && !!date,
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      api.saveJournal(token!, {
        lessonId: session!.lessonId!,
        groupId,
        subjectId,
        entries: (session?.students ?? []).map((s) => ({
          studentId: s.studentId,
          grade: entries[s.studentId]?.grade ?? s.grade ?? undefined,
          attendance: entries[s.studentId]?.attendance ?? s.attendance ?? undefined,
        })),
      }),
    onSuccess: () => {
      refetch();
      qc.invalidateQueries({ queryKey: ["grades"] });
    },
  });

  const bulkPresent = () => {
    const next: typeof entries = {};
    session?.students.forEach((s) => {
      next[s.studentId] = { ...entries[s.studentId], attendance: "present" };
    });
    setEntries(next);
  };

  const bulkGrade5 = () => {
    const next: typeof entries = {};
    session?.students.forEach((s) => {
      next[s.studentId] = { ...entries[s.studentId], grade: 5 };
    });
    setEntries(next);
  };

  return (
    <AuthGuard roles={["teacher", "admin"]}>
      <CabinetShell>
        <div className="mx-auto max-w-5xl space-y-6 pb-24 lg:pb-6">
          <h1 className="text-2xl font-bold">Ведомость группы</h1>

          <div className="flex flex-wrap gap-3">
            <select
              value={groupId}
              onChange={(e) => { setGroupId(e.target.value); setSubjectId(""); }}
              className="rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm"
            >
              <option value="">Выберите группу</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>

            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm"
              disabled={!groupId}
            >
              <option value="">Выберите предмет</option>
              {subjects.map((s) => (
                <option key={s.subject.id} value={s.subject.id}>{s.subject.name}</option>
              ))}
            </select>

            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm"
            />
          </div>

          {session && !session.lessonId && (
            <p className="text-warning">На эту дату занятие не найдено в расписании</p>
          )}

          {session?.students && session.students.length > 0 && (
            <>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={bulkPresent}>Всем «Присутствовал»</Button>
                <Button variant="secondary" size="sm" onClick={bulkGrade5}>Всем оценка 5</Button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-bg-secondary">
                    <tr>
                      <th className="px-4 py-3 text-left">ФИО</th>
                      <th className="px-4 py-3 text-left">Оценка</th>
                      <th className="px-4 py-3 text-left">Посещаемость</th>
                    </tr>
                  </thead>
                  <tbody>
                    {session.students.map((s) => (
                      <tr key={s.studentId} className="border-t border-border">
                        <td className="px-4 py-3">{s.name}</td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min={1}
                            max={5}
                            step={1}
                            value={entries[s.studentId]?.grade ?? s.grade ?? ""}
                            onChange={(e) =>
                              setEntries((prev) => ({
                                ...prev,
                                [s.studentId]: {
                                  ...prev[s.studentId],
                                  grade: e.target.value ? Number(e.target.value) : undefined,
                                },
                              }))
                            }
                            className="w-16 rounded border border-border bg-bg-primary px-2 py-1"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={entries[s.studentId]?.attendance ?? s.attendance ?? ""}
                            onChange={(e) =>
                              setEntries((prev) => ({
                                ...prev,
                                [s.studentId]: { ...prev[s.studentId], attendance: e.target.value },
                              }))
                            }
                            className="rounded border border-border bg-bg-primary px-2 py-1"
                          >
                            <option value="">—</option>
                            {ATTENDANCE_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="sticky bottom-20 lg:bottom-4">
                <Button
                  onClick={() => saveMutation.mutate()}
                  disabled={!session.lessonId || saveMutation.isPending}
                >
                  {saveMutation.isPending ? "Сохранение…" : "Сохранить ведомость"}
                </Button>
              </div>
            </>
          )}
        </div>
      </CabinetShell>
    </AuthGuard>
  );
}

"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { CabinetShell } from "@/components/layout/cabinet-shell";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { exportGradesCsv } from "@/lib/export-grades";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { useState } from "react";

const GRADE_TYPE_LABELS: Record<string, string> = {
  homework: "ДЗ",
  test: "Контрольная",
  exam: "Экзамен",
  classwork: "На уроке",
  other: "Другое",
};

const ATTENDANCE_LABELS: Record<string, { label: string; color: string }> = {
  present: { label: "Присутствовал", color: "text-success" },
  late: { label: "Опоздал", color: "text-warning" },
  absent: { label: "Пропуск", color: "text-danger" },
  excused: { label: "Уважительная", color: "text-accent" },
};

export default function GradesPage() {
  const { token, user } = useAuthStore();
  const [tab, setTab] = useState<"grades" | "attendance">("grades");

  const { data: summary = [] } = useQuery({
    queryKey: ["grades-summary", token],
    queryFn: () => api.gradesSummary(token!),
    enabled: !!token,
  });

  const { data: grades = [] } = useQuery({
    queryKey: ["grades", token],
    queryFn: () => api.grades(token!),
    enabled: !!token,
  });

  const { data: attendance = [] } = useQuery({
    queryKey: ["attendance", token],
    queryFn: () => api.attendance(token!),
    enabled: !!token && tab === "attendance",
  });

  const { data: stats } = useQuery({
    queryKey: ["attendance-stats", token],
    queryFn: () => api.attendanceStats(token!),
    enabled: !!token,
  });

  return (
    <AuthGuard roles={["student", "teacher"]}>
      <CabinetShell>
        <div className="mx-auto max-w-5xl space-y-6 pb-20 lg:pb-0">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-2xl font-bold">Успеваемость</h1>
            {user?.role === "student" && grades.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  exportGradesCsv(grades, summary, user.displayName)
                }
              >
                <Download className="h-4 w-4" />
                Скачать CSV
              </Button>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {summary.map((s) => (
              <div
                key={s.subjectId}
                className="rounded-xl border border-border bg-bg-secondary p-4"
                style={{ borderTopColor: s.color, borderTopWidth: 3 }}
              >
                <p className="text-sm text-text-muted">{s.subjectName}</p>
                <p className="text-2xl font-bold" style={{ color: s.color }}>
                  {s.average.toFixed(1)}
                </p>
                <p className="text-xs text-text-muted">{s.count} оценок</p>
              </div>
            ))}
          </div>

          <div className="flex gap-2 border-b border-border">
            {(["grades", "attendance"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  "px-4 py-2 text-sm transition-colors",
                  tab === t ? "border-b-2 border-accent text-text" : "text-text-muted",
                )}
              >
                {t === "grades" ? "Оценки" : "Посещаемость"}
              </button>
            ))}
          </div>

          {tab === "grades" && (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-bg-secondary">
                  <tr>
                    <th className="px-4 py-3 text-left">Дата</th>
                    <th className="px-4 py-3 text-left">Предмет</th>
                    <th className="px-4 py-3 text-left">Тема</th>
                    <th className="px-4 py-3 text-left">Тип</th>
                    <th className="px-4 py-3 text-right">Оценка</th>
                  </tr>
                </thead>
                <tbody>
                  {grades.map((g) => (
                    <tr key={g.id} className="border-t border-border">
                      <td className="px-4 py-3">{new Date(g.date).toLocaleDateString("ru-RU")}</td>
                      <td className="px-4 py-3">{g.subjectName}</td>
                      <td className="px-4 py-3 text-text-muted">{g.topic ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className="rounded bg-bg-elevated px-2 py-0.5 text-xs">
                          {GRADE_TYPE_LABELS[g.gradeType] ?? g.gradeType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-success">{g.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === "attendance" && (
            <>
              {stats && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: "Присутствовал", value: stats.present, color: "text-success" },
                    { label: "Опоздал", value: stats.late, color: "text-warning" },
                    { label: "Пропуск", value: stats.absent, color: "text-danger" },
                    { label: "Уважительная", value: stats.excused, color: "text-accent" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl border border-border bg-bg-secondary p-3 text-center">
                      <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
                      <p className="text-xs text-text-muted">{s.label}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="space-y-2">
                {attendance.map((a) => (
                  <div key={a.id} className="flex items-center justify-between rounded-lg border border-border bg-bg-secondary px-4 py-3 text-sm">
                    <div>
                      <p className="font-medium">{a.subjectName}</p>
                      <p className="text-text-muted">{new Date(a.date).toLocaleDateString("ru-RU")}</p>
                    </div>
                    <span className={cn("font-medium", ATTENDANCE_LABELS[a.status]?.color)}>
                      {ATTENDANCE_LABELS[a.status]?.label ?? a.status}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </CabinetShell>
    </AuthGuard>
  );
}

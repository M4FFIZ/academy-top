"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { CabinetShell } from "@/components/layout/cabinet-shell";
import { ScheduleGrid } from "@/components/schedule/schedule-grid";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { formatWeekLabel, getWeekRange } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { addWeeks, subWeeks } from "date-fns";
import { useState } from "react";

export default function SchedulePage() {
  const { token } = useAuthStore();
  const [weekDate, setWeekDate] = useState(new Date());
  const { start, end } = getWeekRange(weekDate);

  const { data: lessons = [], isLoading } = useQuery({
    queryKey: ["schedule", token, start.toISOString()],
    queryFn: () => api.schedule(token!, start.toISOString(), end.toISOString()),
    enabled: !!token,
  });

  return (
    <AuthGuard>
      <CabinetShell>
        <div className="mx-auto max-w-6xl space-y-4 pb-20 lg:pb-0">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-2xl font-bold">Расписание</h1>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setWeekDate(subWeeks(weekDate, 1))}
                className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-bg-elevated"
              >
                ← Неделя
              </button>
              <span className="rounded-lg bg-bg-elevated px-3 py-1.5 text-sm">
                {formatWeekLabel(start)}
              </span>
              <button
                type="button"
                onClick={() => setWeekDate(addWeeks(weekDate, 1))}
                className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-bg-elevated"
              >
                Неделя →
              </button>
            </div>
          </div>
          {isLoading ? (
            <div className="h-96 animate-pulse rounded-xl bg-bg-secondary" />
          ) : (
            <ScheduleGrid lessons={lessons} />
          )}
        </div>
      </CabinetShell>
    </AuthGuard>
  );
}

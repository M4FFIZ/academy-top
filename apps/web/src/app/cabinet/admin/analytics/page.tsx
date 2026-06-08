"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { CabinetShell } from "@/components/layout/cabinet-shell";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";

export default function AdminAnalyticsPage() {
  const { token } = useAuthStore();

  const { data: analytics = [], isLoading } = useQuery({
    queryKey: ["admin-analytics", token],
    queryFn: () => api.adminAnalytics(token!),
    enabled: !!token,
  });

  const maxGrade = Math.max(...analytics.map((a) => a.avgGrade), 5);

  return (
    <AuthGuard roles={["admin"]}>
      <CabinetShell>
        <div className="mx-auto max-w-5xl space-y-6 pb-20 lg:pb-0">
          <h1 className="text-2xl font-bold">Аналитика</h1>

          {isLoading ? (
            <div className="h-48 animate-pulse rounded-xl bg-bg-secondary" />
          ) : (
            <div className="space-y-4">
              {analytics.map((item, i) => (
                <motion.div
                  key={item.groupId}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="rounded-xl border border-border bg-bg-secondary p-4"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{item.groupName}</p>
                      <p className="text-sm text-text-muted">{item.studentCount} учеников</p>
                    </div>
                    <p className="text-2xl font-bold text-accent">{item.avgGrade.toFixed(1)}</p>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-bg-primary">
                    <div
                      className="h-full gradient-brand transition-all duration-500"
                      style={{ width: `${(item.avgGrade / maxGrade) * 100}%` }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </CabinetShell>
    </AuthGuard>
  );
}

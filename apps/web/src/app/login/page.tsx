"use client";

import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("student@top.ru");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { accessToken, user } = await api.login(email, password);
      setAuth(accessToken, user);
      router.push("/cabinet");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ошибка входа");
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (e: string) => {
    setEmail(e);
    setPassword("password123");
  };

  return (
    <div className="flex min-h-screen">
      <div className="hidden flex-1 flex-col justify-center p-12 lg:flex">
        <div className="max-w-md">
          <div className="mb-6 h-12 w-12 rounded-xl gradient-brand" />
          <h1 className="mb-4 text-4xl font-bold">
            Академия <span className="text-accent">ТОП</span>
          </h1>
          <p className="text-text-muted">
            Личный кабинет для учеников, преподавателей и администраторов.
            Расписание, успеваемость и чат группы — всё в одном месте.
          </p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center p-6">
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-bg-secondary p-8"
        >
          <h2 className="text-xl font-semibold">Вход</h2>

          {error && (
            <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
          )}

          <div>
            <label className="mb-1 block text-sm text-text-muted">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm focus:border-accent focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-text-muted">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm focus:border-accent focus:outline-none"
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Вход…" : "Войти"}
          </Button>

          <div className="border-t border-border pt-4">
            <p className="mb-2 text-xs text-text-muted">Демо-аккаунты:</p>
            <div className="flex flex-wrap gap-2">
              {[
                { email: "student@top.ru", label: "Ученик" },
                { email: "teacher@top.ru", label: "Преподаватель" },
                { email: "admin@top.ru", label: "Админ" },
              ].map((a) => (
                <button
                  key={a.email}
                  type="button"
                  onClick={() => quickLogin(a.email)}
                  className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-bg-elevated"
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </motion.form>
      </div>
    </div>
  );
}

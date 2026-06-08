"use client";

import { cn } from "@/lib/utils";
import type { ScheduleLesson } from "@/lib/api";
import { motion } from "framer-motion";
import { Clock, MapPin, User } from "lucide-react";
import { differenceInMinutes, parseISO, isWithinInterval } from "date-fns";

type CardState = "live" | "upcoming" | "free";

function getLessonState(lesson: ScheduleLesson | null): CardState {
  if (!lesson) return "free";
  const now = new Date();
  const start = parseISO(lesson.startsAt);
  const end = parseISO(lesson.endsAt);
  if (isWithinInterval(now, { start, end })) return "live";
  if (start > now) return "upcoming";
  return "free";
}

export function CurrentLessonCard({
  lesson,
  className,
}: {
  lesson: ScheduleLesson | null;
  className?: string;
}) {
  const state = getLessonState(lesson);
  const minutesUntil =
    lesson && state === "upcoming"
      ? differenceInMinutes(parseISO(lesson.startsAt), new Date())
      : null;
  const minutesLeft =
    lesson && state === "live"
      ? differenceInMinutes(parseISO(lesson.endsAt), new Date())
      : null;

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-bg-secondary p-6",
        state === "live" && "glow-accent border-accent/40",
        className,
      )}
    >
      {state === "live" && (
        <div className="absolute right-4 top-4 flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
          </span>
          <span className="text-xs font-medium text-success">Идёт сейчас</span>
        </div>
      )}

      {state === "free" && <p className="text-text-muted">На сегодня занятий больше нет</p>}

      {lesson && state !== "free" && (
        <>
          <p className="mb-1 text-xs uppercase tracking-wider text-text-muted">
            {state === "live" ? "Текущая пара" : "Следующая пара"}
            {minutesUntil != null && ` · через ${minutesUntil} мин`}
            {minutesLeft != null && ` · осталось ${minutesLeft} мин`}
          </p>
          <h2 className="mb-4 text-2xl font-bold" style={{ color: lesson.subjectColor }}>
            {lesson.subjectName}
          </h2>
          <ul className="space-y-2 text-sm text-text-muted">
            <li className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-accent" />
              {new Date(lesson.startsAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
              {" — "}
              {new Date(lesson.endsAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
            </li>
            <li className="flex items-center gap-2">
              <User className="h-4 w-4 text-accent" />
              {lesson.teacherName}
            </li>
            <li className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-accent" />
              {lesson.roomName}
            </li>
          </ul>
        </>
      )}
    </motion.article>
  );
}

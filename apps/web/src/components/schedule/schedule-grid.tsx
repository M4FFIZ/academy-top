"use client";

import { cn } from "@/lib/utils";
import type { ScheduleLesson } from "@/lib/api";
import { motion } from "framer-motion";
import { isPast, isWithinInterval, parseISO } from "date-fns";

const LESSON_TYPE_LABELS: Record<string, string> = {
  lecture: "Лекция",
  practice: "Практика",
  lab: "Лаб.",
  exam: "Экзамен",
  other: "Другое",
};

const DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

export function ScheduleGrid({ lessons }: { lessons: ScheduleLesson[] }) {
  const hours = Array.from({ length: 12 }, (_, i) => 9 + i);

  function getStatus(lesson: ScheduleLesson) {
    const now = new Date();
    const start = parseISO(lesson.startsAt);
    const end = parseISO(lesson.endsAt);
    if (isWithinInterval(now, { start, end })) return "current";
    if (isPast(end)) return "past";
    return "future";
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-bg-secondary">
      <div className="grid min-w-[800px]" style={{ gridTemplateColumns: `60px repeat(${DAYS.length}, 1fr)` }}>
        <div className="border-b border-border p-2" />
        {DAYS.map((day) => (
          <div key={day} className="border-b border-l border-border p-2 text-center text-sm font-medium">
            {day}
          </div>
        ))}

        {hours.map((hour) => (
          <div key={hour} className="contents">
            <div className="border-b border-border p-2 text-right font-mono text-xs text-text-muted">
              {hour}:00
            </div>
            {DAYS.map((_, dayIndex) => {
              const cellLessons = lessons.filter((l) => {
                const d = parseISO(l.startsAt);
                const dayOfWeek = (d.getDay() + 6) % 7;
                return dayOfWeek === dayIndex && d.getHours() === hour;
              });

              return (
                <div key={`${hour}-${dayIndex}`} className="relative min-h-[72px] border-b border-l border-border p-1">
                  {cellLessons.map((lesson) => {
                    const status = getStatus(lesson);
                    return (
                      <motion.div
                        key={lesson.id}
                        whileHover={{ scale: 1.02 }}
                        className={cn(
                          "mb-1 rounded-lg border-l-[3px] p-2 text-xs transition-opacity",
                          status === "past" && "opacity-50",
                          status === "current" && "glow-accent",
                        )}
                        style={{
                          borderLeftColor: lesson.subjectColor,
                          backgroundColor: `${lesson.subjectColor}18`,
                        }}
                      >
                        <p className="font-semibold text-text">{lesson.subjectName}</p>
                        <p className="text-text-muted">{lesson.roomName}</p>
                        <span
                          className="mt-1 inline-block rounded px-1.5 py-0.5 text-[10px]"
                          style={{ backgroundColor: `${lesson.subjectColor}30`, color: lesson.subjectColor }}
                        >
                          {LESSON_TYPE_LABELS[lesson.lessonType] ?? lesson.lessonType}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

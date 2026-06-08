import type { GradeEntry, GradeSummary } from "./api";

export function exportGradesCsv(
  grades: GradeEntry[],
  summary: GradeSummary[],
  studentName: string,
) {
  const lines = [
    `Табель успеваемости — ${studentName}`,
    `Дата выгрузки: ${new Date().toLocaleDateString("ru-RU")}`,
    "",
    "Средние по предметам:",
    ...summary.map((s) => `${s.subjectName};${s.average.toFixed(2)};${s.count}`),
    "",
    "Дата;Предмет;Тема;Тип;Оценка",
    ...grades.map(
      (g) =>
        `${new Date(g.date).toLocaleDateString("ru-RU")};${g.subjectName};${g.topic ?? ""};${g.gradeType};${g.value}`,
    ),
  ];

  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `grades_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { Roles } from '../common/decorators';
import { PrismaService } from '../prisma/prisma.service';
import { getDisplayName } from '../common/utils';

@Controller()
@UseGuards(JwtAuthGuard)
export class GradesController {
  constructor(private prisma: PrismaService) {}

  @Get('grades')
  async getGrades(
    @Req() req: { user: { id: string; role: UserRole } },
    @Query('studentId') studentId?: string,
    @Query('groupId') groupId?: string,
    @Query('subjectId') subjectId?: string,
  ) {
    const where: Record<string, string> = {};

    if (req.user.role === UserRole.student) {
      where.studentId = req.user.id;
    } else if (studentId) {
      where.studentId = studentId;
    }
    if (groupId) where.groupId = groupId;
    if (subjectId) where.subjectId = subjectId;

    const grades = await this.prisma.grade.findMany({
      where,
      include: { subject: true },
      orderBy: { gradedAt: 'desc' },
    });

    return grades.map((g) => ({
      id: g.id,
      date: g.gradedAt.toISOString(),
      subjectName: g.subject.name,
      topic: g.topic,
      value: g.value,
      gradeType: g.gradeType,
    }));
  }

  @Get('grades/summary')
  async getSummary(@Req() req: { user: { id: string; role: UserRole } }, @Query('studentId') studentId?: string) {
    const targetId = req.user.role === UserRole.student ? req.user.id : studentId;
    if (!targetId) return [];

    const grades = await this.prisma.grade.findMany({
      where: { studentId: targetId },
      include: { subject: true },
    });

    const bySubject = new Map<string, { name: string; color: string; values: number[] }>();
    for (const g of grades) {
      const entry = bySubject.get(g.subjectId) ?? {
        name: g.subject.name,
        color: g.subject.colorHex,
        values: [],
      };
      entry.values.push(g.value);
      bySubject.set(g.subjectId, entry);
    }

    return Array.from(bySubject.entries()).map(([subjectId, data]) => ({
      subjectId,
      subjectName: data.name,
      color: data.color,
      average: data.values.reduce((a, b) => a + b, 0) / data.values.length,
      count: data.values.length,
    }));
  }

  @Get('attendance')
  async getAttendance(
    @Req() req: { user: { id: string; role: UserRole } },
    @Query('studentId') studentId?: string,
  ) {
    const targetId = req.user.role === UserRole.student ? req.user.id : studentId;
    if (!targetId) return [];

    const records = await this.prisma.attendanceRecord.findMany({
      where: { studentId: targetId },
      include: { lesson: { include: { subject: true } } },
      orderBy: { markedAt: 'desc' },
    });

    return records.map((r) => ({
      id: r.id,
      date: r.lesson.startsAt.toISOString(),
      subjectName: r.lesson.subject.name,
      status: r.status,
    }));
  }

  @Get('attendance/stats')
  async getAttendanceStats(
    @Req() req: { user: { id: string; role: UserRole } },
    @Query('studentId') studentId?: string,
  ) {
    const targetId = req.user.role === UserRole.student ? req.user.id : studentId;
    if (!targetId) return null;

    const records = await this.prisma.attendanceRecord.findMany({ where: { studentId: targetId } });
    const total = records.length;
    const present = records.filter((r) => r.status === 'present').length;
    const late = records.filter((r) => r.status === 'late').length;
    const absent = records.filter((r) => r.status === 'absent').length;
    const excused = records.filter((r) => r.status === 'excused').length;

    return {
      total,
      present,
      late,
      absent,
      excused,
      percentage: total ? Math.round(((present + late) / total) * 100) : 0,
    };
  }

  @Get('journal/session')
  @UseGuards(RolesGuard)
  @Roles(UserRole.teacher, UserRole.admin)
  async getJournalSession(
    @Query('groupId') groupId: string,
    @Query('subjectId') subjectId: string,
    @Query('date') date: string,
  ) {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const lesson = await this.prisma.scheduleLesson.findFirst({
      where: {
        groupId,
        subjectId,
        startsAt: { gte: dayStart, lte: dayEnd },
      },
    });

    const students = await this.prisma.groupStudent.findMany({
      where: { groupId, isActive: true },
      include: { student: { include: { studentProfile: true } } },
    });

    const grades = lesson
      ? await this.prisma.grade.findMany({ where: { lessonId: lesson.id } })
      : [];
    const attendance = lesson
      ? await this.prisma.attendanceRecord.findMany({ where: { lessonId: lesson.id } })
      : [];

    return {
      lessonId: lesson?.id ?? null,
      students: students.map((s) => {
        const grade = grades.find((g) => g.studentId === s.studentId);
        const att = attendance.find((a) => a.studentId === s.studentId);
        return {
          studentId: s.studentId,
          name: getDisplayName({ email: s.student.email, studentProfile: s.student.studentProfile }),
          grade: grade?.value ?? null,
          attendance: att?.status ?? null,
        };
      }),
    };
  }

  @Post('journal/session')
  @UseGuards(RolesGuard)
  @Roles(UserRole.teacher, UserRole.admin)
  async saveJournalSession(
    @Req() req: { user: { id: string } },
    @Body()
    body: {
      lessonId: string;
      groupId: string;
      subjectId: string;
      entries: { studentId: string; grade?: number; attendance?: string }[];
    },
  ) {
    for (const entry of body.entries) {
      if (entry.grade != null) {
        const existing = await this.prisma.grade.findFirst({
          where: { lessonId: body.lessonId, studentId: entry.studentId },
        });
        if (existing) {
          await this.prisma.grade.update({
            where: { id: existing.id },
            data: { value: entry.grade },
          });
        } else {
          await this.prisma.grade.create({
            data: {
              studentId: entry.studentId,
              lessonId: body.lessonId,
              groupId: body.groupId,
              subjectId: body.subjectId,
              teacherId: req.user.id,
              value: entry.grade,
              gradeType: 'classwork',
            },
          });
        }
      }

      if (entry.attendance) {
        await this.prisma.attendanceRecord.upsert({
          where: {
            studentId_lessonId: {
              studentId: entry.studentId,
              lessonId: body.lessonId,
            },
          },
          create: {
            studentId: entry.studentId,
            lessonId: body.lessonId,
            status: entry.attendance as 'present',
            markedBy: req.user.id,
          },
          update: {
            status: entry.attendance as 'present',
            markedBy: req.user.id,
            markedAt: new Date(),
          },
        });
      }
    }

    return { success: true };
  }
}

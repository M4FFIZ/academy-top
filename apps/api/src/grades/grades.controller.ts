import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { Roles } from '../common/decorators';
import { PrismaService } from '../prisma/prisma.service';
import { getDisplayName } from '../common/utils';

@Controller()
@UseGuards(JwtAuthGuard)
export class GradesController {
  constructor(private prisma: PrismaService) {}

  @Get('grades/options')
  async getGradeOptions(@Req() req: { user: { id: string; role: UserRole } }) {
    if (req.user.role === UserRole.student) {
      const enrollment = await this.prisma.groupStudent.findFirst({
        where: { studentId: req.user.id, isActive: true },
        include: {
          group: {
            include: {
              subjects: { include: { subject: true } },
            },
          },
        },
      });

      const subjects = new Map<string, { id: string; name: string; colorHex: string }>();
      for (const gs of enrollment?.group.subjects ?? []) {
        subjects.set(gs.subject.id, gs.subject);
      }

      if (subjects.size === 0) {
        const grades = await this.prisma.grade.findMany({
          where: { studentId: req.user.id },
          include: { subject: true },
        });
        for (const grade of grades) subjects.set(grade.subject.id, grade.subject);
      }

      return {
        students: [],
        subjects: Array.from(subjects.values()).sort((a, b) => a.name.localeCompare(b.name)),
      };
    }

    const groupSubjects = await this.prisma.groupSubject.findMany({
      where: req.user.role === UserRole.teacher ? { teacherId: req.user.id } : {},
      include: {
        subject: true,
        group: {
          include: {
            students: {
              where: { isActive: true },
              include: { student: { include: { studentProfile: true } } },
            },
          },
        },
      },
      orderBy: { group: { name: 'asc' } },
    });

    const students = new Map<string, { id: string; displayName: string; groupName: string }>();
    const subjects = new Map<string, { id: string; name: string; colorHex: string }>();

    for (const gs of groupSubjects) {
      subjects.set(gs.subject.id, gs.subject);
      for (const groupStudent of gs.group.students) {
        students.set(groupStudent.studentId, {
          id: groupStudent.studentId,
          displayName: getDisplayName(groupStudent.student),
          groupName: gs.group.name,
        });
      }
    }

    return {
      students: Array.from(students.values()).sort((a, b) => a.displayName.localeCompare(b.displayName)),
      subjects: Array.from(subjects.values()).sort((a, b) => a.name.localeCompare(b.name)),
    };
  }

  @Get('grades')
  async getGrades(
    @Req() req: { user: { id: string; role: UserRole } },
    @Query('studentId') studentId?: string,
    @Query('groupId') groupId?: string,
    @Query('subjectId') subjectId?: string,
  ) {
    const where = await this.buildGradeWhere(req, { studentId, groupId, subjectId });

    const grades = await this.prisma.grade.findMany({
      where,
      include: {
        subject: true,
        group: true,
        student: { include: { studentProfile: true } },
      },
      orderBy: { gradedAt: 'desc' },
    });

    return grades.map((g) => ({
      id: g.id,
      studentId: g.studentId,
      studentName: getDisplayName(g.student),
      subjectId: g.subjectId,
      date: g.gradedAt.toISOString(),
      subjectName: g.subject.name,
      groupName: g.group.name,
      topic: g.topic,
      value: g.value,
      gradeType: g.gradeType,
    }));
  }

  @Get('grades/summary')
  async getSummary(
    @Req() req: { user: { id: string; role: UserRole } },
    @Query('studentId') studentId?: string,
    @Query('subjectId') subjectId?: string,
  ) {
    if (req.user.role !== UserRole.student && !studentId) return [];
    const where = await this.buildGradeWhere(req, { studentId, subjectId });

    const grades = await this.prisma.grade.findMany({
      where,
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

  private async buildGradeWhere(
    req: { user: { id: string; role: UserRole } },
    filters: { studentId?: string; groupId?: string; subjectId?: string },
  ): Promise<Prisma.GradeWhereInput> {
    const where: Prisma.GradeWhereInput = {};

    if (req.user.role === UserRole.student) {
      where.studentId = req.user.id;
      if (filters.subjectId) where.subjectId = filters.subjectId;
      if (filters.groupId) where.groupId = filters.groupId;
      return where;
    }

    if (filters.studentId) where.studentId = filters.studentId;
    if (filters.subjectId) where.subjectId = filters.subjectId;
    if (filters.groupId) where.groupId = filters.groupId;

    if (req.user.role === UserRole.admin) return where;

    const groupSubjects = await this.prisma.groupSubject.findMany({
      where: {
        teacherId: req.user.id,
        ...(filters.groupId ? { groupId: filters.groupId } : {}),
        ...(filters.subjectId ? { subjectId: filters.subjectId } : {}),
      },
      select: { groupId: true, subjectId: true },
    });

    if (groupSubjects.length === 0) return { id: { in: [] } };

    where.OR = groupSubjects.map((gs) => ({
      groupId: gs.groupId,
      subjectId: gs.subjectId,
    }));

    return where;
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

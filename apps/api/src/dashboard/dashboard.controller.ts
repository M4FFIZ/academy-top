import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards';
import { PrismaService } from '../prisma/prisma.service';
import { getDisplayName } from '../common/utils';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async getDashboard(@Req() req: { user: { id: string; role: UserRole } }) {
    const { id, role } = req.user;
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    if (role === UserRole.student) {
      const enrollment = await this.prisma.groupStudent.findFirst({
        where: { studentId: id, isActive: true },
        include: { group: true },
      });
      if (!enrollment) return { group: null, currentLesson: null, todayLessons: [], stats: null };

      const lessons = await this.prisma.scheduleLesson.findMany({
        where: {
          groupId: enrollment.groupId,
          startsAt: { gte: todayStart, lte: todayEnd },
        },
        include: {
          subject: true,
          teacher: { include: { teacherProfile: true } },
          room: true,
        },
        orderBy: { startsAt: 'asc' },
      });

      const currentLesson =
        lessons.find((l) => l.startsAt <= now && l.endsAt >= now) ??
        lessons.find((l) => l.startsAt > now) ??
        null;

      const grades = await this.prisma.grade.findMany({ where: { studentId: id } });
      const avgGrade = grades.length
        ? grades.reduce((s, g) => s + g.value, 0) / grades.length
        : null;

      const attendance = await this.prisma.attendanceRecord.findMany({
        where: { studentId: id },
      });
      const presentCount = attendance.filter((a) => a.status === 'present' || a.status === 'late').length;
      const attendancePct = attendance.length
        ? Math.round((presentCount / attendance.length) * 100)
        : null;

      return {
        group: enrollment.group,
        currentLesson: currentLesson ? this.mapLesson(currentLesson) : null,
        todayLessons: lessons.map((l) => this.mapLesson(l)),
        stats: { avgGrade, attendancePct },
      };
    }

    if (role === UserRole.teacher) {
      const groups = await this.prisma.groupSubject.findMany({
        where: { teacherId: id },
        include: { group: true, subject: true },
      });
      const groupIds = [...new Set(groups.map((g) => g.groupId))];

      const todayLessons = await this.prisma.scheduleLesson.findMany({
        where: {
          teacherId: id,
          startsAt: { gte: todayStart, lte: todayEnd },
        },
        include: { group: true, subject: true, room: true },
        orderBy: { startsAt: 'asc' },
      });

      return {
        groups: groups.map((g) => ({
          id: g.group.id,
          name: g.group.name,
          subjectName: g.subject.name,
        })),
        todayLessons: todayLessons.map((l) => this.mapLesson(l)),
      };
    }

    const [usersCount, groupsCount, lessonsToday] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.group.count({ where: { status: 'active' } }),
      this.prisma.scheduleLesson.count({
        where: { startsAt: { gte: todayStart, lte: todayEnd } },
      }),
    ]);

    return { usersCount, groupsCount, lessonsToday };
  }

  private mapLesson(lesson: {
    id: string;
    startsAt: Date;
    endsAt: Date;
    lessonType: string;
    subject: { name: string; colorHex: string };
    teacher?: { teacherProfile?: { firstName: string; lastName: string } | null };
    room?: { name: string } | null;
    group?: { name: string };
  }) {
    return {
      id: lesson.id,
      subjectName: lesson.subject.name,
      subjectColor: lesson.subject.colorHex,
      teacherName: lesson.teacher?.teacherProfile
        ? getDisplayName({ email: '', teacherProfile: lesson.teacher.teacherProfile })
        : '',
      roomName: lesson.room?.name ?? '—',
      groupName: lesson.group?.name,
      lessonType: lesson.lessonType,
      startsAt: lesson.startsAt.toISOString(),
      endsAt: lesson.endsAt.toISOString(),
    };
  }
}

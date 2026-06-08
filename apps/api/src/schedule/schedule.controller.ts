import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { Roles } from '../common/decorators';
import { PrismaService } from '../prisma/prisma.service';
import { getDisplayName } from '../common/utils';

@Controller('schedule')
@UseGuards(JwtAuthGuard)
export class ScheduleController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async getSchedule(
    @Req() req: { user: { id: string; role: UserRole } },
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('groupId') groupId?: string,
  ) {
    const fromDate = from ? new Date(from) : new Date();
    const toDate = to ? new Date(to) : new Date(fromDate.getTime() + 7 * 86400000);

    let targetGroupId = groupId;

    if (!targetGroupId) {
      if (req.user.role === UserRole.student) {
        const enrollment = await this.prisma.groupStudent.findFirst({
          where: { studentId: req.user.id, isActive: true },
        });
        targetGroupId = enrollment?.groupId;
      } else if (req.user.role === UserRole.teacher) {
        const lessons = await this.prisma.scheduleLesson.findMany({
          where: {
            teacherId: req.user.id,
            startsAt: { gte: fromDate, lte: toDate },
          },
          include: { subject: true, teacher: { include: { teacherProfile: true } }, room: true, group: true },
        });
        return lessons.map((l) => this.mapLesson(l));
      }
    }

    if (!targetGroupId) return [];

    const lessons = await this.prisma.scheduleLesson.findMany({
      where: {
        groupId: targetGroupId,
        startsAt: { gte: fromDate, lte: toDate },
      },
      include: {
        subject: true,
        teacher: { include: { teacherProfile: true } },
        room: true,
        group: true,
      },
      orderBy: { startsAt: 'asc' },
    });

    return lessons.map((l) => this.mapLesson(l));
  }

  @Post('lessons')
  @UseGuards(RolesGuard)
  @Roles(UserRole.admin)
  async createLesson(@Body() body: Record<string, string>) {
    await this.checkConflicts(body);
    const lesson = await this.prisma.scheduleLesson.create({
      data: {
        groupId: body.groupId,
        subjectId: body.subjectId,
        teacherId: body.teacherId,
        roomId: body.roomId || null,
        lessonType: (body.lessonType as 'lecture') ?? 'lecture',
        startsAt: new Date(body.startsAt),
        endsAt: new Date(body.endsAt),
        comment: body.comment,
      },
      include: { subject: true, teacher: { include: { teacherProfile: true } }, room: true, group: true },
    });
    return this.mapLesson(lesson);
  }

  @Patch('lessons/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.admin)
  async updateLesson(@Param('id') id: string, @Body() body: Record<string, string>) {
    await this.checkConflicts(body, id);
    const lesson = await this.prisma.scheduleLesson.update({
      where: { id },
      data: {
        subjectId: body.subjectId,
        teacherId: body.teacherId,
        roomId: body.roomId || null,
        lessonType: body.lessonType as 'lecture' | undefined,
        startsAt: body.startsAt ? new Date(body.startsAt) : undefined,
        endsAt: body.endsAt ? new Date(body.endsAt) : undefined,
        comment: body.comment,
      },
      include: { subject: true, teacher: { include: { teacherProfile: true } }, room: true, group: true },
    });
    return this.mapLesson(lesson);
  }

  @Delete('lessons/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.admin)
  deleteLesson(@Param('id') id: string) {
    return this.prisma.scheduleLesson.delete({ where: { id } });
  }

  @Post('copy-week')
  @UseGuards(RolesGuard)
  @Roles(UserRole.admin)
  async copyWeek(
    @Body() body: { groupId: string; sourceWeekStart: string; targetWeekStart: string },
  ) {
    const sourceStart = new Date(body.sourceWeekStart);
    const targetStart = new Date(body.targetWeekStart);
    const diff = targetStart.getTime() - sourceStart.getTime();
    const sourceEnd = new Date(sourceStart.getTime() + 7 * 86400000);

    const lessons = await this.prisma.scheduleLesson.findMany({
      where: {
        groupId: body.groupId,
        startsAt: { gte: sourceStart, lt: sourceEnd },
      },
    });

    const created = await Promise.all(
      lessons.map((l) =>
        this.prisma.scheduleLesson.create({
          data: {
            groupId: l.groupId,
            subjectId: l.subjectId,
            teacherId: l.teacherId,
            roomId: l.roomId,
            lessonType: l.lessonType,
            startsAt: new Date(l.startsAt.getTime() + diff),
            endsAt: new Date(l.endsAt.getTime() + diff),
            comment: l.comment,
          },
        }),
      ),
    );

    return { copied: created.length };
  }

  private async checkConflicts(body: Record<string, string>, excludeId?: string) {
    if (!body.teacherId || !body.startsAt || !body.endsAt) return;
    const startsAt = new Date(body.startsAt);
    const endsAt = new Date(body.endsAt);

    const teacherConflict = await this.prisma.scheduleLesson.findFirst({
      where: {
        id: excludeId ? { not: excludeId } : undefined,
        teacherId: body.teacherId,
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
    });
    if (teacherConflict) {
      throw new BadRequestException('Преподаватель занят в это время');
    }

    if (body.roomId) {
      const roomConflict = await this.prisma.scheduleLesson.findFirst({
        where: {
          id: excludeId ? { not: excludeId } : undefined,
          roomId: body.roomId,
          startsAt: { lt: endsAt },
          endsAt: { gt: startsAt },
        },
      });
      if (roomConflict) {
        throw new BadRequestException('Аудитория занята в это время');
      }
    }
  }

  private mapLesson(lesson: {
    id: string;
    startsAt: Date;
    endsAt: Date;
    lessonType: string;
    subject: { name: string; colorHex: string };
    teacher: { teacherProfile?: { firstName: string; lastName: string } | null };
    room?: { name: string } | null;
    group?: { name: string; id: string };
  }) {
    return {
      id: lesson.id,
      groupId: lesson.group?.id,
      groupName: lesson.group?.name,
      subjectName: lesson.subject.name,
      subjectColor: lesson.subject.colorHex,
      teacherName: getDisplayName({ email: '', teacherProfile: lesson.teacher.teacherProfile }),
      roomName: lesson.room?.name ?? '—',
      lessonType: lesson.lessonType,
      startsAt: lesson.startsAt.toISOString(),
      endsAt: lesson.endsAt.toISOString(),
    };
  }
}

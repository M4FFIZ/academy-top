import {
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

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.admin)
export class AdminController {
  constructor(private prisma: PrismaService) {}

  @Get('users')
  async getUsers(@Query('role') role?: UserRole, @Query('search') search?: string) {
    const users = await this.prisma.user.findMany({
      where: {
        role: role ?? undefined,
        OR: search
          ? [{ email: { contains: search } }]
          : undefined,
      },
      include: { studentProfile: true, teacherProfile: true, groupStudents: { where: { isActive: true }, include: { group: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      status: u.status,
      displayName: getDisplayName(u),
      group: u.groupStudents[0]?.group ?? null,
    }));
  }

  @Patch('users/:id/status')
  updateUserStatus(@Param('id') id: string, @Body() body: { status: 'active' | 'blocked' }) {
    return this.prisma.user.update({ where: { id }, data: { status: body.status } });
  }

  @Get('groups')
  getGroups() {
    return this.prisma.group.findMany({
      include: {
        subjects: { include: { subject: true, teacher: { include: { teacherProfile: true } } } },
        _count: { select: { students: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  @Post('groups')
  createGroup(@Body() body: { name: string; code?: string; academicYear?: string }) {
    return this.prisma.group.create({
      data: {
        name: body.name,
        code: body.code,
        academicYear: body.academicYear,
        chatRoom: { create: { type: 'group', name: `${body.name} — чат` } },
      },
    });
  }

  @Get('subjects')
  getSubjects() {
    return this.prisma.subject.findMany({ orderBy: { name: 'asc' } });
  }

  @Post('subjects')
  createSubject(@Body() body: { name: string; shortName?: string; colorHex?: string }) {
    return this.prisma.subject.create({ data: body });
  }

  @Get('rooms')
  getRooms() {
    return this.prisma.room.findMany({ orderBy: { name: 'asc' } });
  }

  @Post('rooms')
  createRoom(@Body() body: { name: string; building?: string; capacity?: number }) {
    return this.prisma.room.create({ data: body });
  }

  @Post('group-subjects')
  createGroupSubject(@Body() body: { groupId: string; subjectId: string; teacherId: string; hoursPerWeek?: number }) {
    return this.prisma.groupSubject.create({ data: body });
  }

  @Post('enroll')
  enrollStudent(@Body() body: { studentId: string; groupId: string }) {
    return this.prisma.$transaction(async (tx) => {
      await tx.groupStudent.updateMany({
        where: { studentId: body.studentId, isActive: true },
        data: { isActive: false, leftAt: new Date() },
      });
      const enrollment = await tx.groupStudent.create({
        data: { studentId: body.studentId, groupId: body.groupId, isActive: true },
      });

      const chatRoom = await tx.chatRoom.findUnique({ where: { groupId: body.groupId } });
      if (chatRoom) {
        await tx.chatParticipant.upsert({
          where: { roomId_userId: { roomId: chatRoom.id, userId: body.studentId } },
          create: { roomId: chatRoom.id, userId: body.studentId, role: 'member' },
          update: {},
        });
      }
      return enrollment;
    });
  }

  @Get('teachers')
  getTeachers() {
    return this.prisma.user.findMany({
      where: { role: 'teacher' },
      include: { teacherProfile: true },
    });
  }

  @Get('analytics')
  async getAnalytics() {
    const groups = await this.prisma.group.findMany({
      where: { status: 'active' },
      include: {
        students: { where: { isActive: true } },
        grades: true,
      },
    });

    return groups.map((g) => {
      const studentIds = g.students.map((s) => s.studentId);
      const groupGrades = g.grades.filter((gr) => studentIds.includes(gr.studentId));
      const avg = groupGrades.length
        ? groupGrades.reduce((s, gr) => s + gr.value, 0) / groupGrades.length
        : 0;
      return { groupId: g.id, groupName: g.name, studentCount: studentIds.length, avgGrade: Math.round(avg * 10) / 10 };
    });
  }
}

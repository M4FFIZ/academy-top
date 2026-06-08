import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { Roles } from '../common/decorators';
import { PrismaService } from '../prisma/prisma.service';

@Controller('groups')
@UseGuards(JwtAuthGuard)
export class GroupsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.teacher, UserRole.admin)
  async getGroups(@Req() req: { user: { id: string; role: UserRole } }) {
    if (req.user.role === UserRole.admin) {
      return this.prisma.group.findMany({
        include: {
          subjects: { include: { subject: true, teacher: { include: { teacherProfile: true } } } },
          _count: { select: { students: true } },
        },
        orderBy: { name: 'asc' },
      });
    }

    const groupSubjects = await this.prisma.groupSubject.findMany({
      where: { teacherId: req.user.id },
      include: {
        group: {
          include: {
            subjects: { include: { subject: true, teacher: { include: { teacherProfile: true } } } },
            _count: { select: { students: true } },
          },
        },
      },
    });

    const unique = new Map<string, typeof groupSubjects[0]['group']>();
    for (const gs of groupSubjects) {
      unique.set(gs.group.id, gs.group);
    }
    return Array.from(unique.values());
  }
}

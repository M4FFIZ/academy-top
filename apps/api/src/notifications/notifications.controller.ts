import { Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards';
import { PrismaService } from '../prisma/prisma.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async list(@Req() req: { user: { id: string } }) {
    const items = await this.prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return items.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      link: n.link,
      isRead: n.isRead,
      createdAt: n.createdAt.toISOString(),
    }));
  }

  @Get('unread-count')
  async unreadCount(@Req() req: { user: { id: string } }) {
    const count = await this.prisma.notification.count({
      where: { userId: req.user.id, isRead: false },
    });
    return { count };
  }

  @Patch(':id/read')
  async markRead(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    await this.prisma.notification.updateMany({
      where: { id, userId: req.user.id },
      data: { isRead: true },
    });
    return { success: true };
  }

  @Post('read-all')
  async readAll(@Req() req: { user: { id: string } }) {
    await this.prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true },
    });
    return { success: true };
  }
}

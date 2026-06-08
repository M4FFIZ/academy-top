import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
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
import { ChatService } from './chat.service';

@Controller('chats')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(
    private prisma: PrismaService,
    private chatService: ChatService,
  ) {}

  @Get('summary')
  async getSummary(@Req() req: { user: { id: string } }) {
    const chats = await this.chatService.getChatList(req.user.id);
    const unreadMessages = chats.reduce((s, c) => s + c.unread, 0);
    const pendingRequests = await this.prisma.friendship.count({
      where: { receiverId: req.user.id, status: 'pending' },
    });
    return { unreadMessages, pendingRequests, totalChats: chats.length };
  }

  @Get()
  getChats(@Req() req: { user: { id: string } }) {
    return this.chatService.getChatList(req.user.id);
  }

  @Post('dm')
  openDm(@Req() req: { user: { id: string } }, @Body() body: { userId: string }) {
    return this.chatService.getOrCreateDmRoom(req.user.id, body.userId);
  }

  @Get(':roomId/messages')
  async getMessages(
    @Req() req: { user: { id: string } },
    @Param('roomId') roomId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limitStr?: string,
  ) {
    await this.chatService.ensureParticipant(req.user.id, roomId);
    const limit = Math.min(parseInt(limitStr ?? '50', 10), 100);

    const messages = await this.prisma.chatMessage.findMany({
      where: {
        roomId,
        isDeleted: false,
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      include: { sender: { include: { studentProfile: true, teacherProfile: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return messages.reverse().map((m) => ({
      id: m.id,
      roomId: m.roomId,
      senderId: m.senderId,
      senderName: getDisplayName(m.sender),
      senderUsername: m.sender.username,
      content: m.content,
      isPinned: m.isPinned,
      createdAt: m.createdAt.toISOString(),
      isOwn: m.senderId === req.user.id,
    }));
  }

  @Get(':roomId/participants')
  async getParticipants(@Req() req: { user: { id: string } }, @Param('roomId') roomId: string) {
    await this.chatService.ensureParticipant(req.user.id, roomId);
    const participants = await this.prisma.chatParticipant.findMany({
      where: { roomId },
      include: { user: { include: { studentProfile: true, teacherProfile: true } } },
    });
    return participants.map((p) => ({
      id: p.userId,
      name: getDisplayName(p.user),
      username: p.user.username,
      role: p.role,
    }));
  }

  @Post(':roomId/messages/:id/pin')
  @UseGuards(RolesGuard)
  @Roles(UserRole.teacher, UserRole.admin)
  async pinMessage(@Param('id') id: string) {
    return this.prisma.chatMessage.update({
      where: { id },
      data: { isPinned: true },
    });
  }

  @Delete(':roomId/messages/:id')
  async deleteMessage(@Req() req: { user: { id: string; role: UserRole } }, @Param('id') id: string) {
    const msg = await this.prisma.chatMessage.findUnique({ where: { id } });
    if (!msg) return { success: false };

    await this.chatService.ensureParticipant(req.user.id, msg.roomId);

    const participant = await this.prisma.chatParticipant.findUnique({
      where: { roomId_userId: { roomId: msg.roomId, userId: req.user.id } },
    });

    const canDelete =
      msg.senderId === req.user.id ||
      participant?.role === 'moderator' ||
      participant?.role === 'admin' ||
      req.user.role === UserRole.admin ||
      req.user.role === UserRole.teacher;

    if (!canDelete) throw new ForbiddenException();

    return this.prisma.chatMessage.update({
      where: { id },
      data: { isDeleted: true, deletedBy: req.user.id },
    });
  }

  @Post(':roomId/read')
  async markRead(@Req() req: { user: { id: string } }, @Param('roomId') roomId: string) {
    await this.chatService.ensureParticipant(req.user.id, roomId);
    await this.prisma.chatParticipant.update({
      where: { roomId_userId: { roomId, userId: req.user.id } },
      data: { lastReadAt: new Date() },
    });
    return { success: true };
  }
}

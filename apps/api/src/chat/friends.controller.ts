import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards';
import { FriendsService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { formatUserPublic, getDisplayName } from '../common/utils';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Controller('friends')
@UseGuards(JwtAuthGuard)
export class FriendsController {
  constructor(
    private friends: FriendsService,
    private gateway: ChatGateway,
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  @Get()
  getFriends(@Req() req: { user: { id: string } }) {
    return this.friends.getFriends(req.user.id);
  }

  @Get('requests')
  getRequests(@Req() req: { user: { id: string } }) {
    return this.friends.getRequests(req.user.id);
  }

  @Get('search')
  search(@Req() req: { user: { id: string } }, @Query('q') q: string) {
    return this.friends.searchByUsername(q ?? '', req.user.id);
  }

  @Post('request')
  async sendRequest(@Req() req: { user: { id: string } }, @Body() body: { username: string }) {
    const result = await this.friends.sendRequest(req.user.id, body.username);

    if (result.status === 'pending') {
      const sender = await this.prisma.user.findUnique({
        where: { id: req.user.id },
        include: { studentProfile: true, teacherProfile: true },
      });
      if (sender && result.user) {
        const senderName = getDisplayName(sender);
        await this.notifications.create({
          userId: result.user.id,
          type: 'friend_request',
          title: 'Заявка в друзья',
          body: `${senderName} хочет добавить вас в друзья`,
          link: '/cabinet/chat',
        });
        this.gateway.emitFriendRequest(result.user.id, {
          id: result.id,
          user: formatUserPublic(sender),
        });
        this.gateway.emitNotification(result.user.id, {
          type: 'friend_request',
          title: 'Заявка в друзья',
          body: `${senderName} хочет добавить вас в друзья`,
        });
      }
    }

    return result;
  }

  @Post(':id/accept')
  async accept(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    const result = await this.friends.acceptRequest(req.user.id, id);

    const me = await this.prisma.user.findUnique({
      where: { id: req.user.id },
      include: { studentProfile: true, teacherProfile: true },
    });

    if (me) {
      const myName = getDisplayName(me);
      await this.notifications.create({
        userId: result.user.id,
        type: 'friend_accepted',
        title: 'Заявка принята',
        body: `${myName} принял(а) вашу заявку в друзья`,
        link: '/cabinet/chat',
      });
      this.gateway.emitFriendAccepted(result.user.id, {
        user: formatUserPublic(me),
      });
      this.gateway.emitNotification(result.user.id, {
        type: 'friend_accepted',
        title: 'Заявка принята',
        body: `${myName} принял(а) вашу заявку`,
      });
    }

    return result;
  }

  @Post(':id/decline')
  decline(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    return this.friends.declineRequest(req.user.id, id);
  }

  @Delete(':userId')
  removeFriend(@Req() req: { user: { id: string } }, @Param('userId') userId: string) {
    return this.friends.removeFriend(req.user.id, userId);
  }
}

import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { getDisplayName, JwtPayload } from '../common/utils';
import { ChatService } from './chat.service';

import { NotificationsService } from '../notifications/notifications.service';

@WebSocketGateway({
  cors: { origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000', credentials: true },
  namespace: '/ws',
})
export class ChatGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  constructor(
    private jwt: JwtService,
    private prisma: PrismaService,
    private chatService: ChatService,
    private notifications: NotificationsService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.query?.token as string);
      if (!token) {
        client.disconnect();
        return;
      }
      const payload = this.jwt.verify<JwtPayload>(token, {
        secret: process.env.JWT_SECRET ?? 'dev-secret',
      });
      client.data.userId = payload.sub;

      client.join(`user:${payload.sub}`);

      const participations = await this.prisma.chatParticipant.findMany({
        where: { userId: payload.sub },
        select: { roomId: true },
      });
      for (const p of participations) {
        client.join(p.roomId);
      }
    } catch {
      client.disconnect();
    }
  }

  @SubscribeMessage('join_room')
  async joinRoom(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string }) {
    try {
      await this.chatService.ensureParticipant(client.data.userId as string, data.roomId);
      client.join(data.roomId);
      return { joined: data.roomId };
    } catch {
      return { error: 'Forbidden' };
    }
  }

  @SubscribeMessage('send_message')
  async sendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; content: string },
  ) {
    const userId = client.data.userId as string;

    try {
      await this.chatService.ensureParticipant(userId, data.roomId);
    } catch {
      return { error: 'Forbidden' };
    }

    const trimmed = data.content?.trim();
    if (!trimmed) return { error: 'Empty message' };

    const message = await this.prisma.chatMessage.create({
      data: {
        roomId: data.roomId,
        senderId: userId,
        content: trimmed,
      },
      include: {
        sender: { include: { studentProfile: true, teacherProfile: true } },
      },
    });

    await this.prisma.chatRoom.update({
      where: { id: data.roomId },
      data: { updatedAt: new Date() },
    });

    const payload = {
      id: message.id,
      roomId: message.roomId,
      senderId: message.senderId,
      senderName: getDisplayName(message.sender),
      senderUsername: message.sender.username,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
    };

    client.to(data.roomId).emit('message_new', payload);

    const participants = await this.prisma.chatParticipant.findMany({
      where: { roomId: data.roomId },
      select: { userId: true },
    });

    for (const p of participants) {
      if (p.userId !== userId) {
        const preview = trimmed.length > 80 ? `${trimmed.slice(0, 80)}…` : trimmed;
        await this.notifications.create({
          userId: p.userId,
          type: 'chat_message',
          title: payload.senderName,
          body: preview,
          link: `/cabinet/chat`,
        });
        this.server.to(`user:${p.userId}`).emit('chat_updated', {
          roomId: data.roomId,
          lastMessage: {
            content: payload.content,
            createdAt: payload.createdAt,
            senderName: payload.senderName,
          },
        });
        this.server.to(`user:${p.userId}`).emit('notification_new', {
          type: 'chat_message',
          title: payload.senderName,
          body: preview,
          roomId: data.roomId,
        });
      }
    }

    return { ...payload, isOwn: true };
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; isTyping: boolean },
  ) {
    client.to(data.roomId).emit('typing', {
      userId: client.data.userId,
      isTyping: data.isTyping,
    });
  }

  emitFriendRequest(receiverId: string, data: unknown) {
    this.server.to(`user:${receiverId}`).emit('friend_request', data);
  }

  emitFriendAccepted(userId: string, data: unknown) {
    this.server.to(`user:${userId}`).emit('friend_accepted', data);
  }

  emitNotification(userId: string, data: unknown) {
    this.server.to(`user:${userId}`).emit('notification_new', data);
  }
}

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { buildDmKey, formatUserPublic, getDisplayName, isValidUsername, normalizeUsername } from '../common/utils';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async getChatList(userId: string) {
    const participations = await this.prisma.chatParticipant.findMany({
      where: { userId },
      include: {
        room: {
          include: {
            group: true,
            participants: {
              include: {
                user: {
                  include: { studentProfile: true, teacherProfile: true },
                },
              },
            },
            messages: {
              where: { isDeleted: false },
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: {
                sender: { include: { studentProfile: true, teacherProfile: true } },
              },
            },
          },
        },
      },
    });

    const chats = await Promise.all(
      participations.map(async (p) => {
        const room = p.room;
        const lastMsg = room.messages[0] ?? null;

        let unread = 0;
        if (lastMsg && p.lastReadAt) {
          if (lastMsg.createdAt > p.lastReadAt && lastMsg.senderId !== userId) unread = 1;
        } else if (lastMsg && lastMsg.senderId !== userId) {
          unread = 1;
        }

        const unreadCount = await this.prisma.chatMessage.count({
          where: {
            roomId: room.id,
            isDeleted: false,
            senderId: { not: userId },
            ...(p.lastReadAt ? { createdAt: { gt: p.lastReadAt } } : {}),
          },
        });

        if (room.type === 'private') {
          const peer = room.participants.find((part) => part.userId !== userId)?.user;
          return {
            id: room.id,
            type: room.type,
            name: peer ? getDisplayName(peer) : 'Личный чат',
            peer: peer ? formatUserPublic(peer) : null,
            lastMessage: lastMsg
              ? {
                  content: lastMsg.content,
                  createdAt: lastMsg.createdAt.toISOString(),
                  senderName: getDisplayName(lastMsg.sender),
                }
              : null,
            unread: unreadCount,
            updatedAt: lastMsg?.createdAt.toISOString() ?? room.updatedAt.toISOString(),
          };
        }

        return {
          id: room.id,
          type: room.type,
          name: room.name ?? room.group?.name ?? 'Групповой чат',
          peer: null,
          lastMessage: lastMsg
            ? {
                content: lastMsg.content,
                createdAt: lastMsg.createdAt.toISOString(),
                senderName: getDisplayName(lastMsg.sender),
              }
            : null,
          unread: unreadCount,
          updatedAt: lastMsg?.createdAt.toISOString() ?? room.updatedAt.toISOString(),
        };
      }),
    );

    return chats.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }

  async getOrCreateDmRoom(userId: string, targetUserId: string) {
    if (userId === targetUserId) {
      throw new BadRequestException('Нельзя написать самому себе');
    }

    const friendship = await this.prisma.friendship.findFirst({
      where: {
        status: 'accepted',
        OR: [
          { senderId: userId, receiverId: targetUserId },
          { senderId: targetUserId, receiverId: userId },
        ],
      },
    });

    if (!friendship) {
      throw new ForbiddenException('Можно писать только друзьям. Сначала добавьте в друзья.');
    }

    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId, status: 'active' },
      include: { studentProfile: true, teacherProfile: true },
    });
    if (!target) throw new NotFoundException('Пользователь не найден');

    const dmKey = buildDmKey(userId, targetUserId);

    let room = await this.prisma.chatRoom.findUnique({
      where: { dmKey },
      include: {
        participants: {
          include: { user: { include: { studentProfile: true, teacherProfile: true } } },
        },
      },
    });

    if (!room) {
      room = await this.prisma.chatRoom.create({
        data: {
          type: 'private',
          dmKey,
          name: null,
          participants: {
            create: [
              { userId, role: 'member' },
              { userId: targetUserId, role: 'member' },
            ],
          },
        },
        include: {
          participants: {
            include: { user: { include: { studentProfile: true, teacherProfile: true } } },
          },
        },
      });
    }

    const peer = room.participants.find((p) => p.userId !== userId)?.user;

    return {
      id: room.id,
      type: room.type,
      name: peer ? getDisplayName(peer) : 'Личный чат',
      peer: peer ? formatUserPublic(peer) : null,
    };
  }

  async ensureParticipant(userId: string, roomId: string) {
    const p = await this.prisma.chatParticipant.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });
    if (!p) throw new ForbiddenException('Нет доступа к чату');
    return p;
  }

  async areFriends(userId1: string, userId2: string): Promise<boolean> {
    const f = await this.prisma.friendship.findFirst({
      where: {
        status: 'accepted',
        OR: [
          { senderId: userId1, receiverId: userId2 },
          { senderId: userId2, receiverId: userId1 },
        ],
      },
    });
    return !!f;
  }
}

@Injectable()
export class FriendsService {
  constructor(private prisma: PrismaService) {}

  async searchByUsername(query: string, currentUserId: string) {
    const username = normalizeUsername(query);
    if (username.length < 2) return [];

    const users = await this.prisma.user.findMany({
      where: {
        username: { contains: username },
        status: 'active',
        id: { not: currentUserId },
      },
      include: { studentProfile: true, teacherProfile: true },
      take: 10,
    });

    return Promise.all(users.map((u) => this.formatWithRelation(u, currentUserId)));
  }

  async getFriends(userId: string) {
    const friendships = await this.prisma.friendship.findMany({
      where: {
        status: 'accepted',
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      include: {
        sender: { include: { studentProfile: true, teacherProfile: true } },
        receiver: { include: { studentProfile: true, teacherProfile: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return friendships.map((f) => {
      const friend = f.senderId === userId ? f.receiver : f.sender;
      return formatUserPublic(friend);
    });
  }

  async getRequests(userId: string) {
    const [incoming, outgoing] = await Promise.all([
      this.prisma.friendship.findMany({
        where: { receiverId: userId, status: 'pending' },
        include: {
          sender: { include: { studentProfile: true, teacherProfile: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.friendship.findMany({
        where: { senderId: userId, status: 'pending' },
        include: {
          receiver: { include: { studentProfile: true, teacherProfile: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      incoming: incoming.map((r) => ({
        id: r.id,
        user: formatUserPublic(r.sender),
        createdAt: r.createdAt.toISOString(),
      })),
      outgoing: outgoing.map((r) => ({
        id: r.id,
        user: formatUserPublic(r.receiver),
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  async sendRequest(userId: string, username: string) {
    const normalized = normalizeUsername(username);
    if (!isValidUsername(normalized)) {
      throw new BadRequestException('Username: 5–32 символа, латиница, цифры, _');
    }

    const target = await this.prisma.user.findUnique({
      where: { username: normalized },
      include: { studentProfile: true, teacherProfile: true },
    });

    if (!target || target.status !== 'active') {
      throw new NotFoundException(`Пользователь @${normalized} не найден`);
    }

    if (target.id === userId) {
      throw new BadRequestException('Нельзя добавить себя');
    }

    const existing = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { senderId: userId, receiverId: target.id },
          { senderId: target.id, receiverId: userId },
        ],
      },
    });

    if (existing) {
      if (existing.status === 'accepted') {
        throw new BadRequestException('Вы уже друзья');
      }
      if (existing.status === 'pending') {
        if (existing.senderId === userId) {
          throw new BadRequestException('Заявка уже отправлена');
        }
        // Mutual request — auto-accept
        const accepted = await this.acceptRequest(userId, existing.id);
        return { ...accepted, status: 'accepted' as const };
      }
    }

    const request = await this.prisma.friendship.create({
      data: { senderId: userId, receiverId: target.id },
      include: {
        sender: { include: { studentProfile: true, teacherProfile: true } },
        receiver: { include: { studentProfile: true, teacherProfile: true } },
      },
    });

    return {
      id: request.id,
      user: formatUserPublic(target),
      status: 'pending',
    };
  }

  async acceptRequest(userId: string, requestId: string) {
    const request = await this.prisma.friendship.findUnique({
      where: { id: requestId },
      include: {
        sender: { include: { studentProfile: true, teacherProfile: true } },
      },
    });

    if (!request || request.receiverId !== userId) {
      throw new NotFoundException('Заявка не найдена');
    }

    if (request.status !== 'pending') {
      throw new BadRequestException('Заявка уже обработана');
    }

    const updated = await this.prisma.friendship.update({
      where: { id: requestId },
      data: { status: 'accepted' },
    });

    return {
      id: updated.id,
      user: formatUserPublic(request.sender),
      status: 'accepted',
    };
  }

  async declineRequest(userId: string, requestId: string) {
    const request = await this.prisma.friendship.findUnique({ where: { id: requestId } });
    if (!request || request.receiverId !== userId) {
      throw new NotFoundException('Заявка не найдена');
    }

    await this.prisma.friendship.update({
      where: { id: requestId },
      data: { status: 'declined' },
    });

    return { success: true };
  }

  async removeFriend(userId: string, friendId: string) {
    const friendship = await this.prisma.friendship.findFirst({
      where: {
        status: 'accepted',
        OR: [
          { senderId: userId, receiverId: friendId },
          { senderId: friendId, receiverId: userId },
        ],
      },
    });

    if (!friendship) throw new NotFoundException('Друг не найден');

    await this.prisma.friendship.delete({ where: { id: friendship.id } });
    return { success: true };
  }

  private async formatWithRelation(
    user: {
      id: string;
      username: string | null;
      role: string;
      email: string;
      studentProfile?: { firstName: string; lastName: string; avatarUrl?: string | null } | null;
      teacherProfile?: { firstName: string; lastName: string; avatarUrl?: string | null } | null;
    },
    currentUserId: string,
  ) {
    const friendship = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { senderId: currentUserId, receiverId: user.id },
          { senderId: user.id, receiverId: currentUserId },
        ],
      },
    });

    let relation: 'none' | 'pending_sent' | 'pending_received' | 'friends' = 'none';
    if (friendship) {
      if (friendship.status === 'accepted') relation = 'friends';
      else if (friendship.status === 'pending') {
        relation = friendship.senderId === currentUserId ? 'pending_sent' : 'pending_received';
      }
    }

    return { ...formatUserPublic(user), relation, friendshipId: friendship?.id ?? null };
  }
}

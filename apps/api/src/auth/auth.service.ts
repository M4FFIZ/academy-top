import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload, getDisplayName } from '../common/utils';
import { LoginDto } from './dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: { studentProfile: true, teacherProfile: true },
    });

    if (!user || user.status === 'blocked') {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Неверный email или пароль');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = this.signToken(user.id, user.email, user.role);
    return {
      accessToken: token,
      user: this.formatUser(user),
    };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        studentProfile: true,
        teacherProfile: true,
        groupStudents: {
          where: { isActive: true },
          include: { group: true },
        },
      },
    });
    if (!user) throw new UnauthorizedException();
    return this.formatUser(user);
  }

  signToken(sub: string, email: string, role: string) {
    return this.jwt.sign({ sub, email, role } satisfies JwtPayload);
  }

  formatUser(user: {
    id: string;
    email: string;
    role: string;
    username?: string | null;
    studentProfile?: { firstName: string; lastName: string; middleName?: string | null; avatarUrl?: string | null; phone?: string | null; telegram?: string | null } | null;
    teacherProfile?: { firstName: string; lastName: string; middleName?: string | null; avatarUrl?: string | null; phone?: string | null; telegram?: string | null; acceptsPrivateChat?: boolean } | null;
    groupStudents?: { group: { id: string; name: string } }[];
  }) {
    const profile = user.studentProfile ?? user.teacherProfile;
    return {
      id: user.id,
      email: user.email,
      username: user.username ?? null,
      role: user.role,
      firstName: profile?.firstName ?? '',
      lastName: profile?.lastName ?? '',
      middleName: profile?.middleName ?? null,
      displayName: getDisplayName(user),
      avatarUrl: profile?.avatarUrl ?? null,
      phone: profile?.phone ?? null,
      telegram: profile?.telegram ?? null,
      acceptsPrivateChat: user.teacherProfile?.acceptsPrivateChat ?? null,
      group: user.groupStudents?.[0]?.group ?? null,
    };
  }
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'dev-secret',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { studentProfile: true, teacherProfile: true },
    });
    if (!user || user.status === 'blocked') throw new UnauthorizedException();
    return { id: user.id, email: user.email, role: user.role };
  }
}

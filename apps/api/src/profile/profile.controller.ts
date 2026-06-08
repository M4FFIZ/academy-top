import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards';
import { PrismaService } from '../prisma/prisma.service';
import { SetUsernameDto, UpdateProfileDto } from '../auth/dto';
import { isValidUsername, normalizeUsername } from '../common/utils';

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async getProfile(@Req() req: { user: { id: string; role: string } }) {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.id },
      include: { studentProfile: true, teacherProfile: true },
    });
    return {
      ...(user?.studentProfile ?? user?.teacherProfile),
      username: user?.username ?? null,
    };
  }

  @Patch()
  async updateProfile(
    @Req() req: { user: { id: string; role: string } },
    @Body() dto: UpdateProfileDto,
  ) {
    const data = {
      phone: dto.phone,
      telegram: dto.telegram,
      avatarUrl: dto.avatarUrl,
    };

    if (req.user.role === 'student') {
      return this.prisma.studentProfile.update({
        where: { userId: req.user.id },
        data,
      });
    }
    return this.prisma.teacherProfile.update({
      where: { userId: req.user.id },
      data,
    });
  }

  @Patch('username')
  async setUsername(@Req() req: { user: { id: string } }, @Body() dto: SetUsernameDto) {
    const username = normalizeUsername(dto.username);
    if (!isValidUsername(username)) {
      throw new BadRequestException('Username: 5–32 символа, латиница, цифры, _');
    }

    const existing = await this.prisma.user.findUnique({ where: { username } });
    if (existing && existing.id !== req.user.id) {
      throw new ConflictException(`@${username} уже занят`);
    }

    const user = await this.prisma.user.update({
      where: { id: req.user.id },
      data: { username },
    });

    return { username: user.username };
  }
}

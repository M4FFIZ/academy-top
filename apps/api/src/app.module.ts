import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { JwtAuthGuard } from './common/guards';
import { DashboardController } from './dashboard/dashboard.controller';
import { ProfileController } from './profile/profile.controller';
import { ScheduleController } from './schedule/schedule.controller';
import { GradesController } from './grades/grades.controller';
import { AdminController } from './admin/admin.controller';
import { GroupsController } from './groups/groups.controller';
import { NotificationsModule } from './notifications/notifications.module';
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [PrismaModule, AuthModule, ChatModule, NotificationsModule],
  controllers: [
    DashboardController,
    ProfileController,
    ScheduleController,
    GradesController,
    AdminController,
    GroupsController,
  ],
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}

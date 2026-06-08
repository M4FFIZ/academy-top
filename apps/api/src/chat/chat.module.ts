import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ChatController } from './chat.controller';
import { FriendsController } from './friends.controller';
import { ChatGateway } from './chat.gateway';
import { ChatService, FriendsService } from './chat.service';

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [ChatController, FriendsController],
  providers: [ChatGateway, ChatService, FriendsService],
  exports: [ChatGateway, FriendsService],
})
export class ChatModule {}

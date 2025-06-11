import { Controller } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { NotificationType } from '@app/common';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @MessagePattern({ cmd: 'getHello' })
  getHello(): string {
    return this.notificationsService.getHello();
  }

  @MessagePattern({ cmd: 'createNotification' })
  async create(
    @Payload('userId') userId: string,
    @Payload('message') message: string,
    @Payload('type') type: NotificationType[],
  ) {
    return await this.notificationsService.create(userId, message, type);
  }

  @MessagePattern({ cmd: 'getNotificationsByUser' })
  async findAllByUser(@Payload('userId') userId: string) {
    return await this.notificationsService.findAllByUser(userId);
  }
}

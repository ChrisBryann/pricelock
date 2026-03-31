import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { NotificationType } from '@app/common';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}
  getHello(): string {
    return 'Hello World!';
  }

  async create(userId: string, message: string, type: NotificationType[]) {
    const notification = await this.notificationRepository.create({
      user: {
        id: userId,
      },
      type,
      content: message,
    });
    // TO DO: for SMS and email types, send out notification in those platforms here
    await this.notificationRepository.save(notification);
    return notification;
  }

  async findAllByUser(userId: string): Promise<Notification[]> {
    return await this.notificationRepository
      .createQueryBuilder('notification')
      .leftJoin('notification.user', 'user')
      .addSelect('user.id')
      .where('user.id = :userId', { userId })
      .getMany();
  }
}

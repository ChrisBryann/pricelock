import { NotificationType } from '@app/common';
import { DefaultEntity } from '@app/common/database/default.entity';
import { User } from 'apps/users/src/entities/user.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class Notification extends DefaultEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  user: User;

  @Column({
    type: 'enum',
    array: true,
    enum: NotificationType,
  })
  type: NotificationType[];

  @Column({
    type: 'text',
  })
  content: string;

  // @Column({
  //   type: 'enum',
  //   enum: NotificationStatus,
  //   default: NotificationStatus.Pending,
  // })
  // status: NotificationStatus;
}

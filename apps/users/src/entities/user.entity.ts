import { UserRoles } from '@app/common';
import { DefaultEntity } from '@app/common/database/default.entity';
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
@Index(['phone', 'email', 'id'], { unique: true })
export class User extends DefaultEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    length: 50,
  })
  name: string;

  @Column({ unique: true, length: 20 })
  phone: string;

  @Column({ unique: true, length: 255 })
  email: string;

  @Column({
    nullable: true,
    length: 255,
  })
  password: string;

  @Column({
    type: 'enum',
    enum: UserRoles,
  })
  role: UserRoles;

  // @Column({
  //   default: false,
  // })
  // ktpVerified: boolean;

  @Column({
    default: false,
  })
  phoneVerified: boolean;

  @Column({
    default: false,
  })
  emailVerified: boolean;

  @Column({
    default: 0,
  })
  tokenVersion?: number;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  refreshToken?: string;

  // Stripe Connect Account ID to collect payments (buyer) or accepting payouts (seller)
  @Column({
    type: 'varchar',
    unique: true,
    nullable: true,
  })
  stripeConnectAccountId?: string;

  @Column({
    type: 'boolean',
    default: false,
  })
  stripeConnectAccountLinked?: boolean;
}

export type PublicUser = Omit<User, 'password'>;

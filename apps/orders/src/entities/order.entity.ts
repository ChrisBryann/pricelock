import { DefaultEntity } from '@app/common/database/default.entity';
import { OrderStatus } from '@app/common/enums/order-status.enum';
import { Commitment } from 'apps/commitments/src/entities/commitment.entity';
import { User } from 'apps/users/src/entities/user.entity';
import Decimal from 'decimal.js';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class Order extends DefaultEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne((type) => Commitment, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn()
  commitment: Commitment; // each order is tied to a commitment request

  @ManyToOne((type) => User, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn()
  buyer: User;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: {
      // PostgreSQL returns int as string, so turn it to a Decimal object
      to: (value: number | Decimal) =>
        typeof value === 'number' ? value : value.toString(),
      from: (value: string) => new Decimal(value),
    },
    nullable: false,
  })
  price: Decimal;

  @Column({
    type: 'timestamp',
    nullable: false,
  })
  lockedAt: Date;

  @Column({
    type: 'text',
    nullable: false,
  })
  shippingAddress: string;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.Pending,
  })
  status: OrderStatus;
}

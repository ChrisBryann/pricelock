import { PaymentStatus } from '@app/common';
import { DefaultEntity } from '@app/common/database/default.entity';
import { Order } from 'apps/orders/src/entities/order.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class Payment extends DefaultEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    unique: true,
    nullable: true,
  })
  stripeSessionId?: string; // Stripe session ID

  @ManyToOne(() => Order, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn()
  order?: Order;

  @Column({
    type: 'numeric',
    precision: 15,
    scale: 2,
    nullable: true,
  })
  amount?: number;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.Pending,
  })
  status: PaymentStatus;

  @Column({
    unique: true,
    nullable: true,
  })
  stripePaymentIntentId: string; // stripe's paymentIntent
}

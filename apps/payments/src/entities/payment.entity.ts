import { PaymentStatus } from '@app/common';
import { DefaultEntity } from '@app/common/database/default.entity';
import { Order } from 'apps/orders/src/entities/order.entity';
import Decimal from 'decimal.js';
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
    transformer: {
      // PostgreSQL returns int as string, so turn it to a Decimal object
      to: (value: number | Decimal | null | undefined) => {
        if (value === null || value === undefined) return null;
        return value instanceof Decimal ? value.toString() : value;
      },
      from: (value: string | null) => (value ? new Decimal(value) : null),
    },
    nullable: true,
  })
  amount?: Decimal;

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
  stripePaymentIntentId?: string; // stripe's paymentIntent

  @Column({
    nullable: false, // every Payment must have a Commitment related to it
  }) // HAS relationship 1-to=N
  commitmentId: string;
}

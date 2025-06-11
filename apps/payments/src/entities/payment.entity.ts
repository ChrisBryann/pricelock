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
  stripeEntryFeePaymentSessionId?: string; // Stripe session ID for final payment

  @Column({
    unique: true,
    nullable: true,
  })
  stripeFinalPaymentSessionId?: string; // Stripe session ID for final payment

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
  entryFeeAmount: Decimal;

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
  finalAmount?: Decimal;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
  })
  status: PaymentStatus;

  @Column({
    unique: true,
    nullable: true,
  })
  stripeEntryFeePaymentIntentId?: string; // stripe's paymentIntent for entry fee

  @Column({
    unique: true,
    nullable: true,
  })
  stripeFinalPaymentIntentId?: string; // stripe's paymentIntent for final payment

  @Column({
    nullable: false, // every Payment must have a Commitment related to it
  }) // HAS relationship 1-to=N
  commitmentId: string;
}

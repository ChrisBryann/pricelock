import { DefaultEntity } from '@app/common/database/default.entity';
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class TransactionalOutbox extends DefaultEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  // is it coming from commitments, listing, payments service?
  // Source service or domain context (e.g. 'commitment', 'payment')
  @Index()
  @Column({ length: 50 })
  channel: string;
  // what type of event needs process (order_create, commitment_delete, etc)
  // Event name (e.g. 'order.created', 'commitment.deleted')
  @Index()
  @Column({ length: 100 })
  eventType: string;

  @Column({ type: 'jsonb' })
  payload: Record<string, any>;

  // Whether this outbox event has been published to the message broker
  @Index()
  @Column({ default: false })
  processed: boolean;

  // Optional: Retry count or metadata for delivery attempts
  @Column({ default: 0 })
  retryCount: number;
}

import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Product } from '../products/entities/product.entity';
import { DefaultEntity } from '@app/common/database/default.entity';
import Decimal from 'decimal.js';

@Entity()
export class ProductListing extends DefaultEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Product, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn()
  product: Product;

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
  })
  proposedPrice: Decimal;

  @Column({
    type: 'int',
    nullable: false,
  })
  minThreshold: number; // minimum number of buyers required for sale

  @Column({
    type: 'timestamp',
    nullable: false,
  })
  deadline: Date; // end time for buyer commitments

  @Column({
    type: 'boolean',
    default: false,
  })
  locked: boolean; // indicates if threshold was met

  @Column({
    type: 'decimal',
    precision: 10,
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
  finalPrice?: Decimal;

  @Column({
    type: 'boolean',
    default: false,
  })
  expired: boolean; // indicates if listing has gone over deadline and minThreshold was not met
}

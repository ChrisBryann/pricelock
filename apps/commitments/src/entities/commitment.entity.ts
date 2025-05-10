import { DefaultEntity } from '@app/common/database/default.entity';
import { ProductListing } from 'apps/listings/src/entities/product-listing.entity';
import { User } from 'apps/users/src/entities/user.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class Commitment extends DefaultEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ProductListing, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn()
  listing: ProductListing;

  @ManyToOne(() => User, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn()
  buyer: User;

  @Column({
    type: 'int',
  })
  quantity: number;

  @Column({
    type: 'boolean',
    default: false,
  })
  expired: boolean; // indicates if this commitment has expired after the notification to buy the product has been sent
}

import { DefaultEntity } from '@app/common/database/default.entity';
import { ProductCondition } from '@app/common/enums/product-condition.enum';
import { User } from 'apps/users/src/entities/user.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class Product extends DefaultEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn()
  seller: User;

  @Column({
    length: 255,
    nullable: false,
  })
  title: string;

  @Column({
    type: 'text',
  })
  description?: string;

  @Column({
    length: 100,
  })
  category?: string;

  @Column({
    type: 'enum',
    enum: ProductCondition,
  })
  condition: ProductCondition;
}

import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@app/common/database/database.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { Commitment } from 'apps/commitments/src/entities/commitment.entity';
import { User } from 'apps/users/src/entities/user.entity';
import { ProductListing } from 'apps/listings/src/entities/product-listing.entity';
import { Product } from 'apps/listings/src/products/entities/product.entity';
import { TransactionalOutboxModule } from '@app/common';
import { OrdersOutboxProcessor } from './orders.outbox';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: './apps/orders/.env.development',
    }),
    DatabaseModule,
    TypeOrmModule.forFeature([
      Order,
      User,
      Commitment,
      ProductListing,
      Product,
    ]),
    ScheduleModule.forRoot(),
    TransactionalOutboxModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersOutboxProcessor],
  exports: [OrdersService],
})
export class OrdersModule {}

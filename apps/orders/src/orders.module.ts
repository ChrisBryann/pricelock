import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { BmqModule } from '@app/common/bullmq/bullmq.module';
import { ORDERS_BMQ } from '@app/common/bullmq/bullmq.constant';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@app/common/database/database.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { Commitment } from 'apps/commitments/src/entities/commitment.entity';
import { User } from 'apps/users/src/entities/user.entity';
import { ProductListing } from 'apps/listings/src/entities/product-listing.entity';
import { Product } from 'apps/listings/src/products/entities/product.entity';

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
    BmqModule.register([ORDERS_BMQ]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}

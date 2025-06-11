import { Module } from '@nestjs/common';
import { ListingsController } from './listings.controller';
import { ListingsService } from './listings.service';
import { ProductsModule } from './products/products.module';
import { DatabaseModule } from '@app/common/database/database.module';
import { ProductListing } from './entities/product-listing.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { BmqModule } from '@app/common/bullmq/bullmq.module';
import { LISTING_BMQ } from '@app/common/bullmq/bullmq.constant';
import { TransactionalOutboxModule } from '@app/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ListingsOutboxProcessor } from './listings.outbox';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: './apps/listings/.env.development',
    }),
    ProductsModule,
    DatabaseModule,
    BmqModule.register([LISTING_BMQ]),
    TypeOrmModule.forFeature([ProductListing]),
    ScheduleModule.forRoot(),
    TransactionalOutboxModule,
  ],
  controllers: [ListingsController],
  providers: [ListingsService, ListingsOutboxProcessor],
})
export class ListingsModule {}

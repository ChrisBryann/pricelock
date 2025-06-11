import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseModule } from '@app/common/database/database.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { Order } from 'apps/orders/src/entities/order.entity';
import { Commitment } from 'apps/commitments/src/entities/commitment.entity';
import { Product } from 'apps/listings/src/products/entities/product.entity';
import { ProductListing } from 'apps/listings/src/entities/product-listing.entity';
import { User } from 'apps/users/src/entities/user.entity';
import { PaymentsOutboxProcessor } from './payments.outbox';
import {
  COMMITMENTS_MICROSERVICE,
  TransactionalOutboxModule,
  USERS_MICROSERVICE,
} from '@app/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: './apps/payments/.env.development',
    }),
    DatabaseModule,
    TypeOrmModule.forFeature([
      Commitment,
      Order,
      Payment,
      ProductListing,
      Product,
      User,
    ]),
    ScheduleModule.forRoot(),
    TransactionalOutboxModule,
    ClientsModule.registerAsync([
      {
        name: COMMITMENTS_MICROSERVICE,
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.getOrThrow<string>('COMMITMENTS_HOST'),
            port: +configService.getOrThrow<string>('COMMITMENTS_PORT'),
          },
        }),
      },
      {
        name: USERS_MICROSERVICE,
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.getOrThrow<string>('USERS_HOST'),
            port: +configService.getOrThrow<string>('USERS_PORT'),
          },
        }),
      },
    ]),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentsOutboxProcessor],
})
export class PaymentsModule {}

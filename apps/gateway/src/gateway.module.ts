import { Module } from '@nestjs/common';
import { GatewayController } from './gateway.controller';
import { GatewayService } from './gateway.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './microservices/auth.controller';
import {
  AUTH_MICROSERVICE,
  COMMITMENTS_MICROSERVICE,
  LISTINGS_MICROSERVICE,
  NOTIFICATIONS_MICROSERVICE,
  ORDERS_MICROSERVICE,
  PAYMENTS_MICROSERVICE,
  USERS_MICROSERVICE,
} from '../../../libs/common/src/constants/gateway.constant';
import { AuthGatewayModule } from '@app/common/auth-gateway/auth-gateway.module';
import {
  CommitmentsController,
  ListingsController,
  OrdersController,
  ProductsController,
  UsersController,
  PaymentsController,
} from './microservices';
import { ListingsConsumer } from './consumers';
import { TransactionalOutboxModule } from '@app/common';
import { DatabaseModule } from '@app/common/database/database.module';
import { CommitmentsConsumer } from './consumers/commitments.consumer';
import { BmqModule } from '@app/common/bullmq/bullmq.module';
import { COMMITMENT_BMQ, LISTING_BMQ } from '@app/common';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: './apps/gateway/.env.development',
    }),
    ClientsModule.registerAsync([
      {
        name: AUTH_MICROSERVICE,
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.getOrThrow<string>('AUTH_HOST'),
            port: +configService.getOrThrow<string>('AUTH_PORT'),
          },
        }),
      },
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
        name: LISTINGS_MICROSERVICE,
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.getOrThrow<string>('LISTINGS_HOST'),
            port: +configService.getOrThrow<string>('LISTINGS_PORT'),
          },
        }),
      },
      {
        name: NOTIFICATIONS_MICROSERVICE,
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.getOrThrow<string>('NOTIFICATIONS_HOST'),
            port: +configService.getOrThrow<string>('NOTIFICATIONS_PORT'),
          },
        }),
      },
      {
        name: ORDERS_MICROSERVICE,
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.getOrThrow<string>('ORDERS_HOST'),
            port: +configService.getOrThrow<string>('ORDERS_PORT'),
          },
        }),
      },
      {
        name: PAYMENTS_MICROSERVICE,
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.getOrThrow<string>('PAYMENTS_HOST'),
            port: +configService.getOrThrow<string>('PAYMENTS_PORT'),
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
    AuthGatewayModule,
    DatabaseModule,
    TransactionalOutboxModule,
    BmqModule.register([LISTING_BMQ, COMMITMENT_BMQ]),
  ],
  controllers: [
    GatewayController,
    AuthController,
    UsersController,
    ProductsController,
    ListingsController,
    CommitmentsController,
    PaymentsController,
    OrdersController,
  ],
  providers: [GatewayService, ListingsConsumer, CommitmentsConsumer],
})
export class GatewayModule {}

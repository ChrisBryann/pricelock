import { Module } from '@nestjs/common';
import { CommitmentsController } from './commitments.controller';
import { CommitmentsService } from './commitments.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Commitment } from './entities/commitment.entity';
import { DatabaseModule } from '@app/common/database/database.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthGatewayModule } from '@app/common/auth-gateway/auth-gateway.module';
import {
  COMMITMENT_BMQ,
  LISTINGS_MICROSERVICE,
  TransactionalOutboxModule,
  USERS_MICROSERVICE,
} from '@app/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ProductListing } from 'apps/listings/src/entities/product-listing.entity';
import { Product } from 'apps/listings/src/products/entities/product.entity';
import { User } from 'apps/users/src/entities/user.entity';
import { ScheduleModule } from '@nestjs/schedule';
import { BmqModule } from '@app/common/bullmq/bullmq.module';
import { CommitmentsOutboxProcessor } from './commitments.outbox';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: './apps/commitments/.env.development',
    }),
    DatabaseModule,
    AuthGatewayModule,
    TypeOrmModule.forFeature([Commitment, ProductListing, Product, User]),
    TransactionalOutboxModule,
    ClientsModule.registerAsync([
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
    ScheduleModule.forRoot(),
    TransactionalOutboxModule,
    BmqModule.register([COMMITMENT_BMQ]),
  ],
  controllers: [CommitmentsController],
  providers: [CommitmentsService, CommitmentsOutboxProcessor],
  exports: [CommitmentsService],
})
export class CommitmentsModule {}

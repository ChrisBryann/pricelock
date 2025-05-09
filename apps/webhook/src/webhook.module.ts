import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { StripeWebhookController } from './stripe/stripe.webhook.controller';
import { StripeWebhookService } from './stripe/stripe.webhook.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import {
  PAYMENTS_MICROSERVICE,
  USERS_MICROSERVICE,
} from '@app/common/constants/gateway.constant';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: './apps/webhook/.env.development',
    }),
    ClientsModule.registerAsync([
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
  ],
  controllers: [WebhookController, StripeWebhookController],
  providers: [WebhookService, StripeWebhookService],
})
export class WebhookModule {}

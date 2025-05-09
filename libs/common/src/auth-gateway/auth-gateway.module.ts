import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { RmqModule } from '../rmq/rmq.module';
import { AUTH_RMQ } from '../constants/rmq-name.constant';
import * as cookieParser from 'cookie-parser';

@Module({
  imports: [
    RmqModule.register({
      name: AUTH_RMQ,
    }),
  ],
  exports: [RmqModule],
})
export class AuthGatewayModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(cookieParser()).forRoutes('*');
  }
}

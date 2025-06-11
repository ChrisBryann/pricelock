import { NestFactory } from '@nestjs/core';
import { AuthModule } from './auth.module';
import { ValidationPipe } from '@nestjs/common';
import { RmqService } from '@app/common/rmq/rmq.service';
import { AUTH_RMQ } from '@app/common/constants/rmq-name.constant';
import { TcpOptions, Transport } from '@nestjs/microservices';
import { HttpInterceptor } from '@app/common';

async function bootstrap() {
  const app = await NestFactory.create(AuthModule);
  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalInterceptors(new HttpInterceptor());
  const rmqService = app.get<RmqService>(RmqService);
  app.connectMicroservice(rmqService.getOptions(AUTH_RMQ, true));
  app.connectMicroservice<TcpOptions>(
    {
      transport: Transport.TCP,
      options: {
        host: 'auth',
        port: 3001,
      },
    },
    { inheritAppConfig: true }, // allows Global Pipes, Filters, and Interceptors in hybrid application (microservices with Rpc)
  );
  await app.startAllMicroservices();
  // await app.listen(process.env.port ?? 3000);
}
bootstrap();

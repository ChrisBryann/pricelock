import { NestFactory } from '@nestjs/core';
import { UsersModule } from './users.module';
import { TcpOptions, Transport } from '@nestjs/microservices';
import { HttpInterceptor } from '@app/common';

async function bootstrap() {
  const app = await NestFactory.create(UsersModule);
  app.useGlobalInterceptors(new HttpInterceptor());
  app.connectMicroservice<TcpOptions>(
    {
      transport: Transport.TCP,
      options: {
        host: 'users',
        port: 3002,
      },
    },
    { inheritAppConfig: true },
  );
  await app.startAllMicroservices();
  // await app.listen(process.env.port ?? 3000);
}
bootstrap();

import { NestFactory } from '@nestjs/core';
import { OrdersModule } from './orders.module';
import { HttpInterceptor } from '@app/common';
import { TcpOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(OrdersModule);
  app.useGlobalInterceptors(new HttpInterceptor());
  app.connectMicroservice<TcpOptions>(
    {
      transport: Transport.TCP,
      options: {
        host: 'orders',
        port: 3000,
      },
    },
    {
      inheritAppConfig: true, // allows Global Pipes, Filters, and Interceptors in hybrid application (microservices with Rpc)
    },
  );
  await app.startAllMicroservices();
  await app.listen(process.env.port ?? 3001);
}
bootstrap();

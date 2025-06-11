import { NestFactory } from '@nestjs/core';
import { ListingsModule } from './listings.module';
import { TcpOptions, Transport } from '@nestjs/microservices';
import { HttpInterceptor } from '@app/common';

async function bootstrap() {
  const app = await NestFactory.create(ListingsModule);
  app.useGlobalInterceptors(new HttpInterceptor());
  app.connectMicroservice<TcpOptions>(
    {
      transport: Transport.TCP,
      options: {
        host: 'listings',
        port: 3001,
      },
    },
    {
      inheritAppConfig: true, // allows Global Pipes, Filters, and Interceptors in hybrid application (microservices with Rpc)
    },
  );
  await app.startAllMicroservices();
  await app.listen(process.env.port ?? 3000);
}
bootstrap();

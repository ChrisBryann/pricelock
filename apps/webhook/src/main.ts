import { NestFactory } from '@nestjs/core';
import { WebhookModule } from './webhook.module';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(WebhookModule);
  app.use('/webhook/stripe', bodyParser.raw({ type: '*/*' }));
  app.listen(process.env.PORT ?? 3000);
}
bootstrap();

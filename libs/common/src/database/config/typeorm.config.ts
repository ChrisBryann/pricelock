import { ConfigService } from '@nestjs/config';
import { Commitment } from 'apps/commitments/src/entities/commitment.entity';
import { ProductListing } from 'apps/listings/src/entities/product-listing.entity';
import { Product } from 'apps/listings/src/products/entities/product.entity';
import { Notification } from 'apps/notifications/src/entities/notification.entity';
import { Order } from 'apps/orders/src/entities/order.entity';
import { Payment } from 'apps/payments/src/entities/payment.entity';
import { User } from 'apps/users/src/entities/user.entity';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';

config({
  path: './.env.db',
});

const configService = new ConfigService();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: configService.getOrThrow<string>('POSTGRES_HOST'),
  port: parseInt(configService.getOrThrow<string>('POSTGRES_PORT'), 5432),
  username: configService.getOrThrow<string>('POSTGRES_USER'),
  password: configService.getOrThrow<string>('POSTGRES_PASSWORD'),
  database: configService.getOrThrow<string>('POSTGRES_DB'),
  synchronize: false,
  entities:
    configService.getOrThrow('NODE_ENV') === 'production'
      ? ['dist/entities/**/*.js']
      : [
          User,
          Product,
          ProductListing,
          Payment,
          Order,
          Commitment,
          Notification,
        ],
  migrations:
    configService.getOrThrow('NODE_ENV') === 'production'
      ? ['dist/migrations/**/*.js']
      : ['database/migrations/**/*.ts'],
  migrationsRun: false,
  logging: true,
});

export default AppDataSource;

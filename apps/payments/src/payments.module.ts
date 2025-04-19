import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { OrdersModule } from 'apps/orders/src/orders.module';
import { CommitmentsService } from 'apps/commitments/src/commitments.service';
import { CommitmentsModule } from 'apps/commitments/src/commitments.module';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@app/common/database/database.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: './apps/payments/.env.development',
    }),
    DatabaseModule,
    OrdersModule,
    CommitmentsModule,
    TypeOrmModule.forFeature([Payment]),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}

import { Module } from '@nestjs/common';
import { CommitmentsController } from './commitments.controller';
import { CommitmentsService } from './commitments.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Commitment } from './entities/commitment.entity';
import { Product } from 'apps/listings/src/products/entities/product.entity';
import { User } from 'apps/users/src/entities/user.entity';
import { ProductListing } from 'apps/listings/src/entities/product-listing.entity';
import { DatabaseModule } from '@app/common/database/database.module';
import { ConfigModule } from '@nestjs/config';
import { AuthGatewayModule } from '@app/common/auth-gateway/auth-gateway.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: './apps/commitments/.env.development',
    }),
    DatabaseModule,
    AuthGatewayModule,
    TypeOrmModule.forFeature([Commitment, ProductListing, Product, User]),
  ],
  controllers: [CommitmentsController],
  providers: [CommitmentsService],
  exports: [CommitmentsService],
})
export class CommitmentsModule {}

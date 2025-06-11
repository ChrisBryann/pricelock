import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@app/common/database/database.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { CryptoModule } from '@app/common/crypto/crypto.module';
import { AuthGatewayModule } from '@app/common/auth-gateway/auth-gateway.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: './apps/users/.env.development',
    }),
    DatabaseModule,
    TypeOrmModule.forFeature([User]),
    CryptoModule,
    AuthGatewayModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionalOutbox } from './entities/transactional-outbox.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TransactionalOutbox])],
  exports: [TypeOrmModule],
})
export class TransactionalOutboxModule {}

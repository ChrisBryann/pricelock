import { Logger } from '@nestjs/common';
import { TransactionalOutbox } from './entities/transactional-outbox.entity';
import { Repository } from 'typeorm';

export abstract class DefaultOutboxProcessor {
  protected readonly logger: Logger;

  constructor(
    protected readonly channel: string,
    private readonly retries: number,
    private readonly repository: Repository<TransactionalOutbox>,
  ) {
    this.logger = new Logger(new.target.name);
  }
  async getEvents(): Promise<TransactionalOutbox[]> {
    return await this.repository.manager.transaction(async (manager) => {
      return await manager
        .getRepository(TransactionalOutbox)
        .createQueryBuilder('transactionalOutbox')
        .where('transactionalOutbox.channel = :channel', {
          channel: this.channel,
        })
        .andWhere('transactionalOutbox.processed = :processed', {
          processed: false,
        })
        .andWhere('transactionalOutbox.retryCount < :retries', {
          retries: this.retries,
        })
        .orderBy('transactionalOutbox.createdAt', 'DESC')
        .setLock('pessimistic_read')
        .getMany();
    });
  }

  abstract process();
}

import {
  COMMITMENT_BMQ,
  ORDERS_OUTBOX_CHANNEL,
  TransactionalOutbox,
} from '@app/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { Repository } from 'typeorm';

@Processor(COMMITMENT_BMQ)
export class CommitmentsConsumer extends WorkerHost {
  private readonly logger: Logger = new Logger(CommitmentsConsumer.name);
  constructor(
    @InjectRepository(TransactionalOutbox)
    private readonly transactionalOutboxRepository: Repository<TransactionalOutbox>,
  ) {
    super();
  }

  async process(job: Job, token?: string): Promise<any> {
    void token;

    switch (job.name) {
      case 'closeCommitment': {
        const { id: commitmentId } = job.data;

        await this.transactionalOutboxRepository.manager.transaction(
          async (manager) => {
            await manager.getRepository(TransactionalOutbox).save(
              manager.getRepository(TransactionalOutbox).create({
                channel: ORDERS_OUTBOX_CHANNEL,
                eventType: 'closeCommitment',
                payload: {
                  commitmentId,
                },
              }),
            );
          },
        );

        break;
      }
      default:
        break;
    }
  }

  @OnWorkerEvent('active')
  onActive(job: Job) {
    this.logger.log(
      `Processing job ${job.id} of type ${job.name} with data ${JSON.stringify(job.data)}...`,
    );
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(
      `Completed job ${job.id} of type ${job.name} with data ${JSON.stringify(job.data)}...`,
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: any) {
    this.logger.log(
      `Job ${job.id} of type ${job.name} with data ${JSON.stringify(job.data)} has failed.\nError details: ${error}`,
    );
  }

  @OnWorkerEvent('error')
  onError(failedReason: any) {
    this.logger.log(
      `Error occured while running job: ${JSON.stringify(failedReason)}.`,
    );
  }
}

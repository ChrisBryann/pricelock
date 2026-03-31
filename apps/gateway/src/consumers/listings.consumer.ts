import { LISTING_BMQ } from '@app/common/bullmq/bullmq.constant';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { COMMITMENTS_OUTBOX_CHANNEL, TransactionalOutbox } from '@app/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Processor(LISTING_BMQ)
export class ListingsConsumer extends WorkerHost {
  private readonly logger: Logger = new Logger(ListingsConsumer.name);
  constructor(
    @InjectRepository(TransactionalOutbox)
    private readonly transactionalOutboxRepository: Repository<TransactionalOutbox>,
  ) {
    super();
  }

  async process(job: Job, token?: string): Promise<any> {
    void token;
    switch (job.name) {
      case 'closeListing': {
        // find out if this listing totalCommitment >= minThreshold

        // NEW: if true, do following:
        // 1. set finalPrice of the ProductListing to be a discounted price based on inverse exponential decay algorithm
        // 2. send out a notify job event to notify users to buy product within 24 hours
        // NEW: else, mark this listing as expired

        const { id: listingId, sellerId } = job.data;

        await this.transactionalOutboxRepository.manager.transaction(
          async (manager) => {
            await manager.getRepository(TransactionalOutbox).save(
              manager.getRepository(TransactionalOutbox).create({
                channel: COMMITMENTS_OUTBOX_CHANNEL,
                eventType: 'getAggregatedDataByListingId',
                payload: {
                  userId: sellerId,
                  listingId,
                },
              }),
            );
          },
        );

        //   // in frontend, user will see this notification, and frontend code will request user to complete order which will call our payments microservice to complete purchase and create order
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

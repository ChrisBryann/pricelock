import { LISTING_BMQ } from '@app/common/bullmq/bullmq.constant';
import {
  InjectQueue,
  OnWorkerEvent,
  Processor,
  WorkerHost,
} from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { Inject, Logger } from '@nestjs/common';
import {
  COMMITMENTS_MICROSERVICE,
  LISTINGS_MICROSERVICE,
  NOTIFICATIONS_MICROSERVICE,
  ORDERS_MICROSERVICE,
} from '../gateway.constant';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { Commitment } from 'apps/commitments/src/entities/commitment.entity';
import { NotificationType } from '@app/common';

@Processor(LISTING_BMQ)
export class ListingsConsumer extends WorkerHost {
  private readonly logger: Logger = new Logger(ListingsConsumer.name);
  constructor(
    @Inject(LISTINGS_MICROSERVICE)
    private readonly listingsMicroservice: ClientProxy,
    @Inject(COMMITMENTS_MICROSERVICE)
    private readonly commitmentsMicroservice: ClientProxy,
    @Inject(ORDERS_MICROSERVICE)
    private readonly ordersMicroservice: ClientProxy,
    @Inject(NOTIFICATIONS_MICROSERVICE)
    private readonly notificationsMicroservice: ClientProxy,
    @InjectQueue(LISTING_BMQ) private readonly listingQueue: Queue,
  ) {
    super();
  }

  async process(job: Job, token?: string): Promise<any> {
    switch (job.name) {
      case 'closeListing':
        // find out if this listing totalCommitment >= minThreshold

        // NEW: if true, do following:
        // 1. set finalPrice of the ProductListing to be a discounted price
        // 2. send out a notify job event to notify users to buy product within 24 hours
        // NEW: else, mark this listing as expired

        const { id: listingId, sellerId } = job.data;
        // find out if this listing totalCommitment >= minThreshold
        const aggregatedCommitmentData = await firstValueFrom(
          this.commitmentsMicroservice.send(
            { cmd: 'getAggregatedDataByListingId' },
            {
              userId: sellerId,
              listingId,
            },
          ),
        );

        if (
          aggregatedCommitmentData.totalCommitments >=
          aggregatedCommitmentData.minThreshold
        ) {
          // now lock the product listing as it has met minimum threshold
          await firstValueFrom(
            this.listingsMicroservice.send(
              { cmd: 'lockListing' },
              {
                id: listingId,
              },
            ),
            {
              defaultValue: null,
            },
          );
          // 1. set finalPrice of the ProductListing to be a discounted price
          await firstValueFrom(
            this.listingsMicroservice.send(
              { cmd: 'setListingFinalPrice' },
              {
                id: listingId,
                totalCommitments: aggregatedCommitmentData.totalCommitments,
                minThreshold: aggregatedCommitmentData.minThreshold,
              },
            ),
            {
              defaultValue: null,
            },
          );
          const commitments: Commitment[] = await firstValueFrom(
            this.commitmentsMicroservice.send(
              {
                cmd: 'findAllByListingId',
              },
              {
                userId: sellerId,
                listingId,
              },
            ),
          );

          // 2. send out a notify job event to notify users to buy product within 24 hours

          await Promise.all(
            commitments.map(async (commitment) => {
              return await firstValueFrom(
                this.notificationsMicroservice.send(
                  { cmd: 'createNotification' },
                  {
                    userId: commitment.buyer.id,
                    type: [
                      NotificationType.SMS,
                      NotificationType.InApp,
                    ] as NotificationType[],
                    message:
                      "Commitment locked!\nProduct listing of commitment is available to be pruchased at a lower price for a limited time!\nHead over to our app to purchase the deal. Hurry! You don't want to miss out on this!",
                  },
                ),
              ).then(async (result) => {
                // send a job event to expire commitment in 24 hours
                this.logger.log(
                  `commitment ${commitment.id} has been notified`,
                );
                await this.listingQueue.add(
                  'closeCommitment',
                  {
                    id: commitment.id,
                  },
                  {
                    delay: 24 * 60 * 60 * 1000, // in ms
                    jobId: `closeCommitment_${commitment.id}`,
                    removeOnComplete: true,
                    removeOnFail: false,
                  },
                );
                return result;
              });
            }),
          );

          // in frontend, user will see this notification, and frontend code will request user to complete order which will call our payments microservice to complete purchase and create order
        } else {
          // mark this listing as expired
          await firstValueFrom(
            this.listingsMicroservice.send(
              { cmd: 'closeExpiredListing' },
              {
                id: listingId,
              },
            ),
            {
              defaultValue: null,
            },
          );
        }

        return {};

      case 'closeCommitment':
        const { id: commitmentId } = job.data;
        await this.commitmentsMicroservice.send(
          { cmd: 'closeExpiredCommitment' },
          {
            id: commitmentId,
          },
        );

        return {};

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

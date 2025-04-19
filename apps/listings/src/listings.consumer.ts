import { LISTING_BMQ } from '@app/common/bullmq/bullmq.constant';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { ListingsService } from './listings.service';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { CommitmentsService } from 'apps/commitments/src/commitments.service';
import { NotificationsService } from 'apps/notifications/src/notifications.service';

@Processor(LISTING_BMQ)
export class ListingConsumer extends WorkerHost {
  private readonly logger: Logger = new Logger(ListingConsumer.name);
  constructor(
    private readonly listingsService: ListingsService,
    private readonly commitmentsService: CommitmentsService,
    private readonly notificationsService: NotificationsService,
  ) {
    super();
  }

  async process(job: Job, token?: string): Promise<any> {
    switch (job.name) {
      case 'closeListing': {
        // find out if this listing totalCommitment >= minThreshold
        // DEPRECATED: if true, send out an order job event for creating the order (order bulk)
        // DEPRECATED: else,  mark this listing as expired

        // NEW: if true, do following:
        // 1. set finalPrice of the ProductListing to be a discounted price
        // 2. send out a notify job event to notify users to buy product within 24 hours
        // NEW: else, mark this listing as expired

        const { id: listingId, sellerId } = job.data;
        // find out if this listing totalCommitment >= minThreshold
        const aggregatedCommitmentData =
          await this.commitmentsService.getAggregatedDataByListingId(
            sellerId,
            listingId,
          );
        if (
          aggregatedCommitmentData.totalCommitments >=
          aggregatedCommitmentData.minThreshold
        ) {
          // 1. set finalPrice of the ProductListing to be a discounted price
          await this.listingsService.setListingFinalPrice(
            listingId,
            aggregatedCommitmentData.totalCommitments,
            aggregatedCommitmentData.minThreshold,
          );
          // 2. send out a notify job event to notify users to buy product within 24 hours
          
        } else {
          // mark this listing as expired
          await this.listingsService.closeExpiredListing(listingId);
        }

        return {};
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
      `Job ${job.id} of type ${job.name} with data ${JSON.stringify(job.data)} has failed.\nError details: ${JSON.stringify(error)}`,
    );
  }

  @OnWorkerEvent('error')
  onError(failedReason: any) {
    this.logger.log(
      `Error occured while running job: ${JSON.stringify(failedReason)}.`,
    );
  }
}

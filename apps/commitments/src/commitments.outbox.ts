import {
  COMMITMENT_BMQ,
  COMMITMENTS_OUTBOX_CHANNEL,
  DefaultOutboxProcessor,
  LISTINGS_OUTBOX_CHANNEL,
  NOTIFICATIONS_OUTBOX_CHANNEL,
  TransactionalOutbox,
} from '@app/common';
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Commitment } from './entities/commitment.entity';
import { CommitmentsService } from './commitments.service';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';

@Injectable()
export class CommitmentsOutboxProcessor extends DefaultOutboxProcessor {
  constructor(
    @InjectRepository(TransactionalOutbox)
    private readonly transactionalOutboxRepository: Repository<TransactionalOutbox>,
    private readonly commitmentsService: CommitmentsService,
    @InjectQueue(COMMITMENT_BMQ) private readonly commitmentsQueue: Queue,
  ) {
    super(COMMITMENTS_OUTBOX_CHANNEL, 10, transactionalOutboxRepository);
  }

  @Cron(CronExpression.EVERY_5_SECONDS)
  async process() {
    const pendingEvents = await this.getEvents();

    for (const event of pendingEvents) {
      try {
        switch (event.eventType) {
          case 'getAgregatedDataByListingId': {
            const payload = event.payload as {
              userId: string;
              listingId: string;
            };
            await this.transactionalOutboxRepository.manager.transaction(
              async (manager) => {
                const aggregatedCommitmentData =
                  await this.commitmentsService.getAggregatedDataByListingId(
                    payload.userId,
                    payload.listingId,
                    manager,
                  );

                if (
                  aggregatedCommitmentData.totalCommitments >=
                  aggregatedCommitmentData.minThreshold
                ) {
                  // now lock the product listing as it has met minimum threshold
                  await manager.getRepository(TransactionalOutbox).save(
                    manager.getRepository(TransactionalOutbox).create({
                      channel: LISTINGS_OUTBOX_CHANNEL,
                      eventType: 'lockListing',
                      payload: {
                        id: payload.listingId,
                        userId: payload.userId,
                        totalCommitments:
                          aggregatedCommitmentData.totalCommitments,
                        minThreshold: aggregatedCommitmentData.minThreshold,
                      },
                    }),
                  );
                } else {
                  // mark this listing as expired
                  await manager.getRepository(TransactionalOutbox).save(
                    manager.getRepository(TransactionalOutbox).create({
                      channel: LISTINGS_OUTBOX_CHANNEL,
                      eventType: 'closeExpiredListing',
                      payload: {
                        id: payload.listingId,
                        userId: payload.userId,
                      },
                    }),
                  );
                }

                event.processed = true;
                await manager.getRepository(TransactionalOutbox).save(event);
              },
            );
            break;
          }

          case 'createCommitmentNotification': {
            const payload = event.payload as {
              userId: string;
              listingId: string;
            };
            await this.transactionalOutboxRepository.manager.transaction(
              async (manager) => {
                const commitments: Commitment[] =
                  await this.commitmentsService.findAllByListingId(
                    payload.userId,
                    payload.listingId,
                    manager,
                    true,
                  );

                for (const commitment of commitments) {
                  await manager.getRepository(TransactionalOutbox).save(
                    manager.getRepository(TransactionalOutbox).create({
                      channel: NOTIFICATIONS_OUTBOX_CHANNEL,
                      eventType: 'createCommitmentNotification',
                      payload: {
                        userId: commitment.buyer.id,
                        message:
                          "Commitment locked!\nProduct listing of commitment is available to be pruchased at a lower price for a limited time!\nHead over to our app to purchase the deal. Hurry! You don't want to miss out on this!",
                      },
                    }),
                  );
                  // then, expire commitment in 24 hours (using commitmentsQueue)

                  await this.commitmentsQueue.add(
                    'closeCommitment',
                    {
                      id: commitment.id,
                    },
                    {
                      delay: 24 * 60 * 60 * 1000, // for a day, in ms
                      jobId: `closeCommitment_${commitment.id}`,
                      removeOnComplete: true,
                      removeOnFail: false,
                    },
                  );
                }
                event.processed = true;
                await manager.getRepository(TransactionalOutbox).save(event);
              },
            );
          }

          case 'closeExpiredCommitment': {
            const payload = event.payload as {
              id: string;
            };
            // close expired commitment when:
            // 1. the listing locked (met min threshold) and notifications have been sent out to the user of the commitment
            // 2. listing expired
            await this.transactionalOutboxRepository.manager.transaction(
              async (manager) => {
                await manager.getRepository(Commitment).update(payload, {
                  expired: true,
                });
                event.processed = true;
                await manager.getRepository(TransactionalOutbox).save(event);
              },
            );
          }

          default:
            break;
        }
      } catch (error) {
        event.retryCount++;
        await this.transactionalOutboxRepository.save(event);
        this.logger.error(
          `${event.eventType} - Failed processing ${this.channel} event with error: ${error.message}`,
        );
      }
    }
  }
}

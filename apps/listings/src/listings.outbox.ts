import {
  calculateFinalPrice,
  COMMITMENTS_OUTBOX_CHANNEL,
  DefaultOutboxProcessor,
  LISTINGS_OUTBOX_CHANNEL,
  TransactionalOutbox,
} from '@app/common';
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductListing } from './entities/product-listing.entity';

@Injectable()
export class ListingsOutboxProcessor extends DefaultOutboxProcessor {
  constructor(
    @InjectRepository(TransactionalOutbox)
    private readonly transactionalOutboxRepository: Repository<TransactionalOutbox>,
  ) {
    super(LISTINGS_OUTBOX_CHANNEL, 10, transactionalOutboxRepository);
  }

  @Cron(CronExpression.EVERY_5_SECONDS)
  async process() {
    const pendingEvents = await this.getEvents();

    for (const event of pendingEvents) {
      try {
        switch (event.eventType) {
          case 'lockListing': {
            const payload = event.payload as {
              id: string;
              userId: string;
              totalCommitments: number;
              minThreshold: number;
            };
            await this.transactionalOutboxRepository.manager.transaction(
              async (manager) => {
                const listing = await manager
                  .getRepository(ProductListing)
                  .createQueryBuilder('product_listing')
                  .setLock('pessimistic_write')
                  .select(['product_listing.id', 'product_listing.locked']) // Only select what you need
                  .where('product_listing.id = :id', { id: payload.id })
                  .getOne();

                if (!listing) {
                  throw new Error('Product listing not found');
                }

                listing.locked = true;
                await manager.getRepository(ProductListing).save(listing);

                // then, set discount and finalPrice of the ProductListing to be a discounted price
                await manager.getRepository(TransactionalOutbox).save(
                  manager.getRepository(TransactionalOutbox).create({
                    channel: LISTINGS_OUTBOX_CHANNEL,
                    eventType: 'setListingFinalPrice',
                    payload,
                  }),
                );
                event.processed = true;
                await manager.getRepository(TransactionalOutbox).save(event);
              },
            );
            break;
          }

          case 'setListingFinalPrice': {
            const payload = event.payload as {
              id: string;
              userId: string;
              totalCommitments: number;
              minThreshold: number;
            };
            await this.transactionalOutboxRepository.manager.transaction(
              async (manager) => {
                // check if product listing exist and set a lock
                const listing = await manager
                  .getRepository(ProductListing)
                  .createQueryBuilder('product_listing')
                  .setLock('pessimistic_write')
                  .select([
                    'product_listing.id',
                    'product_listing.proposedPrice',
                    'product_listing.finalPrice',
                    'product_listing.discount',
                  ]) // Only select what you need
                  .where('product_listing.id = :id', { id: payload.id })
                  .getOne();

                if (!listing) {
                  throw new Error('Product listing not found');
                }

                // set final price (using inverse exponential decay algorithm)
                listing.finalPrice = calculateFinalPrice(
                  listing.proposedPrice,
                  listing.discount,
                  payload.totalCommitments,
                  payload.minThreshold,
                );

                await manager.getRepository(ProductListing).save(listing);

                await manager.getRepository(TransactionalOutbox).save(
                  manager.getRepository(TransactionalOutbox).create({
                    channel: COMMITMENTS_OUTBOX_CHANNEL,
                    eventType: 'createCommitmentNotification',
                    payload: {
                      listingId: payload.id,
                      userId: payload.userId,
                    },
                  }),
                );

                event.processed = true;
                await manager.getRepository(TransactionalOutbox).save(event);
              },
            );
            break;
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

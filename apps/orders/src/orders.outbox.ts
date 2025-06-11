import {
  COMMITMENTS_OUTBOX_CHANNEL,
  DefaultOutboxProcessor,
  formatStripeAddress,
  ORDERS_OUTBOX_CHANNEL,
  PAYMENTS_OUTBOX_CHANNEL,
  TransactionalOutbox,
} from '@app/common';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Order } from './entities/order.entity';
import Stripe from 'stripe';
import { OrderStatus } from '@app/common/enums/order-status.enum';
import { OrdersService } from './orders.service';

@Injectable()
export class OrdersOutboxProcessor extends DefaultOutboxProcessor {
  constructor(
    @InjectRepository(TransactionalOutbox)
    private readonly transactionalOutboxRepository: Repository<TransactionalOutbox>,
    private readonly ordersService: OrdersService,
  ) {
    super(ORDERS_OUTBOX_CHANNEL, 10, transactionalOutboxRepository);
  }

  @Cron(CronExpression.EVERY_5_SECONDS) // at every 10 seconds
  async process() {
    const pendingEvents = await this.getEvents();

    for (const event of pendingEvents) {
      try {
        switch (event.eventType) {
          case 'finalPaymentCheckoutSessionSuccess': {
            const payload = event.payload as {
              shipping_address: Stripe.Address;
              amount_total: number;
              commitmentId: string;
              buyerId: string;
              sessionId: string;
              paymentIntentId: string;
            };

            await this.transactionalOutboxRepository.manager.transaction(
              async (manager) => {
                const orderResult = await manager
                  .getRepository(Order)
                  .createQueryBuilder('order')
                  .leftJoin('order.commitment', 'commitment')
                  .addSelect('commitment.id')
                  .where('commitment.id = :id', {
                    id: payload.commitmentId,
                  })
                  .setLock('pessimistic_write')
                  .getOne();
                if (orderResult) {
                  this.logger.error(
                    `${event.eventType} - Order with the given commitment ID already exist!`,
                  );
                  throw new InternalServerErrorException(
                    `Order with the given commitment ID already exist!`,
                  );
                }

                const order = await manager.getRepository(Order).save(
                  manager.getRepository(Order).create({
                    commitment: { id: payload.commitmentId },
                    buyer: { id: payload.buyerId },
                    lockedAt: new Date().toISOString(),
                    price: payload.amount_total,
                    shippingAddress: formatStripeAddress(
                      payload.shipping_address,
                    ),
                    status: OrderStatus.Confirmed,
                  }),
                );
                // create new outbox row for payment success
                await manager.getRepository(TransactionalOutbox).save(
                  manager.getRepository(TransactionalOutbox).create({
                    channel: PAYMENTS_OUTBOX_CHANNEL,
                    eventType: 'finalPaymentCheckoutSessionSuccess',
                    payload: {
                      sessionId: payload.sessionId,
                      paymentIntentId: payload.paymentIntentId,
                      orderId: order.id,
                      commitmentId: payload.commitmentId,
                      buyerId: payload.buyerId,
                    },
                  }),
                );

                // update current event's processed to true in outbox table
                event.processed = true;
                await manager.getRepository(TransactionalOutbox).save(event);
              },
            );
          }

          case 'closeCommitment': {
            const payload = event.payload as {
              commitmentId: string;
            };
            await this.transactionalOutboxRepository.manager.transaction(
              async (manager) => {
                // 1. close the commitment as expired if there exist no order for this commitment
                const order: Order =
                  await this.ordersService.findOneByCommitmentId(
                    payload.commitmentId,
                    manager,
                    true,
                  );
                if (!order) {
                  // if NO order exists, then we need to close the commitment as expired
                  await manager.getRepository(TransactionalOutbox).save(
                    manager.getRepository(TransactionalOutbox).create({
                      channel: COMMITMENTS_OUTBOX_CHANNEL,
                      eventType: 'closeExpiredCommitment',
                      payload: {
                        id: payload.commitmentId,
                      },
                    }),
                  );
                }
                // update current event's processed to true in outbox table
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

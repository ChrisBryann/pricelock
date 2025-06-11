import {
  DefaultOutboxProcessor,
  PAYMENTS_OUTBOX_CHANNEL,
  PaymentStatus,
  TransactionalOutbox,
} from '@app/common';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class PaymentsOutboxProcessor extends DefaultOutboxProcessor {
  constructor(
    @InjectRepository(TransactionalOutbox)
    private readonly transactionalOutboxRepository: Repository<TransactionalOutbox>,
  ) {
    super(PAYMENTS_OUTBOX_CHANNEL, 10, transactionalOutboxRepository);
  }

  @Cron(CronExpression.EVERY_5_SECONDS) // at every 5 seconds
  async process() {
    this.logger.log('processing payment outbox...');
    const pendingEvents = await this.getEvents();

    for (const event of pendingEvents) {
      try {
        switch (event.eventType) {
          case 'createEntryFeeCheckoutSession': {
            const payload = event.payload as DeepPartial<Payment>;
            await this.transactionalOutboxRepository.manager.transaction(
              async (manager) => {
                await manager.getRepository(Payment).save(
                  manager.getRepository(Payment).create({
                    ...payload,
                    status: PaymentStatus.Pending,
                  }),
                );
                event.processed = true;
                await manager.getRepository(TransactionalOutbox).save(event);
              },
            );
            break;
          }

          case 'entryFeeCheckoutSessionSuccess': {
            const payload = event.payload as {
              sessionId: string;
              paymentIntentId: string;
            };
            await this.transactionalOutboxRepository.manager.transaction(
              async (manager) => {
                const payment = await manager
                  .getRepository(Payment)
                  .createQueryBuilder('payment')
                  .where(
                    'payment.stripeEntryFeePaymentSessionId = :sessionId',
                    {
                      sessionId: payload.sessionId,
                    },
                  )
                  .setLock('pessimistic_write')
                  .getOne();

                if (!payment) {
                  this.logger.error(
                    `${event.eventType} - Payment with given entryFee session ID does not exist!`,
                  );
                  throw new InternalServerErrorException(
                    `Payment with given entryFee session ID does not exist!`,
                  );
                }

                payment.stripeEntryFeePaymentIntentId = payload.paymentIntentId;
                payment.status = PaymentStatus.EntryPaid;
                await manager.getRepository(Payment).save(payment);

                event.processed = true;
                await manager.getRepository(TransactionalOutbox).save(event);
              },
            );
            break;
          }
          case 'finalPaymentCheckoutSessionSuccess': {
            const payload = event.payload as {
              sessionId: string;
              paymentIntentId: string;
              orderId: string;
              commitmentId: string;
              buyerId: string;
            };

            await this.transactionalOutboxRepository.manager.transaction(
              async (manager) => {
                const payment = await manager
                  .getRepository(Payment)
                  .createQueryBuilder('payment')
                  .where('payment.stripeFinalPaymentSessionId = :sessionId', {
                    sessionId: payload.sessionId,
                  })
                  .setLock('pessimistic_write')
                  .getOne();

                if (!payment) {
                  this.logger.error(
                    `${event.eventType} - Payment with given finalPayment session ID does not exist!`,
                  );
                  throw new InternalServerErrorException(
                    `Payment with given finalPayment session ID does not exist!`,
                  );
                }

                payment.order = {
                  id: payload.orderId,
                  commitment: {
                    id: payload.commitmentId,
                    buyer: {
                      id: payload.buyerId,
                    },
                  },
                } as any;
                payment.status = PaymentStatus.Success;
                payment.stripeFinalPaymentIntentId = payload.paymentIntentId;

                await manager.getRepository(Payment).save(payment);

                event.processed = true;
                await manager.getRepository(TransactionalOutbox).save(event);
              },
            );
            break;
          }
          case 'entryFeeCheckoutSessionFail': {
            const payload = event.payload as {
              sessionId: string;
              status: PaymentStatus;
            };

            await this.transactionalOutboxRepository.manager.transaction(
              async (manager) => {
                const payment = await manager
                  .getRepository(Payment)
                  .createQueryBuilder('payment')
                  .where(
                    'payment.stripeEntryFeePaymentSessionId = :sessionId',
                    {
                      sessionId: payload.sessionId,
                    },
                  )
                  .setLock('pessimistic_write')
                  .getOne();

                if (!payment) {
                  this.logger.error(
                    `${event.eventType} - Payment with given entryFee session ID does not exist!`,
                  );
                  throw new InternalServerErrorException(
                    `Payment with given entryFee session ID does not exist!`,
                  );
                }

                payment.status = payload.status;
                await manager.getRepository(Payment).save(payment);

                event.processed = true;
                await manager.getRepository(TransactionalOutbox).save(event);
              },
            );
            break;
          }
          case 'finalPaymentCheckoutSessionFail': {
            const payload = event.payload as {
              sessionId: string;
              status: PaymentStatus;
            };

            await this.transactionalOutboxRepository.manager.transaction(
              async (manager) => {
                const payment = await manager
                  .getRepository(Payment)
                  .createQueryBuilder('payment')
                  .where('payment.stripefinalPaymentSessionId = :sessionId', {
                    sessionId: payload.sessionId,
                  })
                  .setLock('pessimistic_write')
                  .getOne();

                if (!payment) {
                  this.logger.error(
                    `${event.eventType} - Payment with given finalPayment session ID does not exist!`,
                  );
                  throw new InternalServerErrorException(
                    `Payment with given finalPayment session ID does not exist!`,
                  );
                }

                payment.status = payload.status;
                await manager.getRepository(Payment).save(payment);

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

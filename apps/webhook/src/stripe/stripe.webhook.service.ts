import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import {
  PAYMENTS_MICROSERVICE,
  USERS_MICROSERVICE,
} from '@app/common/constants/gateway.constant';
import { firstValueFrom } from 'rxjs';
import Stripe from 'stripe';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ORDERS_OUTBOX_CHANNEL,
  PAYMENTS_OUTBOX_CHANNEL,
  PaymentStatus,
  TransactionalOutbox,
} from '@app/common';
import { Repository } from 'typeorm';

@Injectable()
export class StripeWebhookService {
  private stripe: Stripe;

  private readonly logger: Logger = new Logger(StripeWebhookService.name);
  constructor(
    @InjectRepository(TransactionalOutbox)
    private readonly transactionalOutboxRepository: Repository<TransactionalOutbox>,
    @Inject(PAYMENTS_MICROSERVICE)
    private readonly paymentsMicroservice: ClientProxy,
    @Inject(USERS_MICROSERVICE) private readonly usersMicroservice: ClientProxy,
    private readonly configService: ConfigService,
  ) {
    this.stripe = new Stripe(
      this.configService.getOrThrow<string>('STRIPE_SECRET_KEY'),
    );
  }

  getHello(): string {
    return 'Hello World!';
  }

  async handleCheckoutWebhook(body: Buffer, signature: string) {
    try {
      const event = this.stripe.webhooks.constructEvent(
        body,
        signature,
        this.configService.getOrThrow<string>('STRIPE_WEBHOOK_SECRET'),
      );

      switch (event.type) {
        case 'checkout.session.completed':
        case 'checkout.session.async_payment_succeeded': {
          const session = event.data.object as Stripe.Checkout.Session;
          const action = session.metadata.action;
          if (action === 'createEntryFeeCheckoutSession') {
            // Idempotency: skip if this session was already enqueued
            const duplicate = await this.transactionalOutboxRepository
              .createQueryBuilder('outbox')
              .where('outbox.channel = :channel', { channel: PAYMENTS_OUTBOX_CHANNEL })
              .andWhere('outbox.eventType = :eventType', { eventType: 'entryFeeCheckoutSessionSuccess' })
              .andWhere("outbox.payload->>'sessionId' = :sessionId", { sessionId: session.id })
              .getOne();
            if (!duplicate) {
              // update payment row to have status entry_paid and add their entry fee payment intent ID
              await this.transactionalOutboxRepository.save(
                this.transactionalOutboxRepository.create({
                  channel: PAYMENTS_OUTBOX_CHANNEL,
                  eventType: 'entryFeeCheckoutSessionSuccess',
                  payload: {
                    sessionId: session.id,
                    paymentIntentId: session.payment_intent.toString(),
                  },
                }),
              );
            }
          } else if (action === 'createFinalPaymentCheckoutSession') {
            // Idempotency: skip if this session was already enqueued
            const duplicate = await this.transactionalOutboxRepository
              .createQueryBuilder('outbox')
              .where('outbox.channel = :channel', { channel: ORDERS_OUTBOX_CHANNEL })
              .andWhere('outbox.eventType = :eventType', { eventType: 'finalPaymentCheckoutSessionSuccess' })
              .andWhere("outbox.payload->>'sessionId' = :sessionId", { sessionId: session.id })
              .getOne();
            if (!duplicate) {
              // Once payment succeeded, create order object and update payment object
              await this.transactionalOutboxRepository.save(
                this.transactionalOutboxRepository.create({
                  channel: ORDERS_OUTBOX_CHANNEL,
                  eventType: 'finalPaymentCheckoutSessionSuccess',
                  payload: {
                    amount_total: session.amount_total,
                    shipping_address: session.shipping_details.address,
                    commitmentId: session.metadata.commitmentId,
                    buyerId: session.metadata.buyerId,
                    sessionId: session.id,
                    paymentIntentId: session.payment_intent.toString(),
                  },
                }),
              );
            }
          }

          // TODO: log / send out notification that payment succeeded
          this.logger.log(
            `Stripe Checkout - ${event.type} for ID: ${session.id}`,
          );
          break;
        }
        case 'checkout.session.expired': {
          const session = event.data.object as Stripe.Checkout.Session;
          const action = session.metadata.action;
          if (action === 'createEntryFeeCheckoutSession') {
            await this.transactionalOutboxRepository.save(
              this.transactionalOutboxRepository.create({
                channel: PAYMENTS_OUTBOX_CHANNEL,
                eventType: 'entryFeeCheckoutSessionFail',
                payload: {
                  sessionId: session.id,
                  status: PaymentStatus.EntryExpired,
                },
              }),
            );
          } else if (action === 'createFinalPaymentCheckoutSession') {
            await this.transactionalOutboxRepository.save(
              this.transactionalOutboxRepository.create({
                channel: PAYMENTS_OUTBOX_CHANNEL,
                eventType: 'finalPaymentCheckoutSessionFail',
                payload: {
                  sessionId: session.id,
                  status: PaymentStatus.Expired,
                },
              }),
            );
          }

          // TODO: log / send out notification that payment expired
          this.logger.log(
            `Stripe Checkout - ${event.type} for ID: ${session.id}`,
          );
          break;
        }
        case 'checkout.session.async_payment_failed': {
          const session = event.data.object as Stripe.Checkout.Session;
          const action = session.metadata.action;
          if (action === 'createEntryFeeCheckoutSession') {
            await this.transactionalOutboxRepository.save(
              this.transactionalOutboxRepository.create({
                channel: PAYMENTS_OUTBOX_CHANNEL,
                eventType: 'entryFeeCheckoutSessionFail',
                payload: {
                  sessionId: session.id,
                  status: PaymentStatus.EntryFailed,
                },
              }),
            );
          } else if (action === 'createFinalPaymentCheckoutSession') {
            await this.transactionalOutboxRepository.save(
              this.transactionalOutboxRepository.create({
                channel: PAYMENTS_OUTBOX_CHANNEL,
                eventType: 'finalPaymentCheckoutSessionFail',
                payload: {
                  sessionId: session.id,
                  status: PaymentStatus.Failed,
                },
              }),
            );
          }

          // TODO: log / send out notification that payment expired
          // TODO: send out email for async payments that it has failed
          this.logger.log(
            `Stripe Checkout - ${event.type} for ID: ${session.id}`,
          );
          break;
        }
        default:
          break;
      }
    } catch (error) {
      this.logger.error(
        `ERROR - Stripe webhook for Checkout: ${error.message}`,
      );
    }
  }

  async handleAccountWebhook(body: Buffer, signature: string) {
    try {
      const event = this.stripe.webhooks.constructEvent(
        body,
        signature,
        this.configService.getOrThrow<string>('STRIPE_WEBHOOK_SECRET'),
      );

      switch (event.type) {
        case 'account.updated': {
          const account = event.data.object;
          await firstValueFrom(
            this.usersMicroservice.send(
              { cmd: 'updateUserStripeConnectAccount' },
              {
                stripeAccountId: account.id,
                stripeConnectAccountLinked:
                  account.capabilities?.transfers === 'active',
              },
            ),
            {
              defaultValue: null,
            },
          );
          this.logger.log(
            `Stripe Accounts - ${event.type} for ID: ${account.id}`,
          );
          break;
        }
        case 'account.application.authorized': {
          const account = event.data.object;
          this.logger.log(
            `Stripe Accounts - ${event.type} for ID: ${account.id}`,
          );
          break;
        }

        case 'account.application.deauthorized': {
          const account = event.data.object;
          this.logger.log(
            `Stripe Accounts - ${event.type} for ID: ${account.id}`,
          );
          break;
        }
        default:
          break;
      }
    } catch (error) {
      this.logger.error(
        `ERROR - Stripe webhook for Accounts: ${error.message}`,
      );
    }
  }
}

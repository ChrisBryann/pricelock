import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import {
  PAYMENTS_MICROSERVICE,
  USERS_MICROSERVICE,
} from '@app/common/constants/gateway.constant';
import { firstValueFrom } from 'rxjs';
import Stripe from 'stripe';

@Injectable()
export class StripeWebhookService {
  private stripe: Stripe;

  private readonly logger: Logger = new Logger(StripeWebhookService.name);
  constructor(
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

          // Once payment succeeded, create order object and update payment object
          await firstValueFrom(
            this.paymentsMicroservice.send(
              {
                cmd: 'handlePaymentSessionSuccess',
              },
              {
                session,
              },
            ),
            {
              defaultValue: null,
            },
          );

          // TODO: log / send out notification that payment succeeded
          this.logger.log(
            `Stripe Checkout - ${event.type} for ID: ${session.id}`,
          );
          break;
        }
        case 'checkout.session.expired': {
          const session = event.data.object as Stripe.Checkout.Session;

          await firstValueFrom(
            this.paymentsMicroservice.send(
              {
                cmd: 'handlePaymentSessionFail',
              },
              {
                session,
              },
            ),
            {
              defaultValue: null,
            },
          );

          // TODO: log / send out notification that payment expired
          this.logger.log(
            `Stripe Checkout - ${event.type} for ID: ${session.id}`,
          );
          break;
        }
        case 'checkout.session.async_payment_failed': {
          const session = event.data.object as Stripe.Checkout.Session;

          await firstValueFrom(
            this.paymentsMicroservice.send(
              {
                cmd: 'handlePaymentSessionFail',
              },
              {
                session,
              },
            ),
            {
              defaultValue: null,
            },
          );

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
              { cmd: 'updateUserStripeAccount' },
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

  async handlePaymentIntentWebhook(body: Buffer, signature: string) {
    try {
      const event = this.stripe.webhooks.constructEvent(
        body,
        signature,
        this.configService.getOrThrow<string>('STRIPE_WEBHOOK_SECRET'),
      );

      switch (event.type) {
        case 'payment_intent.payment_failed': {
          // customer didn't complete checkout flow
          // expire the payment row
          const paymentIntent = event.data.object;

          await firstValueFrom(
            this.paymentsMicroservice.send(
              {
                cmd: 'handlePaymentIntentFail',
              },
              {
                paymentIntentId: paymentIntent.id,
              },
            ),
            {
              defaultValue: null,
            },
          );

          this.logger.log(
            `Stripe Payment Intent - ${event.type} for ID: ${paymentIntent.id}`,
          );

          break;
        }
        case 'payment_intent.succeeded': {
          this.logger.log(`Stripe Payment Intent - ${event.type} for ID: ${1}`);
          break;
        }
        default:
          break;
      }
    } catch (error) {
      this.logger.error(
        `ERROR - Stripe webhook for Payment Intent: ${error.message}`,
      );
    }
  }
}

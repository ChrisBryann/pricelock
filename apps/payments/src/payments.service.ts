import {
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import Stripe from 'stripe';
import { EntityManager, Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import {
  COMMITMENTS_MICROSERVICE,
  PaymentStatus,
  USERS_MICROSERVICE,
} from '@app/common';
import Decimal from 'decimal.js';
import { Commitment } from 'apps/commitments/src/entities/commitment.entity';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { User } from 'apps/users/src/entities/user.entity';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
    @Inject(COMMITMENTS_MICROSERVICE)
    private readonly commitmentsMicroservice: ClientProxy,
    @Inject(USERS_MICROSERVICE) private readonly usersMicroservice: ClientProxy,
  ) {
    this.stripe = new Stripe(
      this.configService.getOrThrow<string>('STRIPE_SECRET_KEY'),
    );
  }
  getHello(): string {
    return 'Hello World!';
  }

  // private getStripePaymentStatus(stripeStatus: Stripe.Checkout.Session.Status) {
  //   switch (stripeStatus) {
  //     case 'complete':
  //       return PaymentStatus.Success;
  //     case 'expired':
  //       return PaymentStatus.Expired;
  //     case 'open':
  //       return PaymentStatus.Pending;
  //     default:
  //       return PaymentStatus.Failed;
  //   }
  // }

  // private async findOneBySessionId(
  //   sessionId: string,
  //   manager?: EntityManager,
  //   lock: boolean = false,
  // ) {
  //   console.log(sessionId);
  //   const repo = manager
  //     ? manager.getRepository(Payment)
  //     : this.paymentsRepository;

  //   let query = repo
  //     .createQueryBuilder('payment')
  //     .where('payment.stripeFinalPaymentSessionId = :sessionId', { sessionId });

  //   if (lock && !!manager) {
  //     query = query.setLock('pessimistic_write');
  //   }

  //   const payment = await query.getOne();

  //   if (!payment) {
  //     throw new NotFoundException(
  //       'Payment with given session ID does not exist!',
  //     );
  //   }
  //   return payment;
  // }

  async findOneByCommitmentId(
    commitmentId: string,
    manager?: EntityManager,
    lock: boolean = false,
  ) {
    const repo = manager
      ? manager.getRepository(Payment)
      : this.paymentsRepository;

    let query = repo
      .createQueryBuilder('payment')
      // .innerJoinAndSelect('payment.order', 'order') // this will not fetch any record if an initial payment with no order attached to it exist
      .where('payment.commitmentId = :commitmentId', { commitmentId });

    if (lock && !!manager) {
      query = query.setLock('pessimistic_write');
    }

    const payment = await query.getOne();

    if (!payment) {
      throw new NotFoundException(
        'Payment with given commitment ID does not exist!',
      );
    }
    return payment;
  }

  private async findOneOpenPaymentByCommitmentId(
    commitmentId: string,
    manager?: EntityManager,
    lock: boolean = false,
  ) {
    const repo = manager
      ? manager.getRepository(Payment)
      : this.paymentsRepository;

    let query = repo
      .createQueryBuilder('payment')
      .where('payment.commitmentId = :commitmentId', { commitmentId })
      .andWhere('payment.status NOT IN (:expired, :failed)', {
        expired: PaymentStatus.Expired,
        failed: PaymentStatus.Failed,
      });

    if (lock && !!manager) {
      query = query.setLock('pessimistic_write');
    }

    const payment = await query.getOne();

    if (!payment) {
      throw new NotFoundException(
        'Payment with given commitment ID does not exist!',
      );
    }
    return payment;
  }

  async createHostedPayment(commitmentId: string, origin: string) {
    /*
     This function creates a Stripe payment hosted page session for a commitment.
     An order is created when a payment is successful
      Things to do:
      0. Check if an order for this commitment has been created, if so, stop creating payment
      1. Open up the payment session and create a temporary payment object
      2. Get commitment details for the payment session (amount, quantity, product title)
      3. Once payment succeeded, create order object and update payment object
     */

    // 1. Get commitment details for the payment session (amount, quantity, product title)
    // if commitment didn't exist, then the entry_paid payment object never existed
    // because commitment is made with the payment object under the same transaction
    const commitment: Commitment = await firstValueFrom(
      this.commitmentsMicroservice.send(
        { cmd: 'findCommitmentById' },
        {
          id: commitmentId,
        },
      ),
    );
    commitment.listing.finalPrice = new Decimal(commitment.listing.finalPrice);
    // get buyer information
    const buyer: User = await firstValueFrom(
      this.usersMicroservice.send(
        { cmd: 'getUserById' },
        {
          id: commitment.buyer.id,
        },
      ),
    );
    // need to check if user creating the payment is the one from commitment
    // TODO: create new function for this in order microservice
    // Check if a non-expired payment already exists for this commitment.
    // If a pending session is still open, return its URL directly.
    const existingSessionUrl: string | null =
      await this.paymentsRepository.manager.transaction(async (manager) => {
        const payment = await this.findOneOpenPaymentByCommitmentId(
          commitmentId,
          manager,
          true,
        );
        if (payment.status === PaymentStatus.Pending) {
          const session = await this.stripe.checkout.sessions.retrieve(
            payment.stripeFinalPaymentSessionId,
          );
          if (session.status === 'open') {
            return session.url;
          }
        } else if (payment.status === PaymentStatus.Success) {
          throw new ForbiddenException(
            'Payment for this commitment ID has been processed!',
          );
        }
        return null;
      });

    if (existingSessionUrl) {
      return existingSessionUrl;
    }
    let session: Stripe.Checkout.Session = null;
    try {
      session = await this.stripe.checkout.sessions.create({
        ui_mode: 'hosted',
        customer: buyer.stripeCustomerAccountId,
        payment_method_types: ['card'],
        shipping_address_collection: {
          allowed_countries: ['US'],
        },
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: commitment.listing.product.title,
                description: commitment.listing.product.description,
                images: [],
              },
              unit_amount: commitment.listing.finalPrice
                .minus(commitment.listing.entryFee)
                .times(100)
                .ceil()
                .toNumber(),
            },
            quantity: commitment.quantity,
          },
        ],
        mode: 'payment',
        success_url: `${origin}/payments/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/payments/?canceled=true`,
        metadata: {
          action: 'createFinalPaymentCheckoutSession',
          buyerId: commitment.buyer.id,
          commitmentId: commitment.id,
        },
        payment_intent_data: {
          application_fee_amount: commitment.listing.finalPrice
            .times(commitment.quantity)
            .times(100)
            .times(0.1)
            .ceil()
            .toNumber(),
          transfer_data: {
            destination:
              commitment.listing.product.seller.stripeConnectAccountId,
          },
        },
      });
    } catch (error) {
      // set payment status to failed in DB if this stripe API call fails
      // TODO: DON'T SET payment status if call to API fails, just throw error so next time can call again
      this.logger.error(`createHostedPayment - Failed to create Stripe session: ${error.message}`);
      // await this.paymentsRepository.update(
      //   {
      //     id: payment.id,
      //   },
      //   {
      //     status: PaymentStatus.Failed,
      //   },
      // );
      throw new InternalServerErrorException(
        `Error creating Stripe embedded form: ${error.message}`,
      );
    }
    // Update the payment with the new session inside a locked transaction.
    // If a concurrent request already claimed this payment, expire our
    // newly created session and return the existing open session URL instead.
    const finalUrl = await this.paymentsRepository.manager.transaction(
      async (manager) => {
        const paymentToUpdate = await this.findOneOpenPaymentByCommitmentId(
          commitmentId,
          manager,
          true,
        );

        if (paymentToUpdate.status === PaymentStatus.Pending) {
          // Another concurrent request beat us to it — clean up our orphaned session
          await this.stripe.checkout.sessions.expire(session.id);
          const existingSession = await this.stripe.checkout.sessions.retrieve(
            paymentToUpdate.stripeFinalPaymentSessionId,
          );
          return existingSession.url;
        }

        paymentToUpdate.stripeFinalPaymentSessionId = session.id;
        paymentToUpdate.finalAmount = commitment.listing.finalPrice
          .times(commitment.quantity)
          .times(100)
          .ceil()
          .div(100);
        paymentToUpdate.status = PaymentStatus.Pending;
        await manager.getRepository(Payment).save(paymentToUpdate);
        return session.url;
      },
    );

    return finalUrl;
  }

  async getPaymentStatus(paymentId: string, manager?: EntityManager) {
    const repo = manager
      ? manager.getRepository(Payment)
      : this.paymentsRepository;

    return await repo.findOne({
      where: {
        id: paymentId,
      },
      select: {
        status: true,
      },
    });
  }

  async paymentReturn(sessionId: string) {
    // return url after stripe checkout embedded form occurs (will have session_id as query param string)

    const session = await this.stripe.checkout.sessions.retrieve(sessionId);

    return {
      status: session.status,
      email: session.customer_details.email,
      buyerId: session.metadata?.buyerId,
    };
  }
}

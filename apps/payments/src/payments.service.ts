import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import Stripe from 'stripe';
import { DeepPartial, EntityManager, Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { formatStripeAddress, PaymentStatus } from '@app/common';
import { OrdersService } from 'apps/orders/src/orders.service';
import { CommitmentsService } from 'apps/commitments/src/commitments.service';
import { OrderStatus } from '@app/common/enums/order-status.enum';
import Decimal from 'decimal.js';
import { Commitment } from 'apps/commitments/src/entities/commitment.entity';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;

  constructor(
    private readonly configService: ConfigService,
    private readonly ordersService: OrdersService,
    private readonly commitmentsService: CommitmentsService,
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
  ) {
    this.stripe = new Stripe(
      this.configService.getOrThrow<string>('STRIPE_SECRET_KEY'),
    );
  }
  getHello(): string {
    return 'Hello World!';
  }

  private getStripePaymentStatus(stripeStatus: Stripe.Checkout.Session.Status) {
    switch (stripeStatus) {
      case 'complete':
        return PaymentStatus.Success;
      case 'expired':
        return PaymentStatus.Expired;
      case 'open':
        return PaymentStatus.Pending;
      default:
        return PaymentStatus.Failed;
    }
  }

  private async getPaymentBySessionId(
    sessionId: string,
    manager?: EntityManager,
    lock: boolean = false,
  ) {
    console.log(sessionId);
    const repo = manager
      ? manager.getRepository(Payment)
      : this.paymentsRepository;

    let query = repo
      .createQueryBuilder('payment')
      .where('payment.stripeSessionId = :sessionId', { sessionId });

    if (lock) {
      query = query.setLock('pessimistic_write');
    }

    const payment = await query.getOne();

    if (!payment) {
      throw new NotFoundException(
        'Payment with given session ID does not exist!',
      );
    }
    return payment;
  }

  private async getPaymentByCommitmentId(
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

    if (lock) {
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

  private async getOpenPaymentByCommitmentId(
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

    if (lock) {
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

  private async updatePaymentBySessionId(
    sessionId: string,
    updatePaymentData: DeepPartial<Payment>,
    manager?: EntityManager,
  ) {
    if (manager) {
      await this.getPaymentBySessionId(sessionId, manager, true);

      await manager.getRepository(Payment).update(
        {
          stripeSessionId: sessionId,
        },
        updatePaymentData,
      );

      return await this.getPaymentBySessionId(sessionId, manager, true);
    }

    return await this.paymentsRepository.manager.transaction(
      async (manager) => {
        await this.getPaymentBySessionId(sessionId, manager, true);

        await manager.getRepository(Payment).update(
          {
            stripeSessionId: sessionId,
          },
          updatePaymentData,
        );

        return await this.getPaymentBySessionId(sessionId, manager, true);
      },
    );
  }

  // origin will be obtained as query param named as redirect_url
  async createPayment(commitmentId: string, origin: string) {
    /*
     This function creates a Stripe payment embedded session for a commitment.
     An order is created when a payment is successful
      Things to do:
      0. Check if an order for this commitment has been created, if so, stop creating payment
      1. Open up the payment session and create a temporary payment object
      2. Get commitment details for the payment session (amount, quantity, product title)
      3. Once payment succeeded, create order object and update payment object
     */
    // need to check if user creating the payment is the one from commitment
    // TODO: create new function for this in order microservice
    const [commitment, newPayment, stripeSessionUrl]: [
      Commitment | null,
      Payment | null,
      string | null,
    ] = await this.paymentsRepository.manager.transaction(async (manager) => {
      // 0: check if a PENDING payment exist with this commitmentId
      // if exist the pending payment, return its stripe session id / url IF the session has not expired, a.k.a open

      // 1. Get commitment details for the payment session (amount, quantity, product title)
      const commitment = await this.commitmentsService.findOne(
        commitmentId,
        manager,
      );

      try {
        const payment = await this.getOpenPaymentByCommitmentId(
          commitmentId,
          manager,
          true,
        );
        if (payment.status == PaymentStatus.Pending) {
          const session = await this.stripe.checkout.sessions.retrieve(
            payment.stripeSessionId,
          );
          if (session.status === 'open') {
            return [null, null, session.url];
          }
        } else if (payment.status === PaymentStatus.Inactive) {
          // make it to a pending payment by creating a hosted stripe payment page
          return [commitment, payment, null];
        } else if (payment.status === PaymentStatus.Success) {
          throw new ForbiddenException(
            'Payment for this commitment ID has been processed!',
          );
        }
      } catch {}

      // 2. Open up the payment session and create a temporary payment object
      // create an inactive payment to prepare for the stripe session
      // once session is created successfully, we can update the payment to pending and
      // fill in the session ID
      const newPayment = await manager.getRepository(Payment).create({
        commitmentId,
        status: PaymentStatus.Inactive,
      });
      await manager.getRepository(Payment).save(newPayment);

      return [commitment, newPayment, null];
    });

    if (stripeSessionUrl) {
      return stripeSessionUrl;
    }
    let session: Stripe.Checkout.Session = null;
    try {
      console.log('creating session...');

      session = await this.stripe.checkout.sessions.create({
        ui_mode: 'embedded',
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
              unit_amount: commitment.listing.finalPrice.toNumber(),
            },
            quantity: commitment.quantity,
          },
        ],
        mode: 'payment',
        return_url: `${origin}/payments/return?session_id={CHECKOUT_SESSION_ID}`,
        metadata: {
          buyerId: commitment.buyer.id,
          commitmentId: commitment.id,
        },
        payment_intent_data: {
          application_fee_amount: commitment.listing.finalPrice
            .times(commitment.quantity)
            .times(100)
            .round()
            .times(0.1)
            .toNumber(),
          transfer_data: {
            destination:
              commitment.listing.product.seller.stripeConnectAccountId,
          },
        },
      });
      console.log('session created');
    } catch (error) {
      // set payment status to failed in DB if this stripe API call fails
      console.log('error with creating payment!');

      await this.paymentsRepository.update(
        {
          id: newPayment.id,
        },
        {
          status: PaymentStatus.Failed,
        },
      );
      throw new InternalServerErrorException(
        `Error creating Stripe embedded form: ${error.message}`,
      );
    }
    // update the payment info with Stripe's session ID and amount total
    // and set its status to Pending
    newPayment.stripeSessionId = session.id;
    newPayment.amount = new Decimal(session.amount_total);
    newPayment.status = PaymentStatus.Pending;

    await this.paymentsRepository.save(newPayment);
    console.log('updated newPayment info');

    return session.client_secret;
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
    // need to check if user creating the payment is the one from commitment
    // TODO: create new function for this in order microservice
    const [commitment, newPayment, stripeSessionUrl]: [
      Commitment | null,
      Payment | null,
      string | null,
    ] = await this.paymentsRepository.manager.transaction(async (manager) => {
      // 0: check if a PENDING payment exist with this commitmentId
      // if exist the pending payment, return its stripe session id / url IF the session has not expired, a.k.a open

      // 1. Get commitment details for the payment session (amount, quantity, product title)
      const commitment = await this.commitmentsService.findOne(
        commitmentId,
        manager,
      );

      try {
        const payment = await this.getOpenPaymentByCommitmentId(
          commitmentId,
          manager,
          true,
        );
        if (payment.status == PaymentStatus.Pending) {
          const session = await this.stripe.checkout.sessions.retrieve(
            payment.stripeSessionId,
          );
          if (session.status === 'open') {
            return [null, null, session.url];
          }
        } else if (payment.status === PaymentStatus.Inactive) {
          // make it to a pending payment by creating a hosted stripe payment page
          return [commitment, payment, null];
        } else if (payment.status === PaymentStatus.Success) {
          throw new ForbiddenException(
            'Payment for this commitment ID has been processed!',
          );
        }
      } catch {}

      // 2. Open up the payment session and create a temporary payment object
      // create an inactive payment to prepare for the stripe session
      // once session is created successfully, we can update the payment to pending and
      // fill in the session ID
      const newPayment = await manager.getRepository(Payment).create({
        commitmentId,
        status: PaymentStatus.Inactive,
      });
      await manager.getRepository(Payment).save(newPayment);

      return [commitment, newPayment, null];
    });

    if (stripeSessionUrl) {
      return stripeSessionUrl;
    }
    let session: Stripe.Checkout.Session = null;
    try {
      session = await this.stripe.checkout.sessions.create({
        ui_mode: 'hosted',
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
              unit_amount: commitment.listing.finalPrice.times(100).toNumber(),
            },
            quantity: commitment.quantity,
          },
        ],
        mode: 'payment',
        success_url: `${origin}/payments/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/payments/?canceled=true`,
        metadata: {
          buyerId: commitment.buyer.id,
          commitmentId: commitment.id,
        },
        payment_intent_data: {
          application_fee_amount: commitment.listing.finalPrice
            .times(commitment.quantity)
            .times(100)
            .round()
            .times(0.1)
            .toNumber(),
          transfer_data: {
            destination:
              commitment.listing.product.seller.stripeConnectAccountId,
          },
        },
      });
    } catch (error) {
      // set payment status to failed in DB if this stripe API call fails
      console.log('error creating session');
      await this.paymentsRepository.update(
        {
          id: newPayment.id,
        },
        {
          status: PaymentStatus.Failed,
        },
      );
      throw new InternalServerErrorException(
        `Error creating Stripe embedded form: ${error.message}`,
      );
    }
    // update the payment info with Stripe's session ID and amount total
    // and set its status to Pending
    newPayment.stripeSessionId = session.id;
    newPayment.amount = new Decimal(session.amount_total);
    newPayment.status = PaymentStatus.Pending;

    await this.paymentsRepository.save(newPayment);

    return session.url;
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

  async handlePaymentSessionSuccess(session: Stripe.Checkout.Session) {
    // Once payment succeeded, create order object and update payment object
    await this.paymentsRepository.manager.transaction(async (manager) => {
      const order = await this.ordersService.create(
        {
          commitmentId: session.metadata.commitmentId,
          buyerId: session.metadata.buyerId,
          lockedAt: new Date().toISOString(),
          price: session.amount_total,
          shippingAddress: formatStripeAddress(
            session.shipping_details.address,
          ),
          status: OrderStatus.Confirmed,
        },
        manager,
      );

      await this.updatePaymentBySessionId(
        session.id,
        {
          order: {
            id: order.id,
            commitment: {
              id: order.commitment.id,
            },
            buyer: {
              id: order.buyer.id,
            },
          },
          stripePaymentIntentId: session.payment_intent.toString(),
          status: this.getStripePaymentStatus(session.status),
        },
        manager,
      );
    });
  }
  async handlePaymentSessionFail(session: Stripe.Checkout.Session) {
    await this.updatePaymentBySessionId(session.id, {
      status: this.getStripePaymentStatus(session.status),
    });
  }

  async handlePaymentIntentFail(paymentIntentId: string) {
    await this.paymentsRepository.manager.transaction(async (manager) => {
      // get the checkout session id from this failed payment intent
      const sessionList = await this.stripe.checkout.sessions.list({
        payment_intent: paymentIntentId,
      });
      const session = sessionList.data?.[0];

      // if the checkout session exist, then use this session ID to find the payment row in DB
      // and set the payment status to Failed
      if (session) {
        await this.updatePaymentBySessionId(
          session.id,
          {
            status: PaymentStatus.Failed,
          },
          manager,
        );
      }
    });
  }
}

import {
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateCommitmentDto } from './dto/create-commitment.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Commitment } from './entities/commitment.entity';
import { DeepPartial, EntityManager, Repository } from 'typeorm';
import { ProductListing } from 'apps/listings/src/entities/product-listing.entity';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';
import { Payment } from 'apps/payments/src/entities/payment.entity';
import {
  LISTINGS_MICROSERVICE,
  PAYMENTS_OUTBOX_CHANNEL,
  TransactionalOutbox,
  USERS_MICROSERVICE,
} from '@app/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { User } from 'apps/users/src/entities/user.entity';
import Decimal from 'decimal.js';

@Injectable()
export class CommitmentsService {
  private readonly stripe: Stripe;
  private readonly logger: Logger = new Logger(CommitmentsService.name);
  constructor(
    @InjectRepository(Commitment)
    private readonly commitmentRepository: Repository<Commitment>,
    @Inject(LISTINGS_MICROSERVICE)
    private readonly listingsMicroservice: ClientProxy,
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

  async create(buyerId: string, createCommitmentDto: CreateCommitmentDto) {
    // check if product listing exist and isn't expired and isn't locked
    const listing: ProductListing = await firstValueFrom(
      this.listingsMicroservice.send(
        { cmd: 'getListingById' },
        {
          id: createCommitmentDto.listingId,
        },
      ),
    );
    console.log(listing);
    listing.entryFee = new Decimal(listing.entryFee);
    // get buyer information
    const buyer: User = await firstValueFrom(
      this.usersMicroservice.send(
        { cmd: 'getUserById' },
        {
          id: buyerId,
        },
      ),
    );
    // create a payment checkout session for entry fee
    const entryFeeCheckoutSession = await this.stripe.checkout.sessions.create({
      ui_mode: 'hosted',
      customer: buyer.stripeCustomerAccountId,
      payment_method_types: ['card'],
      // amount: payment.entryFeeAmount.times(100).round().toNumber(),
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${listing.product.title} (ENTRY FEE)`,
            },
            unit_amount: listing.entryFee
              .times(createCommitmentDto.quantity)
              .times(100)
              .ceil()
              .toNumber(),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url:
        'https://example.com/commitments/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://example.com/commitments/cancelled',
      metadata: {
        action: 'createEntryFeeCheckoutSession',
      },
      payment_intent_data: {
        application_fee_amount: listing.entryFee
          .times(createCommitmentDto.quantity)
          .times(100)
          .round()
          .times(0.1)
          .round()
          .toNumber(),
        transfer_data: {
          destination: listing.product.seller.stripeConnectAccountId,
        },
      },
    });

    // create the commitment and create a transactional outbox row for payment channel
    try {
      const commitment = await this.commitmentRepository.manager.transaction(
        async (manager) => {
          const commitmentObj = await manager.getRepository(Commitment).create({
            quantity: createCommitmentDto.quantity,
            buyer: {
              id: buyerId,
            },
            listing: {
              id: createCommitmentDto.listingId,
            },
          });

          const commitment = await manager
            .getRepository(Commitment)
            .save(commitmentObj);

          // const commitment = await manager
          //   .getRepository(Commitment)
          //   .createQueryBuilder('commitment')
          //   .innerJoin('commitment.buyer', 'buyer')
          //   .addSelect('buyer.id')
          //   .addSelect('buyer.stripeCustomerAccountId')
          //   .innerJoinAndSelect('commitment.listing', 'listing')
          //   .innerJoinAndSelect('listing.product', 'product')
          //   // Join seller, but don't use innerJoinAndSelect for seller so we can limit its fields
          //   .innerJoin('product.seller', 'seller')
          //   .addSelect('seller.id')
          //   .addSelect('seller.stripeConnectAccountId')
          //   .setLock('pessimistic_write')
          //   .where('commitment.id = :id', { id: commitmentId })
          //   .getOne();

          // create a new transactional outbox row
          await manager.getRepository(TransactionalOutbox).save(
            manager.getRepository(TransactionalOutbox).create({
              channel: PAYMENTS_OUTBOX_CHANNEL,
              eventType: 'createEntryFeeCheckoutSession',
              payload: {
                commitmentId: commitment.id,
                entryFeeAmount: listing.entryFee
                  .times(createCommitmentDto.quantity)
                  .times(100)
                  .ceil()
                  .div(100)
                  .toNumber(),
                stripeEntryFeePaymentSessionId: entryFeeCheckoutSession.id,
              } as DeepPartial<Payment>,
            }),
          );
          return commitment;
        },
      );
      // TODO: return the checkout session url and do the payment row update in webhook
      return {
        url: entryFeeCheckoutSession.url,
        commitment,
      };
    } catch (error) {
      // expire the Checkout Session
      await this.stripe.checkout.sessions.expire(entryFeeCheckoutSession.id);
      this.logger.error(
        'commitment_create - Failed to create commitment row and/or transactional outbox row with error: ' +
          error.message,
      );
      throw new InternalServerErrorException(
        'Failed to create commitment row and/or transactional outbox row with error: ' +
          error.message,
      );
    }
  }

  async findOne(id: string, manager?: EntityManager, lock: boolean = false) {
    const repo = manager
      ? manager.getRepository(Commitment)
      : this.commitmentRepository;

    let query = repo
      .createQueryBuilder('commitment')
      .innerJoin('commitment.buyer', 'buyer')
      .addSelect('buyer.id')
      .addSelect('buyer.email')
      .innerJoinAndSelect('commitment.listing', 'listing')
      .innerJoinAndSelect('listing.product', 'product')
      // Join seller, but don't use innerJoinAndSelect for seller so we can limit its fields
      .innerJoin('product.seller', 'seller')
      .addSelect('seller.id')
      .addSelect('seller.stripeConnectAccountId')
      .where('commitment.id = :id', { id }); // need to use different param names (cannot have two :id) according to docs
    // https://typeorm.io/select-query-builder#important-note-when-using-the-querybuilder

    if (lock && !!manager) {
      query = query.setLock('pessimistic_write');
    }

    const commitment = await query.getOne();

    if (!commitment) {
      this.logger.error('commitment_findOne - Commitment does not exist!');
      throw new NotFoundException('Commitment does not exist!');
    }
    return commitment;
  }

  async findAllByListingId(
    sellerId: string,
    listingId: string,
    manager?: EntityManager,
    lock: boolean = false,
  ) {
    const repo = manager
      ? manager.getRepository(Commitment)
      : this.commitmentRepository;

    let query = repo
      .createQueryBuilder('commitment')
      .innerJoin('commitment.buyer', 'buyer')
      .addSelect('buyer.id')
      .addSelect('buyer.email')
      .innerJoinAndSelect('commitment.listing', 'listing')
      .innerJoinAndSelect('listing.product', 'product')
      // Join seller, but don't use innerJoinAndSelect for seller so we can limit its fields
      .innerJoin('product.seller', 'seller')
      .addSelect('seller.id')
      .addSelect('seller.stripeConnectAccountId')
      .where('listing.id = :id', { id: listingId })
      .andWhere('seller.id = :sid', { sid: sellerId }); // need to use different param names (cannot have two :id) according to docs
    // https://typeorm.io/select-query-builder#important-note-when-using-the-querybuilder

    if (lock && !!manager) {
      query = query.setLock('pessimistic_write');
    }

    return await query.getMany();
  }

  async getAggregatedDataByListingId(
    sellerId: string,
    listingId: string,
    manager?: EntityManager,
  ) {
    // total quantity committed, threshold status, remaining time
    const commitments = await this.findAllByListingId(
      sellerId,
      listingId,
      manager,
      true,
    );
    return {
      totalCommitments: commitments.length,
      minThreshold:
        commitments.length > 0 ? commitments[0].listing.minThreshold : 1,
      remainingTime:
        commitments.length > 0
          ? commitments[0].listing.deadline.getTime() - Date.now()
          : 0,
    };
  }

  private async updateCommitmentWithLock(
    id: string,
    quantity: number,
    manager: EntityManager,
  ) {
    const commitment = await this.findOne(id, manager, true);

    commitment.quantity = quantity;
    return manager.getRepository(Commitment).save(commitment);
  }

  async updateCommitment(
    id: string,
    quantity: number,
    manager?: EntityManager,
  ) {
    if (manager) {
      return await this.updateCommitmentWithLock(id, quantity, manager);
    }
    return await this.commitmentRepository.manager.transaction(
      async (manager) => {
        return await this.updateCommitmentWithLock(id, quantity, manager);
      },
    );
  }

  private async cancelCommitmentWithLock(
    buyerId: string,
    id: string,
    manager: EntityManager,
  ) {
    const commitment = await this.findOne(id, manager, true);

    if (commitment.buyer.id !== buyerId) {
      this.logger.error(
        'commitment_cancelCommitmentWithLock - This commitment does not belong to this buyer!',
      );
      throw new ForbiddenException(
        'This commitment does not belong to this buyer!',
      );
    }
    if (commitment.listing.deadline.getTime() < Date.now()) {
      // this listing window has closed, so commitment must be locked
      this.logger.error(
        'commitment_cancelCommitmentWithLock - This listing window has closed and this commitment cannot be cancelled!',
      );
      throw new ForbiddenException(
        'This listing window has closed and this commitment cannot be cancelled!',
      );
    }
    await manager.getRepository(Commitment).remove(commitment);
  }

  async cancelCommitment(buyerId: string, id: string, manager?: EntityManager) {
    if (manager) {
      await this.cancelCommitmentWithLock(buyerId, id, manager);
    }
    await this.commitmentRepository.manager.transaction(async (manager) => {
      await this.cancelCommitmentWithLock(buyerId, id, manager);
    });
  }

  // async closeExpiredCommitment(id: string) {
  //   // close expired commitment when:
  //   // 1. the listing locked (met min threshold) and notifications have been sent out to the user of the commitment
  //   // 2. listing expired
  //   await this.commitmentRepository.manager.transaction(async (manager) => {
  //     await manager.getRepository(Commitment).update(
  //       {
  //         id,
  //       },
  //       {
  //         expired: true,
  //       },
  //     );
  //   });
  // }
}

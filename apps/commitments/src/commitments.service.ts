import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateCommitmentDto } from './dto/create-commitment.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Commitment } from './entities/commitment.entity';
import { EntityManager, Repository } from 'typeorm';
import { ProductListing } from 'apps/listings/src/entities/product-listing.entity';

@Injectable()
export class CommitmentsService {
  constructor(
    @InjectRepository(Commitment)
    private readonly commitmentRepository: Repository<Commitment>,
  ) {}
  getHello(): string {
    return 'Hello World!';
  }

  private async createWithLock(
    buyerId: string,
    createCommitmentDto: CreateCommitmentDto,
    manager: EntityManager,
  ) {
    const listing = await manager
      .getRepository(ProductListing)
      .createQueryBuilder('listing')
      .where('listing.id = :id', { id: createCommitmentDto.listingId })
      .andWhere('listing.expired = :expired', { expired: false })
      .andWhere('listing.locked = :locked', { locked: false })
      .setLock('pessimistic_write')
      .getOne();

    if (!listing) {
      throw new NotFoundException(
        "Product listing for this ID is locked or has expired or doesn't exist!",
      );
    }

    const commitment = await manager.getRepository(Commitment).create({
      quantity: createCommitmentDto.quantity,
      buyer: {
        id: buyerId,
      },
      listing: {
        id: createCommitmentDto.listingId,
      },
    });

    return await manager.getRepository(Commitment).save(commitment);
  }

  async create(
    buyerId: string,
    createCommitmentDto: CreateCommitmentDto,
    manager?: EntityManager,
  ) {
    // check if product listing exist and isn't expired and isn't locked
    // later, check if total commitments >= min threshold --> NO NEED SINCE WE WILL CHECK THIS WHEN LISTING WINDOW HAS CLOSED
    if (manager) {
      return await this.createWithLock(buyerId, createCommitmentDto, manager);
    }
    return await this.commitmentRepository.manager.transaction(
      async (manager) => {
        return await this.createWithLock(buyerId, createCommitmentDto, manager);
      },
    );
  }

  async findOne(id: string, manager?: EntityManager) {
    // return await this.commitmentRepository.findOne({
    //   where: {
    //     id,
    //   },
    //   select: {
    //     buyer: {
    //       id: true,
    //     },
    //     listing: {
    //       product: {
    //         seller: {
    //           id: true,
    //         },
    //       },
    //     },
    //   },
    // });
    if (manager) {
      return this.findOneWithLock(manager, id);
    }

    const commitment = await this.commitmentRepository
      .createQueryBuilder('commitment')
      .leftJoin('commitment.buyer', 'buyer')
      .addSelect('buyer.id')
      .addSelect('buyer.email')
      .leftJoinAndSelect('commitment.listing', 'listing')
      .leftJoinAndSelect('listing.product', 'product')
      // Join seller, but don't use leftJoinAndSelect for seller so we can limit its fields
      .leftJoin('product.seller', 'seller')
      .addSelect('seller.id')
      .addSelect('seller.stripeConnectAccountId')
      .where('commitment.id = :id', { id }) // need to use different param names (cannot have two :id) according to docs
      // https://typeorm.io/select-query-builder#important-note-when-using-the-querybuilder
      .getOne();

    if (!commitment) {
      throw new NotFoundException('Commitment does not exist!');
    }
    return commitment;
  }

  async findAllByListingId(
    sellerId: string,
    listingId: string,
    manager?: EntityManager,
  ) {
    // find all commitments that are tied to the seller's listing
    // return await this.commitmentRepository.find({
    //   where: {
    //     listing: {
    //       id: listingId,
    //       product: {
    //         seller: {
    //           id: sellerId,
    //         },
    //       },
    //     },
    //   },
    //   select: {
    //     buyer: {
    //       id: true,
    //     },
    //     listing: includeListing && {
    //       id: true,
    //       product: {
    //         seller: {
    //           id: true,
    //         },
    //       },
    //     },
    //   },
    //   relations: {
    //     buyer: true,
    //     listing: true,
    //   },
    // });

    const repo = manager
      ? manager
          .getRepository(Commitment)
          .createQueryBuilder('commitment')
          .setLock('pessimistic_write')
      : this.commitmentRepository.createQueryBuilder('commitment');

    return await repo
      .leftJoin('commitment.buyer', 'buyer')
      .addSelect('buyer.id')
      .addSelect('buyer.email')
      .leftJoinAndSelect('commitment.listing', 'listing')
      .leftJoinAndSelect('listing.product', 'product')
      // Join seller, but don't use leftJoinAndSelect for seller so we can limit its fields
      .leftJoin('product.seller', 'seller')
      .addSelect('seller.id')
      .addSelect('seller.stripeConnectAccountId')
      .where('listing.id = :id', { id: listingId })
      .andWhere('seller.id = :sid', { sid: sellerId }) // need to use different param names (cannot have two :id) according to docs
      // https://typeorm.io/select-query-builder#important-note-when-using-the-querybuilder
      .getMany();
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
    const commitment = await this.findOne(id, manager);

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
    const commitment = await this.findOne(id, manager);

    if (commitment.buyer.id !== buyerId) {
      throw new ForbiddenException(
        'This commitment does not belong to this buyer!',
      );
    }
    if (commitment.listing.deadline.getTime() < Date.now()) {
      // this listing window has closed, so commitment must be locked
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

  async closeExpiredCommitment(id: string) {
    // close expired commitment when:
    // 1. the listing locked (met min threshold) and notifications have been sent out to the user of the commitment
    // 2. listing expired
    await this.commitmentRepository.manager.transaction(async (manager) => {
      await manager.getRepository(Commitment).update(
        {
          id,
        },
        {
          expired: true,
        },
      );
    });
  }

  private async findOneWithLock(
    manager: EntityManager,
    id: string,
  ): Promise<Commitment> {
    const commitment = await manager
      .getRepository(Commitment)
      .createQueryBuilder('commitment')
      .innerJoin('commitment.buyer', 'buyer')
      .addSelect('buyer.id')
      .innerJoinAndSelect('commitment.listing', 'listing')
      .innerJoinAndSelect('listing.product', 'product')
      // Join seller, but don't use leftJoinAndSelect for seller so we can limit its fields
      .innerJoin('product.seller', 'seller')
      .addSelect('seller.id')
      .addSelect('seller.stripeConnectAccountId')
      .where('commitment.id = :id', { id }) // need to use different param names (cannot have two :id) according to docs
      // https://typeorm.io/select-query-builder#important-note-when-using-the-querybuilder
      .setLock('pessimistic_write')
      .getOne();

    if (!commitment) {
      throw new NotFoundException('Commitment does not exist!');
    }

    return commitment;
  }
}

import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProductListing } from './entities/product-listing.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { ProductsService } from './products/products.service';
import { InjectQueue } from '@nestjs/bullmq';
import { LISTING_BMQ } from '@app/common/bullmq/bullmq.constant';
import { Queue } from 'bullmq';
import Decimal from 'decimal.js';

@Injectable()
export class ListingsService {
  constructor(
    @InjectRepository(ProductListing)
    private readonly productListingRepository: Repository<ProductListing>,
    private readonly productService: ProductsService,
    @InjectQueue(LISTING_BMQ) private readonly listingQueue: Queue,
  ) {}
  async create(sellerId: string, createListingDto: CreateListingDto) {
    // find the product from productId and confirm if it's from the same seller
    return await this.productListingRepository.manager.transaction(
      async (manager) => {
        try {
          // TODO: use current manager for productService findOneWithLock
          await this.productService.findOne(
            sellerId,
            createListingDto.productId,
            manager,
          );
        } catch {
          throw new ForbiddenException(
            'Product in this listing does not belong to this seller!',
          );
        }

        const tempListing = manager.getRepository(ProductListing).create({
          ...createListingDto,
          deadline: new Date(createListingDto.deadline),
          product: {
            id: createListingDto.productId,
          },
        });
        const listing = await manager
          .getRepository(ProductListing)
          .save(tempListing);
        // send out an event to queue to close the listing when deadline is met
        await this.listingQueue.add(
          'closeListing',
          {
            id: listing.id,
            sellerId,
          },
          {
            delay: listing.deadline.getTime() - Date.now(),
            jobId: `closeListing_${listing.id}`,
            removeOnComplete: true,
            removeOnFail: false,
          },
        );
        return listing;
      },
    );
  }

  async findAll(sellerId: string) {
    // return await this.productListingRepository.find({
    //   where: {
    //     expired: false,
    //     product: {
    //       seller: {
    //         id: sellerId,
    //       },
    //     },
    //   },
    //   select: {
    //     product: {
    //       id: true,
    //       seller: {
    //         id: true,
    //       },
    //     },
    //   },
    //   relations: {
    //     product: {
    //       seller: true,
    //     },
    //   },
    // });
    return await this.productListingRepository
      .createQueryBuilder('listing')
      .leftJoin('listing.product', 'product')
      .addSelect('product.id')
      .addSelect('product.seller')
      // Join seller, but don't use leftJoinAndSelect for seller so we can limit its fields
      .leftJoin('product.seller', 'seller')
      .addSelect('seller.id')
      .where('seller.id = :id', { id: sellerId })
      .andWhere('listing.expired = :expired', { expired: false })
      .getMany();
  }

  async findOne(id: string) {
    // const listing = await this.productListingRepository.findOne({
    //   where: {
    //     id,
    //     expired: false,
    //   },
    //   select: {
    //     product: {
    //       id: true,
    //       seller: {
    //         id: true,
    //       },
    //     },
    //   },
    //   relations: {
    //     product: {
    //       seller: true,
    //     },
    //   },
    // });

    const listing = await this.productListingRepository
      .createQueryBuilder('listing')
      .leftJoin('listing.product', 'product')
      .addSelect('product.id')
      .addSelect('product.seller')
      // Join seller, but don't use leftJoinAndSelect for seller so we can limit its fields
      .leftJoin('product.seller', 'seller')
      .addSelect('seller.id')
      .where('listing.id = :id', { id })
      .andWhere('listing.expired = :expired', { expired: false })
      .getOne();

    if (!listing) {
      throw new NotFoundException('Product listing does not exist!');
    }

    // if (listing.product.seller.id !== sellerId) {
    //   throw new ForbiddenException(
    //     'Product in this listing does not belong to this seller!',
    //   );
    // }

    return listing;
  }

  async update(
    sellerId: string,
    id: string,
    updateListingDto: UpdateListingDto,
  ) {
    await this.productListingRepository.manager.transaction(async (manager) => {
      await this.findOneWithLock(manager, id);

      await manager.getRepository(ProductListing).update(
        {
          id,
        },
        {
          ...updateListingDto,
          ...(updateListingDto.productId && {
            product: {
              id: updateListingDto.productId,
            },
          }),
        },
      );

      return this.findOne(id);
    });
  }

  async remove(sellerId: string, id: string) {
    await this.productListingRepository.manager.transaction(async (manager) => {
      const listing = await this.findOneWithLock(manager, id);

      if (listing.product.seller.id !== sellerId) {
        throw new ForbiddenException(
          'This listing does not belong to this seller!',
        );
      }

      const job = await this.listingQueue.getJob(`closeListing_${id}`);
      await job?.remove();
      await manager.getRepository(ProductListing).remove(listing);
    });
  }

  async closeListing(sellerId: string, id: string) {
    // check if listing exist in database
    // TODO: find one that is not locked and not expired
    await this.findOne(id);
    // if exist, close the listing
    await this.listingQueue.add(
      'closeListing',
      {
        id,
        sellerId,
      },
      {
        jobId: `closeListing_${id}`,
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
  }

  async closeExpiredListing(id: string) {
    await this.productListingRepository.manager.transaction(async (manager) => {
      await manager.getRepository(ProductListing).update(
        {
          id,
        },
        {
          expired: true,
        },
      );
    });
  }

  async lockListing(id: string) {
    await this.productListingRepository.manager.transaction(async (manager) => {
      const listing = await manager
        .getRepository(ProductListing)
        .createQueryBuilder('product_listing')
        .setLock('pessimistic_write')
        .select(['product_listing.id', 'product_listing.locked']) // Only select what you need
        .where('product_listing.id = :id', { id })
        .getOne();

      if (!listing) {
        throw new Error('Product listing not found');
      }

      listing.locked = true;
      await manager.getRepository(ProductListing).save(listing);
    });
  }

  async setListingFinalPrice(
    id: string,
    totalCommitments: number,
    minThreshold: number,
  ): Promise<void> {
    await this.productListingRepository.manager.transaction(async (manager) => {
      // check if product listing exist and set a lock
      const listing = await manager
        .getRepository(ProductListing)
        .createQueryBuilder('product_listing')
        .setLock('pessimistic_write')
        .select([
          'product_listing.id',
          'product_listing.proposedPrice',
          'product_listing.finalPrice',
        ]) // Only select what you need
        .where('product_listing.id = :id', { id })
        .getOne();

      if (!listing) {
        throw new Error('Product listing not found');
      }

      // set final price
      listing.finalPrice = listing.proposedPrice
        .times((minThreshold / totalCommitments) * 100)
        .round()
        .div(100);

      await manager.getRepository(ProductListing).save(listing);
    });
  }

  getHello(): string {
    return 'Hello World!';
  }

  private async findOneWithLock(
    manager: EntityManager,
    id: string,
  ): Promise<ProductListing> {
    const listing = await manager
      .getRepository(ProductListing)
      .createQueryBuilder('listing')
      .leftJoin('listing.product', 'product')
      .addSelect('product.id')
      .addSelect('product.seller')
      // Join seller, but don't use leftJoinAndSelect for seller so we can limit its fields
      .leftJoin('product.seller', 'seller')
      .addSelect('seller.id')
      .where('listing.id = :id', { id })
      .andWhere('listing.expired = :expired', { expired: false })
      .setLock('pessimistic_write')
      .getOne();

    if (!listing) {
      throw new NotFoundException('Product listing does not exist!');
    }

    return listing;
  }
}

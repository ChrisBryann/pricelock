import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { EntityManager, Repository } from 'typeorm';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}
  async create(sellerId: string, createProductDto: CreateProductDto) {
    const product = this.productRepository.create({
      ...createProductDto,
      seller: {
        id: sellerId,
      },
    });
    return await this.productRepository.save(product);
  }

  async findAll(
    sellerId: string,
    manager?: EntityManager,
    lock: boolean = false,
  ) {
    const repo = manager
      ? manager.getRepository(Product)
      : this.productRepository;

    let query = repo
      .createQueryBuilder('product')
      .innerJoin('product.seller', 'seller')
      .addSelect('seller.id')
      .where('seller.id = :sellerId', { sellerId });

    if (lock) {
      query = query.setLock('pessimistic_write');
    }

    return await query.getMany();
  }

  async findOne(
    sellerId: string,
    id: string,
    manager?: EntityManager,
    lock: boolean = false,
  ) {
    const repo = manager
      ? manager.getRepository(Product)
      : this.productRepository;
    let query = repo
      .createQueryBuilder('product')
      .innerJoin('product.seller', 'seller')
      .addSelect('seller.id')
      .where('product.id = :id', { id })
      .andWhere('seller.id = :sellerId', { sellerId });
    if (lock) {
      query = query.setLock('pessimistic_write');
    }

    const product = await query.getOne();

    if (!product) {
      throw new NotFoundException('Product does not exist!');
    }

    return product;
  }

  private async updateProductWithLock(
    sellerId: string,
    id: string,
    updateProductDto: UpdateProductDto,
    manager: EntityManager,
  ) {
    await this.findOne(sellerId, id, manager, true);

    await manager.getRepository(Product).update(
      {
        id,
      },
      updateProductDto,
    );
  }

  async update(
    sellerId: string,
    id: string,
    updateProductDto: UpdateProductDto,
    manager?: EntityManager,
  ) {
    if (manager) {
      await this.updateProductWithLock(sellerId, id, updateProductDto, manager);
    } else {
      await this.productRepository.manager.transaction(async (manager) => {
        await this.updateProductWithLock(
          sellerId,
          id,
          updateProductDto,
          manager,
        );
      });
    }

    return await this.findOne(sellerId, id);
  }

  private async removeProductWithLock(
    sellerId: string,
    id: string,
    manager?: EntityManager,
  ) {
    await manager
      .getRepository(Product)
      .remove(await this.findOne(sellerId, id, manager, true));
  }

  async remove(sellerId: string, id: string, manager?: EntityManager) {
    if (manager) {
      await this.removeProductWithLock(sellerId, id, manager);
    } else {
      await this.productRepository.manager.transaction(async (manager) => {
        await this.removeProductWithLock(sellerId, id, manager);
      });
    }
  }
}

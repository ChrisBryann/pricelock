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

  async findAll(sellerId: string) {
    return await this.productRepository.find({
      where: {
        seller: {
          id: sellerId,
        },
      },
      select: {
        seller: {
          id: true,
        },
      },
      relations: {
        seller: true,
      },
    });
  }

  async findOne(sellerId: string, id: string, manager?: EntityManager) {
    const repo = manager
      ? manager.getRepository(Product)
      : this.productRepository;
    const product = await repo.findOne({
      where: {
        id,
        seller: {
          id: sellerId,
        },
      },
      select: {
        seller: {
          id: true,
        },
      },
      relations: {
        seller: true,
      },
      ...(manager && {
        lock: {
          mode: 'pessimistic_write',
        },
      }),
    });

    if (!product) {
      throw new NotFoundException('Product does not exist!');
    }

    return product;
  }

  async update(
    sellerId: string,
    id: string,
    updateProductDto: UpdateProductDto,
  ) {
    await this.findOne(sellerId, id);

    await this.productRepository.update(
      {
        id,
      },
      updateProductDto,
    );

    return await this.findOne(sellerId, id);
  }

  async remove(sellerId: string, id: string) {
    await this.productRepository.remove(await this.findOne(sellerId, id));
  }
}

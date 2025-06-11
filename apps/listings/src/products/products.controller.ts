import { Controller } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { MessagePattern, Payload } from '@nestjs/microservices';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @MessagePattern({ cmd: 'createProduct' })
  async create(
    @Payload('userId') userId: string,
    @Payload('createProductDto') createProductDto: CreateProductDto,
  ) {
    return await this.productsService.create(userId, createProductDto);
  }

  @MessagePattern({ cmd: 'getAllProducts' })
  async findAll(@Payload('userId') userId: string) {
    return await this.productsService.findAll(userId);
  }

  @MessagePattern({ cmd: 'getProductById' })
  async findOne(@Payload('userId') userId: string, @Payload('id') id: string) {
    return await this.productsService.findOne(userId, id);
  }

  @MessagePattern({ cmd: 'updateProductById' })
  async update(
    @Payload('userId') userId: string,
    @Payload('id') id: string,
    @Payload('updateProductDto') updateProductDto: UpdateProductDto,
  ) {
    return await this.productsService.update(userId, id, updateProductDto);
  }

  @MessagePattern({ cmd: 'deleteProductById' })
  async remove(@Payload('userId') userId: string, @Payload('id') id: string) {
    await this.productsService.remove(userId, id);
  }
}

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  UseGuards,
  Inject,
} from '@nestjs/common';
import { AuthGatewayGuard } from '@app/common/auth-gateway/auth-gateway.guard';
import { CurrentUserDecorator } from '@app/common/decorators/current-user.decorator';
import { PublicUser } from 'apps/users/src/entities/user.entity';
import { LISTINGS_MICROSERVICE } from '../../../../libs/common/src/constants/gateway.constant';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { CreateProductDto } from 'apps/listings/src/products/dto/create-product.dto';
import { UpdateProductDto } from 'apps/listings/src/products/dto/update-product.dto';

@UseGuards(AuthGatewayGuard)
@Controller('products')
export class ProductsController {
  constructor(
    @Inject(LISTINGS_MICROSERVICE)
    private readonly listingsMicroservice: ClientProxy,
  ) {}

  @Post()
  async create(
    @CurrentUserDecorator() user: PublicUser,
    @Body() createProductDto: CreateProductDto,
  ) {
    return await firstValueFrom(
      this.listingsMicroservice.send(
        { cmd: 'createProduct' },
        {
          userId: user.id,
          createProductDto,
        },
      ),
    );
  }

  @Get()
  async findAll(@CurrentUserDecorator() user: PublicUser) {
    return await firstValueFrom(
      this.listingsMicroservice.send(
        { cmd: 'getAllProducts' },
        {
          userId: user.id,
        },
      ),
    );
  }

  @Get(':id')
  async findOne(
    @CurrentUserDecorator() user: PublicUser,
    @Param('id') id: string,
  ) {
    return await firstValueFrom(
      this.listingsMicroservice.send(
        { cmd: 'getProductById' },
        {
          userId: user.id,
          id,
        },
      ),
    );
  }

  @Put(':id')
  async update(
    @CurrentUserDecorator() user: PublicUser,
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return await firstValueFrom(
      this.listingsMicroservice.send(
        { cmd: 'updateProductById' },
        {
          userId: user.id,
          id,
          updateProductDto,
        },
      ),
    );
  }

  @Delete(':id')
  async remove(
    @CurrentUserDecorator() user: PublicUser,
    @Param('id') id: string,
  ) {
    return await firstValueFrom(
      this.listingsMicroservice.send(
        { cmd: 'deleteProductById' },
        {
          userId: user.id,
          id,
        },
      ),
      {
        defaultValue: null, // since deleteProductById tcp route doesn't return anything when successful, firstValueFrom rejects and throws error because nothing is returned
        // therefore, set defaultValue to null so that it returns nothing to user and gives 201 OK
      },
    );
  }
}

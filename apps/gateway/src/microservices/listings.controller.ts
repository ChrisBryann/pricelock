import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { CurrentUserDecorator } from '@app/common/decorators/current-user.decorator';
import { PublicUser } from 'apps/users/src/entities/user.entity';
import { AuthGatewayGuard } from '@app/common/auth-gateway/auth-gateway.guard';
import { CreateListingDto } from 'apps/listings/src/dto/create-listing.dto';
import { UpdateListingDto } from 'apps/listings/src/dto/update-listing.dto';
import { LISTINGS_MICROSERVICE } from '../../../../libs/common/src/constants/gateway.constant';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@UseGuards(AuthGatewayGuard)
@Controller('listings')
export class ListingsController {
  constructor(
    @Inject(LISTINGS_MICROSERVICE)
    private readonly listingsMicroservice: ClientProxy,
  ) {}

  @Get('hello')
  async getHello(): Promise<string> {
    return await firstValueFrom(
      this.listingsMicroservice.send({ cmd: 'getHello' }, {}),
    );
  }

  @Post()
  async create(
    @CurrentUserDecorator() user: PublicUser,
    @Body() createListingDto: CreateListingDto,
  ) {
    return await firstValueFrom(
      this.listingsMicroservice.send(
        { cmd: 'createListing' },
        {
          userId: user.id,
          createListingDto,
        },
      ),
    );
  }

  @Get()
  async findAll(@CurrentUserDecorator() user: PublicUser) {
    return await firstValueFrom(
      this.listingsMicroservice.send(
        { cmd: 'getAllListings' },
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
        { cmd: 'getListingById' },
        {
          id,
        },
      ),
    );
  }

  @Put(':id')
  async update(
    @CurrentUserDecorator() user: PublicUser,
    @Param('id') id: string,
    @Body() updateListingDto: UpdateListingDto,
  ) {
    return await firstValueFrom(
      this.listingsMicroservice.send(
        {
          cmd: 'updateListingById',
        },
        {
          userId: user.id,
          id,
          updateListingDto,
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
        {
          cmd: 'deleteListingById',
        },
        {
          userId: user.id,
          id,
        },
      ),
      {
        defaultValue: null,
      },
    );
  }

  @Put(':id/close')
  async closeListing(
    @CurrentUserDecorator() user: PublicUser,
    @Param('id') id: string,
  ) {
    return await firstValueFrom(
      this.listingsMicroservice.send(
        {
          cmd: 'closeListingById',
        },
        {
          userId: user.id,
          id,
        },
      ),
      {
        defaultValue: null,
      },
    );
  }
}

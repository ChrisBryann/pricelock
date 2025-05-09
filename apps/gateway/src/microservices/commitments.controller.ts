import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AuthGatewayGuard } from '@app/common/auth-gateway/auth-gateway.guard';
import { CurrentUserDecorator } from '@app/common/decorators/current-user.decorator';
import { PublicUser } from 'apps/users/src/entities/user.entity';
import { CreateCommitmentDto } from 'apps/commitments/src/dto/create-commitment.dto';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { UpdateCommitmentDto } from 'apps/commitments/src/dto/update-commitment.dto';

@UseGuards(AuthGatewayGuard)
@Controller('commitments')
export class CommitmentsController {
  constructor(
    @Inject('COMMITMENTS_SERVICE')
    private readonly commitmentsMicroservice: ClientProxy,
  ) {}

  @Get()
  async getHello(): Promise<string> {
    return await firstValueFrom(
      this.commitmentsMicroservice.send({ cmd: 'getHello' }, {}),
    );
  }

  @Post()
  async create(
    @CurrentUserDecorator() user: PublicUser,
    @Body() createCommitmentDto: CreateCommitmentDto,
  ) {
    return await firstValueFrom(
      this.commitmentsMicroservice.send(
        { cmd: 'createCommitment' },
        {
          userId: user.id,
          createCommitmentDto,
        },
      ),
    );
  }

  @Get('/listing/:listingId') // for seller and admins
  async findAllByListingId(
    @CurrentUserDecorator() user: PublicUser,
    @Param('listingId') listingId: string,
  ) {
    return await firstValueFrom(
      this.commitmentsMicroservice.send(
        { cmd: 'findAllByListingId' },
        {
          userId: user.id,
          listingId,
        },
      ),
    );
  }

  @Get(':id')
  async findCommitmentById(@Param('id') id: string) {
    return await firstValueFrom(
      this.commitmentsMicroservice.send(
        { cmd: 'findCommitmentById' },
        {
          id,
        },
      ),
    );
  }

  @Get('status/:listingId') // for seller and admins
  async getAggregatedDataByListingId(
    @CurrentUserDecorator() user: PublicUser,
    @Param('listingId') listingId: string,
  ) {
    return await firstValueFrom(
      this.commitmentsMicroservice.send(
        { cmd: 'getAggregatedDataByListingId' },
        {
          userId: user.id,
          listingId,
        },
      ),
      {
        defaultValue: null,
      },
    );
  }

  @Put(':id') // for buyer and admins only
  async updateCommitment(
    @Param('id') id: string,
    @Body() updateCommitmentDto: UpdateCommitmentDto,
  ) {
    return await firstValueFrom(
      this.commitmentsMicroservice.send(
        { cmd: 'updateCommitment' },
        {
          id,
          quantity: updateCommitmentDto.quantity,
        },
      ),
    );
  }

  @Put(':id/cancel')
  async cancelCommitment(
    @CurrentUserDecorator() user: PublicUser,
    @Param('id') id: string,
  ) {
    return await firstValueFrom(
      this.commitmentsMicroservice.send(
        { cmd: 'cancelCommitment' },
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

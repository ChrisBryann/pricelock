import { Controller } from '@nestjs/common';
import { CommitmentsService } from './commitments.service';
import { CreateCommitmentDto } from './dto/create-commitment.dto';
import { MessagePattern, Payload } from '@nestjs/microservices';

@Controller('commitments')
export class CommitmentsController {
  constructor(private readonly commitmentsService: CommitmentsService) {}

  @MessagePattern({ cmd: 'getHello' })
  getHello(): string {
    return this.commitmentsService.getHello();
  }

  @MessagePattern({ cmd: 'createCommitment' })
  async create(
    @Payload('userId') userId: string,
    @Payload('createCommitmentDto') createCommitmentDto: CreateCommitmentDto,
  ) {
    return await this.commitmentsService.create(userId, createCommitmentDto);
  }

  @MessagePattern({ cmd: 'findAllByListingId' })
  async findAllByListingId(
    @Payload('userId') userId: string,
    @Payload('listingId') listingId: string,
  ) {
    return await this.commitmentsService.findAllByListingId(userId, listingId);
  }

  @MessagePattern({ cmd: 'findCommitmentById' })
  async getCommitmentById(@Payload('id') id: string) {
    return await this.commitmentsService.findOne(id);
  }

  @MessagePattern({ cmd: 'getAggregatedDataByListingId' })
  async getAggregatedDataByListingId(
    @Payload('userId') userId: string,
    @Payload('listingId') listingId: string,
  ) {
    return await this.commitmentsService.getAggregatedDataByListingId(
      userId,
      listingId,
    );
  }

  @MessagePattern({ cmd: 'updateCommitment' })
  async updateCommitment(
    @Payload('id') id: string,
    @Payload('quantity') quantity: number,
  ) {
    return await this.commitmentsService.updateCommitment(id, quantity);
  }

  @MessagePattern({ cmd: 'cancelCommitment' })
  async cancelCommitment(
    @Payload('userId') userId: string,
    @Payload('id') id: string,
  ) {
    await this.commitmentsService.cancelCommitment(userId, id);
  }
}

import { Controller } from '@nestjs/common';
import { ListingsService } from './listings.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { MessagePattern, Payload } from '@nestjs/microservices';

@Controller('listings')
export class ListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  @MessagePattern({ cmd: 'getHello' })
  getHello(): string {
    return this.listingsService.getHello();
  }

  @MessagePattern({ cmd: 'createListing' })
  async create(
    @Payload('userId') userId: string,
    @Payload('createListingDto') createListingDto: CreateListingDto,
  ) {
    return await this.listingsService.create(userId, createListingDto);
  }

  @MessagePattern({ cmd: 'getAllListings' })
  async findAll(@Payload('userId') userId: string) {
    return await this.listingsService.findAll(userId);
  }

  @MessagePattern({ cmd: 'getListingById' })
  async findOne(@Payload('id') id: string) {
    return await this.listingsService.findOne(id);
  }

  @MessagePattern({ cmd: 'updateListingById' })
  async update(
    @Payload('userId') userId: string,
    @Payload('id') id: string,
    @Payload('updateListingDto') updateListingDto: UpdateListingDto,
  ) {
    return await this.listingsService.update(userId, id, updateListingDto);
  }

  @MessagePattern({ cmd: 'deleteListingById' })
  async remove(@Payload('userId') userId: string, @Payload('id') id: string) {
    await this.listingsService.remove(userId, id);
  }

  @MessagePattern({ cmd: 'closeListingById' })
  async closeListing(
    @Payload('userId') userId: string,
    @Payload('id') id: string,
  ) {
    await this.listingsService.closeListing(userId, id);
  }

  @MessagePattern({ cmd: 'setListingFinalPrice' })
  async setListingFinalPrice(
    @Payload('id') id: string,
    @Payload('totalCommitments') totalCommitments: number,
    @Payload('minThreshold') minThreshold: number,
  ) {
    await this.listingsService.setListingFinalPrice(
      id,
      totalCommitments,
      minThreshold,
    );
  }

  // @MessagePattern({ cmd: 'lockListing' })
  // async lockListing(@Payload('id') id: string) {
  //   await this.listingsService.lockListing(id);
  // }

  @MessagePattern({ cmd: 'closeExpiredListing' })
  async closeExpiredListing(@Payload('id') id: string) {
    await this.listingsService.closeExpiredListing(id);
  }
}

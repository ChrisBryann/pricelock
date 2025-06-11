import { PartialType } from '@nestjs/mapped-types';
import { CreateListingDto } from './create-listing.dto';
import { IsNumber, IsOptional } from 'class-validator';

export class UpdateListingDto extends PartialType(CreateListingDto) {
  @IsOptional()
  @IsNumber()
  finalPrice?: number;
}

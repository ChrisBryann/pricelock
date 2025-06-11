import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateListingDto {
  @IsString()
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @IsNumber()
  @IsNotEmpty()
  proposedPrice: number;

  @IsNumber()
  @IsNotEmpty()
  minThreshold: number;

  @IsDateString()
  @IsNotEmpty()
  deadline: string;

  @IsBoolean()
  @IsOptional()
  locked?: boolean;
}

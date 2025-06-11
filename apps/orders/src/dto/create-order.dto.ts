import { OrderStatus } from '@app/common/enums/order-status.enum';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateOrderDto {
  @IsString()
  @IsUUID()
  @IsNotEmpty()
  commitmentId: string;

  @IsString()
  @IsUUID()
  @IsNotEmpty()
  buyerId: string;

  @IsNumber()
  @IsNotEmpty()
  price: number;

  @IsDateString()
  @IsNotEmpty()
  lockedAt: string;

  @IsString()
  @IsNotEmpty()
  shippingAddress: string;

  @IsEnum(OrderStatus)
  @IsString()
  @IsNotEmpty()
  status: OrderStatus;
}

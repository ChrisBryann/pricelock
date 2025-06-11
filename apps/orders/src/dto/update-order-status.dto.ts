import { OrderStatus } from '@app/common/enums/order-status.enum';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  @IsString()
  @IsNotEmpty()
  status: OrderStatus;
}

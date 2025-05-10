import { IsNotEmpty, IsNumber } from 'class-validator';

export class UpdateCommitmentDto {
  @IsNumber()
  @IsNotEmpty()
  quantity: number;
}

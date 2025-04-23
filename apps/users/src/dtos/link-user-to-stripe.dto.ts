import { IsNotEmpty, IsString } from 'class-validator';

export class LinkUserToStripeDto {
  @IsString()
  @IsNotEmpty()
  stripeConnectAccountId: string;

  @IsString()
  @IsNotEmpty()
  refreshUrl: string;

  @IsString()
  @IsNotEmpty()
  returnUrl: string;
}

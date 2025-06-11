import { UserRoles } from '@app/common';
import { IsEnum, IsOptional, IsPhoneNumber, IsString } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  name: string;

  @IsString()
  @IsPhoneNumber('US')
  phone: string;

  @IsString()
  @IsEnum(UserRoles)
  @IsOptional()
  role: UserRoles;
}

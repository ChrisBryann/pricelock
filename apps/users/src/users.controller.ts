import { Controller } from '@nestjs/common';
import { UsersService } from './users.service';
import { PublicUser, User } from './entities/user.entity';
import { UpdateUserDto } from './dtos/update-user.dto';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { LinkUserToStripeDto } from './dtos/link-user-to-stripe.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @MessagePattern({ cmd: 'getAllUsers' })
  async getAllUsers(): Promise<PublicUser[]> {
    return await this.usersService.getAllUsers();
  }

  // @MessagePattern({ cmd: 'getCurrentUser' })
  // async getCurrentUser(
  //   @CurrentUserDecorator() user: PublicUser,
  // ): Promise<User | PublicUser> {
  //   return await this.usersService.getUserById(user.id);
  // }

  // @MessagePattern({ cmd: 'updateCurrentUser' })
  // async updateCurrentUser(
  //   @CurrentUserDecorator() user: PublicUser,
  //   @Body() updateUserDto: UpdateUserDto,
  // ): Promise<PublicUser> {
  //   return await this.usersService.updateUserById(user.id, updateUserDto);
  // }

  // @MessagePattern({ cmd: 'deleteCurrentUser' })
  // async deleteCurrentUser(
  //   @CurrentUserDecorator() user: PublicUser,
  // ): Promise<void> {
  //   await this.usersService.deleteUserById(user.id);
  // }

  @MessagePattern({ cmd: 'getUserById' })
  async getUserById(@Payload('id') id: string): Promise<User | PublicUser> {
    return await this.usersService.getUserById(id);
  }

  @MessagePattern({ cmd: 'updateUserById' })
  async updateUserById(
    @Payload('id') id: string,
    @Payload('updateUserDto') updateUserDto: UpdateUserDto,
  ): Promise<PublicUser> {
    return await this.usersService.updateUserById(id, updateUserDto);
  }

  @MessagePattern({ cmd: 'deleteUserById' })
  async deleteUserById(@Payload('id') id: string): Promise<void> {
    await this.usersService.deleteUserById(id);
  }

  @MessagePattern({ cmd: 'linkUserToStripeAccount' })
  async linkUserToStripeAccount(
    @Payload('id') id: string,
    @Payload('linkUserToStripeDto') linkUserToStripeDto: LinkUserToStripeDto,
    // combine stripeConnectAccountId, refresh and return url payload into one DTO
  ): Promise<void> {
    return await this.usersService.linkUserToStripeAccount(
      id,
      linkUserToStripeDto,
    );
  }
}

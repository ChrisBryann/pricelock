import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUserDecorator } from '@app/common/decorators/current-user.decorator';
import { AuthGatewayGuard } from '@app/common/auth-gateway/auth-gateway.guard';
import { PublicUser, User } from 'apps/users/src/entities/user.entity';
import { UpdateUserDto } from 'apps/users/src/dtos/update-user.dto';
import { USERS_MICROSERVICE } from '../../../../libs/common/src/constants/gateway.constant';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { LinkUserToStripeDto } from 'apps/users/src/dtos/link-user-to-stripe.dto';

@UseGuards(AuthGatewayGuard)
@Controller('users')
export class UsersController {
  constructor(
    @Inject(USERS_MICROSERVICE) private readonly usersMicroservice: ClientProxy,
  ) {}

  @Get()
  async getAllUsers(): Promise<PublicUser[]> {
    return await firstValueFrom(
      this.usersMicroservice.send({ cmd: 'getAllUsers' }, {}),
    );
  }

  @Get('/me')
  async getCurrentUser(
    @CurrentUserDecorator() user: PublicUser,
  ): Promise<User | PublicUser> {
    return await firstValueFrom(
      this.usersMicroservice.send(
        { cmd: 'getUserById' },
        {
          id: user.id,
        },
      ),
    );
  }

  @Patch('/me')
  async updateCurrentUser(
    @CurrentUserDecorator() user: PublicUser,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<PublicUser> {
    return await firstValueFrom(
      this.usersMicroservice.send(
        { cmd: 'updateUserById' },
        {
          id: user.id,
          updateUserDto,
        },
      ),
    );
  }

  @Delete('/me')
  async deleteCurrentUser(
    @CurrentUserDecorator() user: PublicUser,
  ): Promise<void> {
    return await firstValueFrom(
      this.usersMicroservice.send(
        { cmd: 'deleteUserById' },
        {
          id: user.id,
        },
      ),
      {
        defaultValue: null, // since deleteUserById tcp route doesn't return anything when successful, firstValueFrom rejects and throws error because nothing is returned
        // therefore, set defaultValue to null so that it returns nothing to user and gives 201 OK
      },
    );
  }

  @Get('/:userId')
  async getUserById(
    @Param('userId') userId: string,
  ): Promise<User | PublicUser> {
    return await firstValueFrom(
      this.usersMicroservice.send(
        { cmd: 'getUserById' },
        {
          id: userId,
        },
      ),
    );
  }

  @Patch('/:userId')
  async updateUserById(
    @Param('userId') userId: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<PublicUser> {
    return await firstValueFrom(
      this.usersMicroservice.send(
        { cmd: 'updateUserById' },
        {
          id: userId,
          updateUserDto,
        },
      ),
    );
  }

  @Delete('/:userId')
  async deleteUserById(@Param('userId') userId: string): Promise<void> {
    return await firstValueFrom(
      this.usersMicroservice.send(
        { cmd: 'deleteUserById' },
        {
          id: userId,
        },
      ),
      {
        defaultValue: null, // since deleteUserById tcp route doesn't return anything when successful, firstValueFrom rejects and throws error because nothing is returned
        // therefore, set defaultValue to null so that it returns nothing to user and gives 201 OK
      },
    );
  }

  @Post('/link/stripe')
  async linkUserToStripeAccount(
    @CurrentUserDecorator() user: PublicUser,
    @Body() linkUserToStripeDto: LinkUserToStripeDto,
  ): Promise<{ url: string }> {
    return await firstValueFrom(
      this.usersMicroservice.send(
        { cmd: 'linkUserToStripeAccount' },
        {
          id: user.id,
          linkUserToStripeDto,
        },
      ),
    );
  }
}

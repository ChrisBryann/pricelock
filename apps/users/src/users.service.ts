import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PublicUser, User } from './entities/user.entity';
import { DeepPartial, Repository } from 'typeorm';
import { CryptoService } from '@app/common/crypto/crypto.service';
import { RegisterUserDto } from 'apps/auth/src/dtos/register-user.dto';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';
import { LinkUserToStripeDto } from './dtos/link-user-to-stripe.dto';
import { UserRoles } from '@app/common';

@Injectable()
export class UsersService {
  private stripe: Stripe;
  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    private readonly cryptoService: CryptoService,
    private readonly configService: ConfigService,
  ) {
    this.stripe = new Stripe(
      this.configService.getOrThrow<string>('STRIPE_SECRET_KEY'),
    );
  }

  async createUser(registerUserDto: RegisterUserDto): Promise<PublicUser> {
    try {
      await this.getUserByEmail(registerUserDto.email);
    } catch {
      return await this.usersRepository.manager.transaction(async (manager) => {
        // create a Stripe Connect Account for sellers
        const updateStripeUser: Partial<User> = {};
        if (
          registerUserDto.role === UserRoles.Seller ||
          registerUserDto.role === UserRoles.Admin
        ) {
          const stripeConnectUser = await this.stripe.accounts.create({
            controller: {
              stripe_dashboard: {
                type: 'express',
              },
              fees: {
                payer: 'application',
              },
              losses: {
                payments: 'application',
              },
            },
          });
          updateStripeUser.stripeConnectAccountId = stripeConnectUser.id;
        }
        if (
          registerUserDto.role === UserRoles.Buyer ||
          registerUserDto.role === UserRoles.Admin
        ) {
          const stripeCustomerUser = await this.stripe.customers.create({
            name: registerUserDto.name,
            email: registerUserDto.email,
            phone: registerUserDto.phone,
          });
          updateStripeUser.stripeCustomerAccountId = stripeCustomerUser.id;
        }

        const user = await manager.getRepository(User).save({
          ...registerUserDto,
          password: await this.cryptoService.hashPassword(
            registerUserDto.password,
          ),
          ...updateStripeUser,
        });
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
    }
    throw new ForbiddenException('User already exist!');
  }

  async getAllUsers(): Promise<PublicUser[]> {
    const users: User[] = await this.usersRepository.find({});
    return users.map((user) => {
      const { password, ...userWithoutPassword } = user;

      return userWithoutPassword;
    });
  }

  async getUserByEmail(
    email: string,
    includePassword: boolean = false,
  ): Promise<User | PublicUser> {
    const user = await this.usersRepository.findOneBy({ email });
    if (!user) {
      throw new NotFoundException('User not found!');
    }
    const { password, ...userWithoutPassword } = user;
    return includePassword ? user : userWithoutPassword;
  }

  async getUserById(
    userId: string,
    includePassword: boolean = false,
  ): Promise<User | PublicUser> {
    const user = await this.usersRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    const { password, ...userWithoutPassword } = user;
    return includePassword ? user : userWithoutPassword;
  }

  async updateUserById(
    userId: string,
    updateUserDto: DeepPartial<User>,
  ): Promise<PublicUser> {
    const user = await this.usersRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException('User not found!');
    }
    const { password, ...updatedUser } = await this.usersRepository.save({
      id: userId,
      ...updateUserDto,
    });
    return updatedUser;
  }

  async deleteUserById(userId: string): Promise<void> {
    const user = await this.usersRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException('User not found!');
    }
    await this.usersRepository.remove(user);
  }

  async linkUserToStripeConnectAccount(
    userId: string,
    linkUserToStripeDto: LinkUserToStripeDto,
  ): Promise<{
    url: string;
  }> {
    const accountLink = await this.stripe.accountLinks.create({
      account: linkUserToStripeDto.stripeConnectAccountId,
      refresh_url: linkUserToStripeDto.refreshUrl,
      return_url: linkUserToStripeDto.returnUrl,
      type: 'account_onboarding',
    });

    return { url: accountLink.url };
  }
  async updateUserStripeConnectAccount(
    stripeConnectAccountId: string,
    stripeConnectAccountLinked: boolean,
  ): Promise<void> {
    // update user's stripe connect account linked boolean property when
    // user has linked their stripe connect account (true) or not (false)
    await this.usersRepository.update(
      {
        stripeConnectAccountId,
      },
      {
        stripeConnectAccountLinked,
      },
    );
  }
}

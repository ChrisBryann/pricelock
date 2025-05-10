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
        // create a Stripe Connect Account
        const stripeUser = await this.stripe.accounts.create({
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
        const user = await manager.getRepository(User).save({
          ...registerUserDto,
          password: await this.cryptoService.hashPassword(
            registerUserDto.password,
          ),
          stripeConnectAccountId: stripeUser.id,
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

  async linkUserToStripeAccount(
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
  async updateUserStripeAccount(
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

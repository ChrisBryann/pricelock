import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PublicUser, User } from 'apps/users/src/entities/user.entity';
import { UsersService } from 'apps/users/src/users.service';
import { RegisterUserDto } from './dtos/register-user.dto';
import { CryptoService } from '@app/common/crypto/crypto.service';
import { ConfigService } from '@nestjs/config';
import { UserPayload } from './interfaces/user-payload.interface';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly cryptoService: CryptoService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}
  getHello(): string {
    return 'Hello World!';
  }

  async verifyUser(email: string, password: string): Promise<PublicUser> {
    const { password: userPassword, ...user } =
      (await this.usersService.getUserByEmail(email, true)) as User;
    const authenticated = await this.cryptoService.validatePassword(
      password,
      userPassword,
    );
    if (!authenticated) {
      throw new UnauthorizedException('Password does not match!');
    }
    return user;
  }

  async verifyUserRefreshToken(
    id: string,
    refreshToken: string,
  ): Promise<PublicUser> {
    const user = (await this.usersService.getUserById(id)) as PublicUser;

    const authenticated = await this.cryptoService.validateRefreshToken(
      refreshToken,
      user.refreshToken,
    );

    if (!authenticated) {
      throw new UnauthorizedException('Refresh token is not valid.');
    }
    return user;
  }

  async register(registerUserDto: RegisterUserDto) {
    return await this.usersService.createUser(registerUserDto);
  }

  async login(user: PublicUser): Promise<any> {
    const accessTokenExpires = new Date();
    accessTokenExpires.setMilliseconds(
      accessTokenExpires.getTime() +
        parseInt(
          this.configService.getOrThrow<string>(
            'JWT_ACCESS_TOKEN_EXPIRATION_MS',
          ),
        ),
    );

    const refreshTokenExpires = new Date();
    refreshTokenExpires.setMilliseconds(
      refreshTokenExpires.getTime() +
        parseInt(
          this.configService.getOrThrow<string>(
            'JWT_REFRESH_TOKEN_EXPIRATION_MS',
          ),
        ),
    );

    const payload: UserPayload = {
      id: user.id,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow<string>(
        'JWT_ACCESS_TOKEN_SECRET_KEY',
      ),
      expiresIn: `${this.configService.getOrThrow<string>('JWT_ACCESS_TOKEN_EXPIRATION_MS')}ms`,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow<string>(
        'JWT_REFRESH_TOKEN_SECRET_KEY',
      ),
      expiresIn: `${this.configService.getOrThrow<string>('JWT_REFRESH_TOKEN_EXPIRATION_MS')}ms`,
    });

    // update user's refreshToken in database with the most recent one
    this.usersService.updateUserById(user.id, {
      refreshToken: await this.cryptoService.hashRefeshToken(refreshToken),
    });

    // update user's tokenVersion in database to invalidate older version of refreshToken
    this.usersService.updateUserById(user.id, {
      tokenVersion: user.tokenVersion + 1,
    });

    return {
      accessToken,
      accessTokenExpires: accessTokenExpires.toISOString(), // need to convert date to ISO string since TCP packets cannot serialize Date objects
      refreshToken,
      refreshTokenExpires: refreshTokenExpires.toISOString(), // need to convert date to ISO string since TCP packets cannot serialize Date objects
    };

    // response.cookie('Authentication', accessToken, {
    //   httpOnly: true,
    //   expires: accessTokenExpires,
    //   secure:
    //     this.configService.getOrThrow<string>('NODE_ENV') === 'production',
    // });

    // response.cookie('Refresh', refreshToken, {
    //   httpOnly: true,
    //   expires: refreshTokenExpires,
    //   secure:
    //     this.configService.getOrThrow<string>('NODE_ENV') === 'production',
    // });
  }
}

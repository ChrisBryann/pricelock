import { Body, Controller, Get, Inject, Post, Res } from '@nestjs/common';
import { PublicUser } from 'apps/users/src/entities/user.entity';
import { Response } from 'express';
import { ClientProxy } from '@nestjs/microservices';
import { RegisterUserDto } from 'apps/auth/src/dtos/register-user.dto';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { AUTH_MICROSERVICE } from '../../../../libs/common/src/constants/gateway.constant';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AUTH_MICROSERVICE) private readonly authMicroservice: ClientProxy,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  async getHello(): Promise<string> {
    return await firstValueFrom(
      this.authMicroservice.send({ cmd: 'getHello' }, {}),
    );
  }

  @Post('register')
  async register(
    @Body() registerUserDto: RegisterUserDto,
  ): Promise<PublicUser> {
    return await firstValueFrom(
      this.authMicroservice.send({ cmd: 'register' }, registerUserDto),
    );
  }

  @Post('login')
  async login(
    @Body() loginDto: { email: string; password: string },
    @Res({ passthrough: true }) response: Response,
  ) {
    // get accessToken and refreshToken from this tcp message,
    // since login from Auth Microservice won't be able to set cookies in request
    // because we are using TCP to call the login route
    // TCP calls serializes data and response object cannot be serialized as it contains complex functions
    const {
      accessToken,
      accessTokenExpires,
      refreshToken,
      refreshTokenExpires,
    } = await firstValueFrom(
      this.authMicroservice.send(
        { cmd: 'login' },
        {
          body: loginDto,
        },
      ),
    );

    // then set Authentication cookie in request object
    response.cookie('Authentication', accessToken, {
      httpOnly: true,
      expires: new Date(accessTokenExpires),
      secure:
        this.configService.getOrThrow<string>('NODE_ENV') === 'production',
    });

    response.cookie('Refresh', refreshToken, {
      httpOnly: true,
      expires: new Date(refreshTokenExpires),
      secure:
        this.configService.getOrThrow<string>('NODE_ENV') === 'production',
    });
  }
}

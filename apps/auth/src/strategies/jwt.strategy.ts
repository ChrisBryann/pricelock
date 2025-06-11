import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { UserPayload } from '../interfaces/user-payload.interface';
import { PublicUser, User } from 'apps/users/src/entities/user.entity';
import { UsersService } from 'apps/users/src/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly usersService: UsersService,
    configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => request.cookies?.Authentication,
      ]),
      secretOrKey: configService.getOrThrow<string>(
        'JWT_ACCESS_TOKEN_SECRET_KEY',
      ),
      // passReqToCallback: true,
    });
  }

  async validate(payload: UserPayload): Promise<User | PublicUser> {
    return await this.usersService.getUserById(payload.id);
  }
}

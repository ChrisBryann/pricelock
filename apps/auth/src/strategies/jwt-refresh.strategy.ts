import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';
import { Request } from 'express';
import { UserPayload } from '../interfaces/user-payload.interface';
import { PublicUser, User } from 'apps/users/src/entities/user.entity';

export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => request?.cookies?.Refresh,
      ]),
      secretOrKey: configService.getOrThrow<string>(
        'JWT_REFRESH_TOKEN_SECRET_KEY',
      ),
      passReqToCallback: true,
    });
  }

  async validate(payload: UserPayload, request: Request): Promise<PublicUser> {
      return await this.authService.verifyUserRefreshToken(payload.id, request.cookies.Refresh);
  }
}

import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { AUTH_RMQ } from '../constants/rmq-name.constant';
import { catchError, Observable, tap } from 'rxjs';

@Injectable()
export class AuthGatewayGuard implements CanActivate {
  private readonly logger: Logger = new Logger(AuthGatewayGuard.name);
  constructor(@Inject(AUTH_RMQ) private readonly authClient: ClientProxy) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const authentication = this.getAuthentication(context);

    return this.authClient
      .send('validate_user', {
        cookies: {
          Authentication: authentication,
        },
      })
      .pipe(
        tap((res) => {
          this.addUser(res, context);
        }),
        catchError((err) => {
          this.logger.log(
            `Unauthorized request through Auth Gateway: ${JSON.stringify(err)}`,
          );
          throw new UnauthorizedException(err);
        }),
      );
  }

  private getAuthentication(context: ExecutionContext) {
    let authentication: string;
    if (context.getType() === 'rpc') {
      authentication = context.switchToRpc().getData().Authentication;
    } else if (context.getType() === 'http') {
      authentication = context.switchToHttp().getRequest()
        .cookies?.Authentication;
    }
    if (!authentication) {
      this.logger.log('No value was provided for Authentication');
      throw new UnauthorizedException(
        'No value was provided for Authentication',
      );
    }
    return authentication;
  }

  private addUser(user: any, context: ExecutionContext) {
    if (context.getType() === 'rpc') {
      context.switchToRpc().getData().user = user;
    } else if (context.getType() === 'http') {
      context.switchToHttp().getRequest().user = user;
    }
  }
}

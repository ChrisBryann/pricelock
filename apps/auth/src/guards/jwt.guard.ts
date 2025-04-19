import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JsonWebTokenError } from '@nestjs/jwt';
import { RpcException } from '@nestjs/microservices';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  // auth gateway guard does not catch this invalid token exception and just return default error
  handleRequest(err: any, user: any, info: any, context: any, status: any) {
    if (info instanceof JsonWebTokenError) {
      throw new RpcException({
        statusCode: 401,
        message: 'JWT token expired!',
      });
    }
    return super.handleRequest(err, user, info, context, status);
  }
}

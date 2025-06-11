import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {
  // Global Interceptor to throw RPC Exception does not catch errors thrown
  // inside local strategy, so have to handle errors here
  handleRequest(err: any, user: any, info: any, context: any, status: any) {
    if (err || !user) {
      throw new RpcException({
        statusCode: 401,
        message: err.message || 'User does not exist!',
      });
    }
    return user;
  }
}

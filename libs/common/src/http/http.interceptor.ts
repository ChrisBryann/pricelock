import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { catchError, Observable, throwError } from 'rxjs';

@Injectable()
export class HttpInterceptor implements NestInterceptor {
  private readonly logger: Logger = new Logger(HttpInterceptor.name);
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((err) => {
        // since we are using an API Gateway, we cannot throw HttpException (or inherited class under HttpException) across microservices
        // we need to throw RpcException since we are communicating over RPC/TCP network and since they need to serialize the error data, HttpException causes the serialization to output Internal server error instead of
        // Forbidden, NotFound, Unauthorized, etc.
        // therefore, in this interceptor, we need to catch any errors produced from calling the routes, and throw an RpcException with the status and message that we get from catching the error

        // Why Does a Global Interceptor Work?
        // A global interceptor in NestJS works at the execution level before the response is sent back to the client.
        // When you catch and rethrow an error inside an interceptor, you're still within the request-response lifecycle of the microservice.
        // This allows RpcException to properly propagate through the transport layer (e.g., gRPC, RabbitMQ, Kafka).

        // Best Practice: Use an Interceptor for Microservices
        // If you need to consistently catch errors and transform them into RpcException, use an interceptor.
        // Filters are better suited for HTTP-based applications, but interceptors work more reliably across all microservices.

        // throw new RpcException({
        //   statusCode: err.status,
        //   message: err.response.message,
        // });
        this.logger.error(err);

        return throwError(
          () =>
            new RpcException({
              statusCode: err.status || 500,
              message:
                err.response?.message ?? err.message ?? 'Internal server error',
            }),
        );
      }),
    );
  }
}

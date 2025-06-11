import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { PublicUser } from 'apps/users/src/entities/user.entity';

export const CurrentUserDecorator = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    // will this work through TCP???
    context.switchToHttp().getRequest().user as PublicUser,
);

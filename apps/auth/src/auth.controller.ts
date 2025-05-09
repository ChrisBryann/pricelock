import { Controller, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterUserDto } from './dtos/register-user.dto';
import { JwtAuthGuard } from './guards/jwt.guard';
import { LocalAuthGuard } from './guards/local.guard';
import { PublicUser } from 'apps/users/src/entities/user.entity';
import { CurrentUserDecorator } from '../../../libs/common/src/decorators/current-user.decorator';
import { MessagePattern, Payload } from '@nestjs/microservices';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @MessagePattern({ cmd: 'getHello' })
  getHello(): string {
    return this.authService.getHello();
  }

  @MessagePattern({ cmd: 'register' })
  async register(
    @Payload() registerUserDto: RegisterUserDto,
  ): Promise<PublicUser> {
    return await this.authService.register(registerUserDto);
  }

  @UseGuards(LocalAuthGuard)
  @MessagePattern({ cmd: 'login' })
  async login(@CurrentUserDecorator() user: PublicUser) {
    return await this.authService.login(user);
  }

  @UseGuards(JwtAuthGuard)
  @MessagePattern('validate_user')
  async validateUser(@CurrentUserDecorator() user: PublicUser) {
    return user;
  }
}

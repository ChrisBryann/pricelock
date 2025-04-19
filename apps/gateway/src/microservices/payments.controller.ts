import {
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { PAYMENTS_MICROSERVICE } from '../gateway.constant';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { AuthGatewayGuard } from '@app/common/auth-gateway/auth-gateway.guard';

@UseGuards(AuthGatewayGuard)
@Controller('payments')
export class PaymentsController {
  constructor(
    @Inject(PAYMENTS_MICROSERVICE)
    private readonly paymentsMicroservice: ClientProxy,
  ) {}

  //   getHello(): string {
  //     return this.paymentsService.getHello();
  //   }

  @Post('/process/:commitmentId')
  async create(
    @Param('commitmentId') commitmentId: string,
    @Req() req: Request,
  ) {
    return await firstValueFrom(
      this.paymentsMicroservice.send(
        {
          cmd: 'createPayment',
        },
        {
          commitmentId,
          origin: req.headers.origin ?? 'https://google.com',
        },
      ),
    );
  }
}

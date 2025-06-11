import {
  Controller,
  Headers,
  Inject,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { PAYMENTS_MICROSERVICE } from '../../../../libs/common/src/constants/gateway.constant';
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

  @Post('/process/:commitmentId')
  async create(
    @Param('commitmentId') commitmentId: string,
    @Headers('origin') origin: string,
  ) {
    return await firstValueFrom(
      this.paymentsMicroservice.send(
        {
          cmd: 'createPayment',
        },
        {
          commitmentId,
          origin,
        },
      ),
    );
  }

  @Post('/process/hosted/:commitmentId')
  async createHosted(
    @Param('commitmentId') commitmentId: string,
    @Res() res: Response,
  ) {
    const session_url = await firstValueFrom(
      this.paymentsMicroservice.send(
        {
          cmd: 'createHostedPayment',
        },
        {
          commitmentId,
          origin: 'https://example.com',
        },
      ),
    );

    return res.json({
      url: session_url,
    });
  }
}

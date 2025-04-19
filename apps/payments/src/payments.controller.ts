import { Controller, Get } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { MessagePattern, Payload } from '@nestjs/microservices';

@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  getHello(): string {
    return this.paymentsService.getHello();
  }

  @MessagePattern({ cmd: 'createPayment' })
  async create(
    @Payload('commitmentId') commitmentId: string,
    @Payload('origin') origin: string,
  ) {
    return await this.paymentsService.createPayment(commitmentId, origin);
  }
}

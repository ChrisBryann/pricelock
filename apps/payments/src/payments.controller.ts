import { Controller } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { MessagePattern, Payload } from '@nestjs/microservices';

@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  getHello(): string {
    return this.paymentsService.getHello();
  }

  // this is for CommitmentConsumer
  @MessagePattern({ cmd: 'findOneByCommitmentId' })
  async findOneByCommitmentId(@Payload('commitmentId') commitmentId: string) {
    return await this.paymentsService.findOneByCommitmentId(commitmentId);
  }
  // to test Stripe Payments, we will use hosted page for now
  @MessagePattern({ cmd: 'createHostedPayment' })
  async createHosted(
    @Payload('commitmentId') commitmentId: string,
    @Payload('origin') origin: string,
  ) {
    return await this.paymentsService.createHostedPayment(commitmentId, origin);
  }
}

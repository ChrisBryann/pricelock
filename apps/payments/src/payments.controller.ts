import { Controller } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import Stripe from 'stripe';

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
  // to test Stripe Payments, we will use hosted page for now
  @MessagePattern({ cmd: 'createHostedPayment' })
  async createHosted(
    @Payload('commitmentId') commitmentId: string,
    @Payload('origin') origin: string,
  ) {
    return await this.paymentsService.createHostedPayment(commitmentId, origin);
  }
  /* WEBHOOK FUNCTION CALLS */
  @MessagePattern({ cmd: 'handlePaymentSessionSuccess' })
  async handlePaymentSessionSuccess(
    @Payload('session') session: Stripe.Checkout.Session,
  ) {
    await this.paymentsService.handlePaymentSessionSuccess(session);
  }

  @MessagePattern({ cmd: 'handlePaymentSessionFail' })
  async handlePaymentSessionFail(
    @Payload('session') session: Stripe.Checkout.Session,
  ) {
    await this.paymentsService.handlePaymentSessionSuccess(session);
  }

  @MessagePattern({ cmd: 'handlePaymentIntentFail' })
  async handlePaymentIntentFail(
    @Payload('paymentIntentId') paymentIntentId: string,
  ) {
    await this.paymentsService.handlePaymentIntentFail(paymentIntentId);
  }
}

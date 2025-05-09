import { Body, Controller, Headers, Post } from '@nestjs/common';
import { StripeWebhookService } from './stripe.webhook.service';

@Controller('webhook/stripe')
export class StripeWebhookController {
  constructor(private readonly stripeWebhookService: StripeWebhookService) {}
  @Post()
  async handleDirectWebhook() {}

  @Post('/checkout')
  async handleCheckoutWebhook(
    @Body() body: Buffer,
    @Headers('stripe-signature') signature: string,
  ) {
    await this.stripeWebhookService.handleCheckoutWebhook(body, signature);
  }

  @Post('/account')
  async handleAccountWebhook(
    @Body() body: Buffer,
    @Headers('stripe-signature') signature: string,
  ) {
    await this.stripeWebhookService.handleAccountWebhook(body, signature);
  }

  @Post('/payment-intent')
  async handlePaymentIntentWebhook(
    @Body() body: Buffer,
    @Headers('stripe-signature') signature: string,
  ) {
    await this.stripeWebhookService.handlePaymentIntentWebhook(body, signature);
  }
}

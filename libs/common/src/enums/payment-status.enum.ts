export enum PaymentStatus {
  Inactive = 'inactive', // for payments with Stripe Checkout session not started yet
  Pending = 'pending',
  Success = 'success',
  Failed = 'failed',
  Expired = 'expired',
}

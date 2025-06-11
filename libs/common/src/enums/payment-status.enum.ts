export enum PaymentStatus {
  EntryExpired = 'entry_expired', // for commitments where entry fee checkout session expires
  EntryPaid = 'entry_paid', // for commitments where entry fee has been paid
  EntryFailed = 'entry_failed', // for commitments where entry fee payment checkout session failed
  Pending = 'pending', //  for commitments where a Stripe Checkout Session has been started (entry fee has been paid)
  Success = 'success',
  Failed = 'failed',
  Expired = 'expired',
}

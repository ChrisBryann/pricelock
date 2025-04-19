// BILLING/SHIPPING ADDRESS UTILITY FUNCTIONS

import Stripe from 'stripe';
/*
BASIC U.S. Address Format

JOHN SMITH              --> the addressee
305 MAIN ST S APT 612   --> Delivery address
BOSTON MA 02989         --> City name, state abbreviation, and ZIP code
UNITED STATES           -> Country name

*/
export const formatStripeAddress = (address: Stripe.Address) => {
  const firstLine = `${address.line1} ${address.line2}`;
  const secondLine = `${address.city} ${address.state} ${address.postal_code}`;
  const thirdLine = `${address.country}`;

  return [firstLine, secondLine, thirdLine].join('\n');
};

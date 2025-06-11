import Decimal from 'decimal.js';

export function calculateMaxDiscount(price: Decimal): Decimal {
  let max = 0.1,
    min = 0.05;

  if (price.greaterThanOrEqualTo(500)) {
    max = 0.45;
    min = 0.35;
  } else if (price.greaterThanOrEqualTo(200)) {
    max = 0.35;
    min = 0.25;
  } else if (price.greaterThanOrEqualTo(100)) {
    max = 0.25;
    min = 0.15;
  } else if (price.greaterThanOrEqualTo(50)) {
    max = 0.15;
    min = 0.1;
  }

  return new Decimal(Math.random()).times(max - min).plus(min);
}

export function calculateEntryFee(
  price: Decimal,
  maxDiscount: Decimal,
  platformFee: number = 0.05,
): Decimal {
  const projectedLoss = price.times(maxDiscount);
  const platformFeePrice = price.times(platformFee);
  return projectedLoss.plus(platformFeePrice);
}

export function calculateFinalPrice(
  price: Decimal,
  maxDiscount: Decimal,
  totalCommitment: number,
  minThreshold: number,
  k: number = 0.1, // decay rate constant
): Decimal {
  // USING inverse exponential decay algorithm for discount model
  // as more people commit, we want to have more discount applied to the final price
  // get the offset of how many more people than the required minimum committed
  // \text{discount}(n) = D_{\text{max}} \cdot (1 - e^{-k(n - m + 1)})
  return price.minus(
    price.times(
      maxDiscount.times(
        1 - Math.exp(-k * (totalCommitment - minThreshold + 1)),
      ),
    ),
  );
}

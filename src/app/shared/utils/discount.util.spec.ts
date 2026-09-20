import { calculateDiscountPercentage } from './discount.util';

describe('calculateDiscountPercentage', () => {
  it('returns the rounded discount between the original and the current price', () => {
    expect(calculateDiscountPercentage(100, 75)).toBe(25);
    expect(calculateDiscountPercentage(59.9, 44.93)).toBe(25);
    expect(calculateDiscountPercentage(300, 200)).toBe(33);
  });

  it('shows a discount of exactly 5% and hides anything that rounds below it', () => {
    expect(calculateDiscountPercentage(100, 95)).toBe(5);
    expect(calculateDiscountPercentage(100, 95.6)).toBeNull();
    expect(calculateDiscountPercentage(1000, 960)).toBeNull();
  });

  it('returns null when the original price is missing', () => {
    expect(calculateDiscountPercentage(undefined, 50)).toBeNull();
    expect(calculateDiscountPercentage(null, 50)).toBeNull();
    expect(calculateDiscountPercentage(0, 50)).toBeNull();
  });

  it('returns null when the original price is not above the current one', () => {
    expect(calculateDiscountPercentage(50, 50)).toBeNull();
    expect(calculateDiscountPercentage(40, 50)).toBeNull();
  });

  it('returns null for missing, negative or non-finite current prices', () => {
    expect(calculateDiscountPercentage(100, undefined)).toBeNull();
    expect(calculateDiscountPercentage(100, null)).toBeNull();
    expect(calculateDiscountPercentage(100, -1)).toBeNull();
    expect(calculateDiscountPercentage(Number.NaN, 50)).toBeNull();
    expect(calculateDiscountPercentage(Number.POSITIVE_INFINITY, 50)).toBeNull();
  });
});

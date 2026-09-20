/** Smallest whole-number discount worth advertising on cards and detail pages. */
export const MIN_DISCOUNT_PERCENTAGE = 5;

/**
 * Discount between the original and the current price, rounded to a whole
 * percentage. Returns null when there is nothing honest to show: a missing or
 * invalid price, an original price that is not above the current one, or a
 * discount below MIN_DISCOUNT_PERCENTAGE.
 */
export function calculateDiscountPercentage(
  originalPrice: number | null | undefined,
  currentPrice: number | null | undefined,
): number | null {
  if (typeof originalPrice !== 'number' || typeof currentPrice !== 'number') return null;
  if (!Number.isFinite(originalPrice) || !Number.isFinite(currentPrice)) return null;
  if (currentPrice < 0 || originalPrice <= currentPrice) return null;

  const percentage = Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
  return percentage >= MIN_DISCOUNT_PERCENTAGE ? percentage : null;
}

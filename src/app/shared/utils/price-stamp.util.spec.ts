import {
  PRICE_STAMP_STALE_AFTER_DAYS,
  formatPriceStamp,
  isPriceStampStale,
  resolvePriceStampDate,
} from './price-stamp.util';

describe('resolvePriceStampDate', () => {
  it('prefers verifiedAt over publishedAt', () => {
    const date = resolvePriceStampDate({ verifiedAt: '2026-09-20T15:00:00Z', publishedAt: '2026-09-01T10:00:00Z' });
    expect(date?.toISOString()).toBe('2026-09-20T15:00:00.000Z');
  });

  it('falls back to publishedAt when verifiedAt is empty or invalid', () => {
    expect(resolvePriceStampDate({ verifiedAt: null, publishedAt: '2026-09-01T10:00:00Z' })?.toISOString())
      .toBe('2026-09-01T10:00:00.000Z');
    expect(resolvePriceStampDate({ verifiedAt: '', publishedAt: '2026-09-01T10:00:00Z' })?.toISOString())
      .toBe('2026-09-01T10:00:00.000Z');
    expect(resolvePriceStampDate({ verifiedAt: 'lixo', publishedAt: '2026-09-01T10:00:00Z' })?.toISOString())
      .toBe('2026-09-01T10:00:00.000Z');
  });

  it('returns null when there is no usable date', () => {
    expect(resolvePriceStampDate({})).toBeNull();
    expect(resolvePriceStampDate({ verifiedAt: null, publishedAt: 'lixo' })).toBeNull();
  });
});

describe('formatPriceStamp', () => {
  it('formats as DD/MM HH:mm in Brasília time regardless of the machine timezone', () => {
    expect(formatPriceStamp(new Date('2026-09-20T17:05:00Z'))).toBe('20/09 14:05');
    expect(formatPriceStamp(new Date('2026-01-02T02:30:00Z'))).toBe('01/01 23:30');
  });
});

describe('isPriceStampStale', () => {
  const now = Date.parse('2026-09-20T12:00:00Z');
  const daysAgo = (days: number, extraMs = 0) => new Date(now - days * 86_400_000 - extraMs);

  it('uses a 7-day threshold', () => {
    expect(PRICE_STAMP_STALE_AFTER_DAYS).toBe(7);
  });

  it('is not stale up to exactly 7 days', () => {
    expect(isPriceStampStale(daysAgo(6), now)).toBeFalse();
    expect(isPriceStampStale(daysAgo(7), now)).toBeFalse();
  });

  it('is stale after more than 7 days', () => {
    expect(isPriceStampStale(daysAgo(7, 1), now)).toBeTrue();
    expect(isPriceStampStale(daysAgo(30), now)).toBeTrue();
  });
});

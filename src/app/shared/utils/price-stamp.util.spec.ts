import {
  PRICE_STAMP_STALE_AFTER_DAYS,
  formatPriceStamp,
  formatPriceStampDate,
  isPriceStampStale,
  resolvePriceStampDate,
} from './price-stamp.util';

describe('resolvePriceStampDate', () => {
  it('prefers publishedAt over createdAt', () => {
    const date = resolvePriceStampDate({ publishedAt: '2026-09-20T15:00:00Z', createdAt: '2026-09-01T10:00:00Z' });
    expect(date?.toISOString()).toBe('2026-09-20T15:00:00.000Z');
  });

  it('falls back to createdAt when publishedAt is empty or invalid', () => {
    expect(resolvePriceStampDate({ publishedAt: undefined, createdAt: '2026-09-01T10:00:00Z' })?.toISOString())
      .toBe('2026-09-01T10:00:00.000Z');
    expect(resolvePriceStampDate({ publishedAt: '', createdAt: '2026-09-01T10:00:00Z' })?.toISOString())
      .toBe('2026-09-01T10:00:00.000Z');
    expect(resolvePriceStampDate({ publishedAt: 'lixo', createdAt: '2026-09-01T10:00:00Z' })?.toISOString())
      .toBe('2026-09-01T10:00:00.000Z');
  });

  it('returns null when there is no usable date', () => {
    expect(resolvePriceStampDate({ createdAt: '' })).toBeNull();
    expect(resolvePriceStampDate({ publishedAt: undefined, createdAt: 'lixo' })).toBeNull();
  });
});

describe('formatPriceStamp', () => {
  it('formats as DD/MM HH:mm in Brasília time regardless of the machine timezone', () => {
    expect(formatPriceStamp(new Date('2026-09-20T17:05:00Z'))).toBe('20/09 14:05');
    expect(formatPriceStamp(new Date('2026-01-02T02:30:00Z'))).toBe('01/01 23:30');
  });
});

describe('formatPriceStampDate', () => {
  // Fortaleza é UTC-3 o ano todo. "now" é sempre injetado: nenhum teste depende do relógio real.
  const at = (iso: string) => new Date(iso);

  it('returns "hoje HH:mm" for the same civil day in Fortaleza', () => {
    const now = at('2026-09-20T19:40:00Z'); // 16:40 em Fortaleza
    expect(formatPriceStampDate(at('2026-09-20T19:32:00Z'), now)).toBe('hoje 16:32');
    expect(formatPriceStampDate(at('2026-09-20T13:00:00Z'), now)).toBe('hoje 10:00');
  });

  it('keeps DD/MM HH:mm for the previous day', () => {
    const now = at('2026-09-20T19:40:00Z');
    expect(formatPriceStampDate(at('2026-09-19T19:32:00Z'), now)).toBe('19/09 16:32');
  });

  it('keeps DD/MM HH:mm for a different month and year', () => {
    expect(formatPriceStampDate(at('2026-08-31T15:00:00Z'), at('2026-09-01T15:00:00Z'))).toBe('31/08 12:00');
    expect(formatPriceStampDate(at('2025-09-20T15:00:00Z'), at('2026-09-20T15:00:00Z'))).toBe('20/09 12:00');
  });

  it('flips at midnight in Fortaleza: 23:59 is still today, 00:00 of the next day is not', () => {
    const stamp = at('2026-09-20T15:00:00Z'); // 12:00 de 20/09 em Fortaleza
    expect(formatPriceStampDate(stamp, at('2026-09-21T02:59:59.999Z'))).toBe('hoje 12:00'); // agora: 23:59:59 de 20/09
    expect(formatPriceStampDate(stamp, at('2026-09-21T03:00:00Z'))).toBe('20/09 12:00'); // agora: 00:00 de 21/09
  });

  it('uses Fortaleza midnight for the stamp too (23:59 and 00:00 belong to different days)', () => {
    const now = at('2026-09-21T15:00:00Z'); // dia 21 em Fortaleza
    expect(formatPriceStampDate(at('2026-09-21T03:00:00Z'), now)).toBe('hoje 00:00'); // carimbo às 00:00 de 21/09
    expect(formatPriceStampDate(at('2026-09-21T02:59:00Z'), now)).toBe('20/09 23:59'); // carimbo às 23:59 de 20/09
  });

  it('uses the Fortaleza day, not the UTC day, when the server clock is in UTC', () => {
    // 02:30Z do dia 21 = 23:30 do dia 20 em Fortaleza: ainda é "hoje" para um carimbo do dia 20.
    const now = at('2026-09-21T02:30:00Z');
    expect(formatPriceStampDate(at('2026-09-20T18:00:00Z'), now)).toBe('hoje 15:00');
    // E um carimbo de 00:10Z do dia 21 (21:10 do dia 20 em Fortaleza) também.
    expect(formatPriceStampDate(at('2026-09-21T00:10:00Z'), now)).toBe('hoje 21:10');
    // Um carimbo do dia 19 em Fortaleza não é hoje, mesmo caindo no dia 20 em UTC.
    expect(formatPriceStampDate(at('2026-09-20T01:00:00Z'), now)).toBe('19/09 22:00');
  });

  it('passes the default time zone explicitly with the same result', () => {
    const stamp = at('2026-09-20T19:32:00Z');
    const now = at('2026-09-22T12:00:00Z');
    expect(formatPriceStampDate(stamp, now)).toBe('20/09 16:32');
    expect(formatPriceStampDate(stamp, now, 'America/Fortaleza')).toBe('20/09 16:32');
  });

  it('accepts now as epoch milliseconds', () => {
    expect(formatPriceStampDate(at('2026-09-20T19:32:00Z'), Date.parse('2026-09-20T22:00:00Z'))).toBe('hoje 16:32');
  });

  it('honors another time zone when asked', () => {
    // 02:30Z do dia 21 já é dia 21 em UTC.
    expect(formatPriceStampDate(at('2026-09-20T18:00:00Z'), at('2026-09-21T02:30:00Z'), 'UTC')).toBe('20/09 18:00');
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

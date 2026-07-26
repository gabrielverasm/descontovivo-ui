import { formatIntegerInput, parseIntegerInput } from './integer-input.util';
import { formatRatingWhileTyping, normalizeRatingInput } from './rating-input.util';
import { formatCentsToBRL, parseBRLInputToNumber } from './money-input.util';

describe('numeric input masks', () => {
  it('formats pasted currency immediately and preserves numeric cents', () => {
    const display = formatCentsToBRL('R$ abc 10990');
    expect(display).toBe('R$\u00a0109,90');
    expect(parseBRLInputToNumber(display)).toBe(109.9);
  });

  it('formats non-negative integer thousands and normalizes the payload', () => {
    expect(formatIntegerInput('53a34')).toBe('5.334');
    expect(parseIntegerInput('5.334')).toBe(5334);
    expect(formatIntegerInput('abc')).toBe('');
  });

  it('formats compact ratings during typing and rejects values over five', () => {
    expect(formatRatingWhileTyping('4')).toBe('4');
    expect(formatRatingWhileTyping('48')).toBe('4,8');
    expect(normalizeRatingInput(formatRatingWhileTyping('48'))).toBe(4.8);
    expect(formatRatingWhileTyping('51')).toBe('');
    expect(formatRatingWhileTyping('abc')).toBe('');
    expect(formatRatingWhileTyping('51', '4,8')).toBe('4,8');
    expect(formatRatingWhileTyping('abc', '4,8')).toBe('4,8');
    expect(formatRatingWhileTyping('', '4,8')).toBe('');
  });
});

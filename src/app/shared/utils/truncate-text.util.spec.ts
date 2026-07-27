import { truncateText } from './truncate-text.util';

describe('truncateText', () => {
  it('keeps text below or exactly at the limit unchanged', () => {
    expect(truncateText('Título curto', 80)).toEqual({ text: 'Título curto', truncated: false });
    const exact = 'x'.repeat(80);
    expect(truncateText(exact, 80)).toEqual({ text: exact, truncated: false });
  });

  it('truncates above the limit, prefers a word boundary and avoids a space before dots', () => {
    const original = 'Título original com mais de oitenta caracteres que continua trazendo outras palavras para exibir';
    const result = truncateText(original, 80);
    expect(result.truncated).toBeTrue();
    expect(result.text.length).toBeLessThanOrEqual(80);
    expect(result.text).toMatch(/\.\.\.$/);
    expect(result.text).not.toContain(' ...');
    expect(result.text).toBe('Título original com mais de oitenta caracteres que continua trazendo outras...');
    expect(original).toContain('palavras para exibir');
  });

  it('cuts text without spaces at the exact content limit', () => {
    const result = truncateText('x'.repeat(90), 80);
    expect(result.text).toBe(`${'x'.repeat(77)}...`);
    expect(result.text.length).toBe(80);
  });
});

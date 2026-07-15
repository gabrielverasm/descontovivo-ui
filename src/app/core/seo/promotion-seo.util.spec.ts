import { buildPromotionSeo, resolveSchemaAvailability } from './promotion-seo.util';

describe('promotion SEO utilities', () => {
  it('maps public API availability values to schema.org URLs', () => {
    expect(resolveSchemaAvailability('AVAILABLE')).toBe('https://schema.org/InStock');
    expect(resolveSchemaAvailability('IN_STOCK')).toBe('https://schema.org/InStock');
    expect(resolveSchemaAvailability('instock')).toBe('https://schema.org/InStock');
    expect(resolveSchemaAvailability('EXPIRED')).toBe('https://schema.org/OutOfStock');
    expect(resolveSchemaAvailability('OUT_OF_STOCK')).toBe('https://schema.org/OutOfStock');
    expect(resolveSchemaAvailability('unavailable')).toBe('https://schema.org/OutOfStock');
  });

  it('builds concise promotion metadata with the exact brand name', () => {
    const seo = buildPromotionSeo({
      title: 'Mouse Logitech Pebble 2 M350s',
      currentPrice: 90.24,
      storeName: 'Amazon',
    });

    expect(seo.title).toContain('Mouse Logitech Pebble 2 M350s');
    expect(seo.title).toContain('| DescontoVivo');
    expect(seo.description).toContain('Amazon');
    expect(seo.description.length).toBeLessThanOrEqual(160);
  });

  it('truncates overly long product titles without dropping the brand', () => {
    const seo = buildPromotionSeo({
      title: 'Produto com um nome extremamente longo que ultrapassa o espaço recomendado para resultados de busca e precisa ser reduzido',
      currentPrice: 199.9,
    });

    expect(seo.title.length).toBeLessThanOrEqual(70);
    expect(seo.title).toContain('…');
    expect(seo.title).toContain('| DescontoVivo');
  });
});

import { resolveStoreFromOfferUrl } from './store-from-offer-url.util';

describe('resolveStoreFromOfferUrl', () => {
  const knownStores: Array<[string, string]> = [
    ['https://www.amazon.com.br/produto', 'Amazon'],
    ['https://link.amazon/oferta', 'Amazon'],
    ['https://meli.la/oferta', 'MercadoLivre'],
    ['https://magazineluiza.onelink.me/oferta', 'MagazineLuiza'],
    ['https://s.shopee.com.br/oferta', 'Shopee'],
    ['https://pt.aliexpress.com/item', 'AliExpress'],
    ['https://www.paguemenos.com.br/produto', 'PagueMenos'],
  ];

  for (const [url, storeName] of knownStores) {
    it(`resolves ${url} as ${storeName}`, () => {
      expect(resolveStoreFromOfferUrl(url)).toBe(storeName);
    });
  }

  it('accepts a URL without protocol', () => {
    expect(resolveStoreFromOfferUrl('magalu.com/produto')).toBe('MagazineLuiza');
  });

  it('returns null for invalid and unknown URLs', () => {
    expect(resolveStoreFromOfferUrl(':// endereço inválido')).toBeNull();
    expect(resolveStoreFromOfferUrl('https://example.com/produto')).toBeNull();
  });

  it('rejects a hostname that only embeds a known domain', () => {
    expect(resolveStoreFromOfferUrl('https://amazon.com.br.site-falso.com/produto')).toBeNull();
  });
});

import { buildOfferNavigationUrl } from './offer-link.util';

describe('buildOfferNavigationUrl', () => {
  it('routes Shopee short links through the server resolver', () => {
    expect(buildOfferNavigationUrl('https://s.shopee.com.br/3B6PXKACP1'))
      .toBe('/go?url=https%3A%2F%2Fs.shopee.com.br%2F3B6PXKACP1');
  });

  it('keeps ordinary product URLs unchanged', () => {
    expect(buildOfferNavigationUrl('https://shopee.com.br/opaanlp/1/2'))
      .toBe('https://shopee.com.br/opaanlp/1/2');
    expect(buildOfferNavigationUrl('not a url')).toBe('not a url');
  });
});

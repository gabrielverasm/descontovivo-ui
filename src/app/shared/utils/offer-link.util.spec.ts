import { buildOfferNavigationUrl, buildOfferRel, isAffiliateOffer } from './offer-link.util';

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

describe('isAffiliateOffer', () => {
  it('trusts the explicit flags from the API', () => {
    expect(isAffiliateOffer({ sponsoredLink: true, url: 'https://loja.example/produto' })).toBeTrue();
    expect(isAffiliateOffer({ affiliateProgram: 'AMAZON', url: 'https://loja.example/produto' })).toBeTrue();
    expect(isAffiliateOffer({ sponsoredLink: false, affiliateProgram: 'NONE', url: 'https://loja.example/produto' })).toBeFalse();
  });

  it('detects tagged Amazon product links when the API sends no flag', () => {
    expect(isAffiliateOffer({ url: 'https://www.amazon.com.br/dp/B0ABC12345?tag=descontovivoo-20' })).toBeTrue();
    expect(isAffiliateOffer({ offerUrl: 'https://amazon.com.br/dp/B0ABC12345?psc=1&tag=descontovivoo-20' })).toBeTrue();
  });

  it('does not treat untagged Amazon links or the store home page as affiliate links', () => {
    expect(isAffiliateOffer({ url: 'https://www.amazon.com.br/dp/B0ABC12345' })).toBeFalse();
    expect(isAffiliateOffer({ url: 'https://www.amazon.com.br/dp/B0ABC12345?tag=' })).toBeFalse();
    expect(isAffiliateOffer({ storeUrl: 'https://www.amazon.com.br' })).toBeFalse();
  });

  it('detects affiliate link hosts, including the real links used on the Services page', () => {
    const affiliateLinks = [
      'https://amzn.to/3abcdef',
      'https://link.amazon/B0b5nIch0',
      'https://meli.la/2vZLHsF',
      'https://www.magazinevoce.com.br/magazinedescontovivo/',
      'https://magazinevoce.com.br/magazinedescontovivo/p/produto/123/',
      'https://magazineluiza.onelink.me/abc',
      'https://s.shopee.com.br/9fJKQGm4sg',
      'https://shope.ee/abc',
      'https://s.click.aliexpress.com/e/_c3okcdkb',
    ];
    for (const url of affiliateLinks) {
      expect(isAffiliateOffer({ url })).withContext(url).toBeTrue();
    }
  });

  it('ignores case, "www." and a trailing dot when matching hosts', () => {
    expect(isAffiliateOffer({ url: 'https://MELI.LA/2vZLHsF' })).toBeTrue();
    expect(isAffiliateOffer({ url: 'https://www.meli.la/2vZLHsF' })).toBeTrue();
    expect(isAffiliateOffer({ url: 'https://meli.la./2vZLHsF' })).toBeTrue();
    expect(isAffiliateOffer({ url: 'https://WWW.AMAZON.COM.BR./dp/B0ABC12345?tag=descontovivoo-20' })).toBeTrue();
  });

  it('does not treat plain store hosts as affiliate links', () => {
    const plainLinks = [
      'https://www.mercadolivre.com.br/produto/MLB123',
      'https://www.magazineluiza.com.br/produto/p/123/',
      'https://pt.aliexpress.com/item/1005001.html',
      'https://shopee.com.br/opaanlp/1/2',
      'https://www.kabum.com.br/produto/85197',
    ];
    for (const url of plainLinks) {
      expect(isAffiliateOffer({ url })).withContext(url).toBeFalse();
    }
  });

  it('does not match lookalike hosts', () => {
    const lookalikes = [
      'https://meli.la.evil.example/abc',
      'https://evil-meli.la/abc',
      'https://s.click.aliexpress.com.evil.example/e/_x',
      'https://amazon.com.br.site-falso.com/dp/B0ABC12345?tag=descontovivoo-20',
    ];
    for (const url of lookalikes) {
      expect(isAffiliateOffer({ url })).withContext(url).toBeFalse();
    }
  });

  it('is false for ordinary links, empty links and missing promotions', () => {
    expect(isAffiliateOffer({ url: 'https://shopee.com.br/opaanlp/1/2' })).toBeFalse();
    expect(isAffiliateOffer({ url: 'not a url' })).toBeFalse();
    expect(isAffiliateOffer({})).toBeFalse();
    expect(isAffiliateOffer(null)).toBeFalse();
    expect(isAffiliateOffer(undefined)).toBeFalse();
  });

  it('checks the same link the button opens: url, then offerUrl, then storeUrl', () => {
    expect(isAffiliateOffer({ url: 'https://loja.example/p', storeUrl: 'https://amzn.to/3abcdef' })).toBeFalse();
    expect(isAffiliateOffer({ offerUrl: 'https://amzn.to/3abcdef', storeUrl: 'https://loja.example' })).toBeTrue();
  });
});

describe('buildOfferRel', () => {
  it('marks affiliate links as sponsored', () => {
    expect(buildOfferRel(true)).toBe('sponsored noopener noreferrer');
  });

  it('keeps ordinary links without sponsored', () => {
    expect(buildOfferRel(false)).toBe('noopener noreferrer');
  });
});

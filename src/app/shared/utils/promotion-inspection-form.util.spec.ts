import { PromotionInspectionResponse } from '../../core/models/marketplace-inspection.model';
import { applyInspectionToForm, InspectionForm } from './promotion-inspection-form.util';

describe('applyInspectionToForm', () => {
  function data(overrides: Partial<PromotionInspectionResponse> = {}): PromotionInspectionResponse {
    return { marketplace: 'SHOPEE', supported: true, inputUrl: 'in', productUrl: 'product', affiliateUrl: null, title: null, currentPrice: null, originalPrice: null, imageKey: null, imageUrl: null, storeName: null, sellerName: null, soldBy: null, deliveredBy: null, salesCount: null, productRating: null, sellerRating: null, officialStore: false, shopeeGuarantee: false, category: null, trustSignals: [], missingFields: [], warnings: [], ...overrides };
  }

  function form(): InspectionForm {
    return { marketplace: null, url: 'old', title: 'old', currentPrice: 'old', originalPrice: 'old', storeName: 'old', sellerName: 'old', soldBy: 'old', deliveredBy: 'old', category: 'old', salesCount: '1', productRating: '5', sellerRating: '5', officialStore: true, trustSignals: ['OLD'] };
  }

  it('prioritizes affiliateUrl over productUrl', () => {
    const target = form();
    applyInspectionToForm(target, data({ affiliateUrl: 'affiliate', productUrl: 'product' }));
    expect(target.url).toBe('affiliate');
  });

  it('uses productUrl without affiliateUrl', () => {
    const target = form();
    applyInspectionToForm(target, data({ affiliateUrl: null, productUrl: 'product' }));
    expect(target.url).toBe('product');
  });

  it('clears URL when neither URL is present', () => {
    const target = form();
    applyInspectionToForm(target, data({ affiliateUrl: null, productUrl: null }));
    expect(target.url).toBe('');
  });

  it('overwrites old values and clears absent fields', () => {
    const target = form();
    applyInspectionToForm(target, data({ productUrl: 'new', title: 'New', currentPrice: 10 }));
    expect(target.title).toBe('New');
    expect(target.originalPrice).toBe('');
    expect(target.soldBy).toBe('');
    expect(target.officialStore).toBeFalse();
    expect(target.marketplace).toBe('SHOPEE');
    expect(target.trustSignals).toEqual([]);
  });

  it('replaces trust signals from inspection without curated signal', () => {
    const target = form();
    applyInspectionToForm(target, data({
      officialStore: true,
      shopeeGuarantee: true,
      trustSignals: ['OFFICIAL_STORE', 'SHOPEE_GUARANTEE'],
    }));
    expect(target.officialStore).toBeTrue();
    expect(target.trustSignals).toEqual(['OFFICIAL_STORE', 'SHOPEE_GUARANTEE']);
    expect(target.trustSignals).not.toContain('CURATED_BY_DESCONTOVIVO');
  });
});

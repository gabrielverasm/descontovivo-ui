import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Promotion } from '../../../core/models/promotion.model';
import { PromotionPriceStampComponent } from './promotion-price-stamp.component';

const AMAZON_URL = 'https://www.amazon.com.br/dp/B0ABC12345?tag=descontovivoo-20';

describe('PromotionPriceStampComponent', () => {
  let fixture: ComponentFixture<PromotionPriceStampComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PromotionPriceStampComponent],
      providers: [provideRouter([])],
    });
    fixture = TestBed.createComponent(PromotionPriceStampComponent);
  });

  function render(overrides: Partial<Promotion>): HTMLElement {
    fixture.componentRef.setInput('promotion', {
      id: 'p1',
      title: 'Produto',
      currentPrice: 10,
      storeName: 'Amazon.com.br',
      url: AMAZON_URL,
      createdAt: new Date().toISOString(),
      ...overrides,
    } as Promotion);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString();

  it('shows the stamp, the warning and the store name for an affiliate offer', () => {
    const host = render({ publishedAt: '2026-09-20T17:05:00Z' });
    const text = host.querySelector('.price-stamp__text')?.textContent?.replace(/\s+/g, ' ').trim();
    expect(text).toContain('Preço de 20/09 14:05 · pode mudar; vale o preço na Amazon ao comprar');
    expect(host.querySelector('time')?.getAttribute('datetime')).toBe('2026-09-20T17:05:00.000Z');
  });

  it('uses the offer store name instead of a fixed Amazon', () => {
    const host = render({
      storeName: 'Shopee',
      url: 'https://s.shopee.com.br/3B6PXKACP1',
      publishedAt: hoursAgo(1),
    });
    expect(host.querySelector('.price-stamp__text')?.textContent).toContain('vale o preço na Shopee ao comprar');
  });

  it('prefers verifiedAt over publishedAt', () => {
    const host = render({ publishedAt: '2026-09-01T10:00:00Z', verifiedAt: '2026-09-20T17:05:00Z' });
    expect(host.querySelector('time')?.textContent?.trim()).toBe('20/09 14:05');
  });

  it('links the info icon to the prices section of the transparency page', () => {
    const link = render({ publishedAt: hoursAgo(1) }).querySelector('a.price-stamp__info') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/transparencia#precos-condicoes');
    expect(link.getAttribute('aria-label')).toBe('Entenda o aviso sobre preços');
  });

  it('does not flag a recent stamp as outdated', () => {
    const host = render({ publishedAt: hoursAgo(24 * 6) });
    expect(host.querySelector('.price-stamp--stale')).toBeNull();
    expect(host.querySelector('.price-stamp__flag')).toBeNull();
  });

  it('flags a stamp older than 7 days without hiding the notice', () => {
    const host = render({ publishedAt: hoursAgo(24 * 8) });
    expect(host.querySelector('.price-stamp--stale')).not.toBeNull();
    expect(host.querySelector('.price-stamp__flag')?.textContent?.trim()).toBe('Preço pode ter mudado');
    expect(host.querySelector('.price-stamp__text')?.textContent).toContain('pode mudar; vale o preço na Amazon');
  });

  it('measures staleness from verifiedAt when present', () => {
    const host = render({ publishedAt: hoursAgo(24 * 30), verifiedAt: hoursAgo(2) });
    expect(host.querySelector('.price-stamp--stale')).toBeNull();
  });

  it('is not rendered for offers without an affiliate link', () => {
    const host = render({
      storeName: 'Mercado Livre',
      url: 'https://www.mercadolivre.com.br/p/MLB1',
      publishedAt: hoursAgo(1),
    });
    expect(host.querySelector('.price-stamp')).toBeNull();
  });

  it('is not rendered when there is no verifiedAt or publishedAt', () => {
    expect(render({ publishedAt: undefined, verifiedAt: null }).querySelector('.price-stamp')).toBeNull();
  });

  it('falls back to a generic store word when the store is unknown', () => {
    const host = render({ storeName: 'Loja não identificada', publishedAt: hoursAgo(1) });
    expect(host.querySelector('.price-stamp__text')?.textContent).toContain('vale o preço na loja ao comprar');
  });
});

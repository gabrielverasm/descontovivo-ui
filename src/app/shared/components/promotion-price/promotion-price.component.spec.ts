import { LOCALE_ID, Provider } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { appConfig } from '../../../app.config';
import { Promotion } from '../../../core/models/promotion.model';
import { PromotionPriceComponent } from './promotion-price.component';

// R$ and the amount are separated by a no-break space (U+00A0) in pt-BR.
const NBSP = ' ';

describe('PromotionPriceComponent', () => {
  let fixture: ComponentFixture<PromotionPriceComponent>;

  // Reuses the LOCALE_ID the app really registers, so this also covers app.config.ts.
  const appLocale = (appConfig.providers as Provider[]).find(
    (provider) => (provider as { provide?: unknown }).provide === LOCALE_ID,
  ) as Provider;

  function render(prices: Pick<Promotion, 'currentPrice' | 'originalPrice' | 'discountPercentage'>): HTMLElement {
    fixture.componentInstance.promotion = { id: 'promo-1', title: 'Produto', ...prices } as Promotion;
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [PromotionPriceComponent], providers: [appLocale] });
    fixture = TestBed.createComponent(PromotionPriceComponent);
  });

  it('registers pt-BR as the app locale', () => {
    expect(appLocale).toEqual({ provide: LOCALE_ID, useValue: 'pt-BR' });
  });

  it('formats prices in pt-BR instead of the en-US default', () => {
    const host = render({ currentPrice: 5219.1, originalPrice: 6959.99 });

    expect(host.querySelector('strong')?.textContent).toBe(`R$${NBSP}5.219,10`);
    expect(host.querySelector('.promotion-price__reference span')?.textContent).toBe(`R$${NBSP}6.959,99`);
    expect(host.textContent).not.toContain('5,219.10');
  });

  it('shows the discount computed from the original and current prices', () => {
    const host = render({ currentPrice: 75, originalPrice: 100 });

    expect(host.querySelector('.promotion-price__reference small')?.textContent?.trim()).toBe('-25%');
  });

  it('ignores the discountPercentage sent by the API', () => {
    const host = render({ currentPrice: 75, originalPrice: 100, discountPercentage: 60 });

    expect(host.querySelector('.promotion-price__reference small')?.textContent?.trim()).toBe('-25%');
  });

  it('hides the discount below 5%', () => {
    const host = render({ currentPrice: 97, originalPrice: 100 });

    expect(host.querySelector('.promotion-price__reference small')).toBeNull();
    expect(host.querySelector('.promotion-price__reference span')).not.toBeNull();
  });

  it('hides the discount when the original price is not above the current one', () => {
    expect(render({ currentPrice: 100, originalPrice: 100 }).querySelector('small')).toBeNull();
    expect(render({ currentPrice: 120, originalPrice: 100 }).querySelector('small')).toBeNull();
  });

  it('shows only the current price when there is no original price, even if the API sends a percentage', () => {
    const host = render({ currentPrice: 100, discountPercentage: 40 });

    expect(host.querySelector('.promotion-price__reference')).toBeNull();
    expect(host.querySelector('small')).toBeNull();
  });
});

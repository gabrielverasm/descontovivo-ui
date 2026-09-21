import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Promotion } from '../../../core/models/promotion.model';
import { PRICE_STAMP_NOW, PromotionPriceStampComponent } from './promotion-price-stamp.component';

const AMAZON_URL = 'https://www.amazon.com.br/dp/B0ABC12345?tag=descontovivoo-20';

describe('PromotionPriceStampComponent', () => {
  let fixture: ComponentFixture<PromotionPriceStampComponent>;
  // Relógio injetado: nenhum teste depende da data real.
  let clock: { now: number };

  beforeEach(() => {
    clock = { now: Date.parse('2026-09-25T15:00:00Z') };
    TestBed.configureTestingModule({
      imports: [PromotionPriceStampComponent],
      providers: [provideRouter([]), { provide: PRICE_STAMP_NOW, useValue: () => clock.now }],
    });
    fixture = TestBed.createComponent(PromotionPriceStampComponent);
  });

  /** Renderiza e deixa o afterNextRender (só no navegador) virar `ready` e reescrever o texto. */
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
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  const hoursAgo = (hours: number) => new Date(clock.now - hours * 3_600_000).toISOString();
  const stampText = (host: HTMLElement) => host.querySelector('.price-stamp__text')?.textContent?.replace(/\s+/g, ' ').trim();

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

  describe('date part (hoje / DD/MM) in the America/Fortaleza calendar', () => {
    it('shows "hoje" with the time for a stamp from today, keeping the rest of the text', () => {
      clock.now = Date.parse('2026-09-20T22:00:00Z'); // 19:00 em Fortaleza
      const host = render({ verifiedAt: '2026-09-20T19:32:00Z' });
      expect(stampText(host)).toContain('Preço de hoje 16:32 · pode mudar; vale o preço na Amazon ao comprar');
      expect(host.querySelector('time')?.getAttribute('datetime')).toBe('2026-09-20T19:32:00.000Z');
    });

    it('keeps DD/MM HH:mm for the previous day', () => {
      clock.now = Date.parse('2026-09-20T22:00:00Z');
      const host = render({ verifiedAt: '2026-09-19T19:32:00Z' });
      expect(stampText(host)).toContain('Preço de 19/09 16:32 · pode mudar; vale o preço na Amazon ao comprar');
    });

    it('treats 23:59 as today and 00:00 of the next day as another day', () => {
      clock.now = Date.parse('2026-09-21T02:59:00Z'); // 23:59 de 20/09 em Fortaleza
      expect(stampText(render({ verifiedAt: '2026-09-20T15:00:00Z' }))).toContain('Preço de hoje 12:00 ·');

      clock.now = Date.parse('2026-09-21T03:00:00Z'); // 00:00 de 21/09
      fixture.detectChanges();
      expect(stampText(fixture.nativeElement)).toContain('Preço de 20/09 12:00 ·');
    });

    it('uses the Fortaleza day when the server or browser clock is in UTC (02:30Z is 23:30 of today)', () => {
      clock.now = Date.parse('2026-09-21T02:30:00Z');
      expect(stampText(render({ verifiedAt: '2026-09-21T00:10:00Z' }))).toContain('Preço de hoje 21:10 ·');
    });

    it('never says "hoje" before hydration: the server and the first browser render show the absolute date', () => {
      clock.now = Date.parse('2026-09-20T22:00:00Z');
      // afterNextRender não roda no servidor; bloquear a troca reproduz esse render.
      const setReady = spyOn(fixture.componentInstance.ready, 'set').and.stub();
      const host = render({ verifiedAt: '2026-09-20T19:32:00Z' });
      expect(setReady).toHaveBeenCalledWith(true);
      expect(stampText(host)).toContain('Preço de 20/09 16:32 · pode mudar;');
      expect(host.textContent).not.toContain('hoje');
    });

    it('rewrites "hoje" as the date when the day changes while the tab stays open', () => {
      clock.now = Date.parse('2026-09-21T02:59:00Z'); // 23:59 de 20/09
      const host = render({ verifiedAt: '2026-09-20T15:00:00Z' });
      expect(host.querySelector('time')?.textContent?.trim()).toBe('hoje 12:00');

      clock.now = Date.parse('2026-09-21T03:01:00Z'); // passou da meia-noite
      fixture.detectChanges(); // qualquer passada de detecção de mudança reavalia o getter
      expect(host.querySelector('time')?.textContent?.trim()).toBe('20/09 12:00');
    });
  });
});

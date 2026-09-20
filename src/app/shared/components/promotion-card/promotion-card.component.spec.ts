import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Promotion } from '../../../core/models/promotion.model';
import { AnalyticsService } from '../../../core/analytics/analytics.service';
import { SponsoredLabelComponent } from '../sponsored-label/sponsored-label.component';
import { PromotionCardComponent } from './promotion-card.component';

describe('PromotionCardComponent title', () => {
  let fixture: ComponentFixture<PromotionCardComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PromotionCardComponent],
      providers: [
        provideRouter([]),
        { provide: AnalyticsService, useValue: jasmine.createSpyObj('AnalyticsService', ['trackSharePromotion', 'trackClickStore']) },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    });
    TestBed.overrideComponent(PromotionCardComponent, { set: { imports: [], schemas: [NO_ERRORS_SCHEMA] } });
    fixture = TestBed.createComponent(PromotionCardComponent);
  });

  function render(title: string): HTMLAnchorElement {
    fixture.componentInstance.promotion = {
      id: 'promo-1',
      slug: 'promo-1',
      title,
      currentPrice: 10,
      createdAt: '2026-07-27T10:00:00.000Z',
      publishedAt: '2026-07-27T10:00:00.000Z',
    } as Promotion;
    fixture.detectChanges();
    return fixture.nativeElement.querySelector('h2 a') as HTMLAnchorElement;
  }

  it('shows a truncated visual title while preserving full accessible text and tooltip', () => {
    const title = 'Título original com mais de oitenta caracteres que continua trazendo outras palavras para exibir';
    const link = render(title);
    expect(link.textContent?.trim()).toBe('Título original com mais de oitenta caracteres que continua trazendo outras...');
    expect(link.getAttribute('aria-label')).toBe(title);
    expect(link.title).toBe(title);
    expect(fixture.componentInstance.promotion.title).toBe(title);
  });

  it('does not add a tooltip when the title is not truncated', () => {
    const title = 'Título curto';
    const link = render(title);
    expect(link.textContent?.trim()).toBe(title);
    expect(link.hasAttribute('title')).toBeFalse();
    expect(link.getAttribute('aria-label')).toBe(title);
  });
});

describe('PromotionCardComponent sponsored link label', () => {
  function render(overrides: Partial<Promotion>): HTMLElement {
    TestBed.configureTestingModule({
      imports: [PromotionCardComponent],
      providers: [
        provideRouter([]),
        { provide: AnalyticsService, useValue: jasmine.createSpyObj('AnalyticsService', ['trackSharePromotion', 'trackClickStore']) },
      ],
    });
    TestBed.overrideComponent(PromotionCardComponent, { set: { imports: [SponsoredLabelComponent], schemas: [NO_ERRORS_SCHEMA] } });
    const fixture = TestBed.createComponent(PromotionCardComponent);
    fixture.componentInstance.promotion = {
      id: 'promo-1',
      slug: 'promo-1',
      title: 'Produto',
      currentPrice: 10,
      storeName: 'Amazon',
      createdAt: '2026-07-27T10:00:00.000Z',
      publishedAt: '2026-07-27T10:00:00.000Z',
      ...overrides,
    } as Promotion;
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows "Link patrocinado" next to "Ir para <loja>" for an affiliate link', () => {
    const host = render({ url: 'https://www.amazon.com.br/dp/B0ABC12345?tag=descontovivoo-20' });
    const offer = host.querySelector('.promotion-card__offer')!;
    const link = offer.querySelector<HTMLAnchorElement>('a.promotion-card__offer-link')!;

    expect(link.textContent?.trim()).toBe('Ir para Amazon');
    expect(link.rel).toBe('sponsored noopener noreferrer');
    expect(offer.querySelector('app-sponsored-label')?.textContent?.trim()).toBe('Link patrocinado');
  });

  it('honours the explicit API flag', () => {
    const host = render({ url: 'https://loja.example/produto', sponsoredLink: true });

    expect(host.querySelector('.promotion-card__offer app-sponsored-label')).not.toBeNull();
  });

  it('shows neither the label nor the sponsored rel for an ordinary link', () => {
    const host = render({ url: 'https://loja.example/produto' });

    expect(host.querySelector('app-sponsored-label')).toBeNull();
    expect(host.querySelector<HTMLAnchorElement>('a.promotion-card__offer-link')!.rel).toBe('noopener noreferrer');
  });
});

describe('PromotionCardComponent comments line', () => {
  function render(commentsCount: number): HTMLElement {
    TestBed.configureTestingModule({
      imports: [PromotionCardComponent],
      providers: [
        provideRouter([]),
        { provide: AnalyticsService, useValue: jasmine.createSpyObj('AnalyticsService', ['trackSharePromotion', 'trackClickStore']) },
      ],
    });
    TestBed.overrideComponent(PromotionCardComponent, { set: { imports: [], schemas: [NO_ERRORS_SCHEMA] } });
    const fixture = TestBed.createComponent(PromotionCardComponent);
    fixture.componentInstance.promotion = {
      id: 'promo-1',
      slug: 'promo-1',
      title: 'Título',
      currentPrice: 10,
      commentsCount,
      createdAt: '2026-07-27T10:00:00.000Z',
    } as Promotion;
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('does not show the empty-comments line while there are no comments', () => {
    const host = render(0);
    expect(host.querySelector('.promotion-card__comment-preview')).toBeNull();
    expect(host.textContent).not.toContain('Ainda não há comentários');
  });

  it('shows the comment count once there are comments', () => {
    expect(render(1).querySelector('.promotion-card__comment-count')?.textContent?.trim()).toBe('1 comentário');
  });

  it('pluralizes the comment count', () => {
    expect(render(4).querySelector('.promotion-card__comment-count')?.textContent?.trim()).toBe('4 comentários');
  });
});

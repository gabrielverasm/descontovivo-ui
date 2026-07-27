import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Promotion } from '../../../core/models/promotion.model';
import { AnalyticsService } from '../../../core/analytics/analytics.service';
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

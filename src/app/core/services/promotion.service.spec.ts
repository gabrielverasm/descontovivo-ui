import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { PromotionService } from './promotion.service';

const promotion = {
  id: 'current-id', slug: 'oferta-atual', title: 'Atual', currentPrice: 10,
  storeName: 'Loja', storeUrl: '', imageUrl: '', category: 'Casa', categories: ['Casa', 'Jardim'],
  tags: [], likesCount: 0, commentsCount: 0, status: 'approved' as const,
  createdAt: '2026-07-31T10:00:00Z', createdBy: 'user',
};

describe('PromotionService', () => {
  it('disables the HTTP transfer cache for a fresh promotions request', () => {
    TestBed.configureTestingModule({
      providers: [PromotionService, provideHttpClient(), provideHttpClientTesting()],
    });
    const service = TestBed.inject(PromotionService);
    const http = TestBed.inject(HttpTestingController);

    service.getPromotionsFresh(0, 12).subscribe();

    const request = http.expectOne((candidate) =>
      candidate.url.endsWith('/promotions')
      && candidate.params.get('page') === '0'
      && candidate.params.get('size') === '12'
      && /^\d+$/.test(candidate.params.get('_fresh') ?? '')
    );
    expect(request.request.transferCache).toBeFalse();
    request.flush({ content: [], totalElements: 0, totalPages: 0, size: 12, page: 0 });
    http.verify();
  });

  it('loads related promotions from the slug endpoint and keeps only unique category matches with valid slugs', () => {
    TestBed.configureTestingModule({
      providers: [PromotionService, provideHttpClient(), provideHttpClientTesting()],
    });
    const service = TestBed.inject(PromotionService);
    const http = TestBed.inject(HttpTestingController);
    let result: string[] = [];

    service.getRelatedPromotions(promotion, 6).subscribe(items => result = items.map(item => item.slug!));

    const request = http.expectOne(candidate =>
      candidate.url.endsWith('/promotions/oferta-atual/related') && candidate.params.get('size') === '6');
    request.flush({
      content: [
        { ...promotion, id: 'related-1', slug: 'casa-relacionada', categories: ['Casa'] },
        { ...promotion, id: 'related-1', slug: 'casa-relacionada', categories: ['Casa', 'Jardim'] },
        { ...promotion, id: 'related-2', slug: 'outra-categoria', category: 'Games', categories: ['Games'] },
        { ...promotion, id: 'related-3', slug: '', categories: ['Casa'] },
        promotion,
      ],
      totalElements: 5, totalPages: 1, size: 6, page: 0,
    });

    expect(result).toEqual(['casa-relacionada']);
    http.verify();
  });

  it('does not request arbitrary recommendations when the current promotion has no categories', () => {
    TestBed.configureTestingModule({
      providers: [PromotionService, provideHttpClient(), provideHttpClientTesting()],
    });
    const service = TestBed.inject(PromotionService);
    const http = TestBed.inject(HttpTestingController);
    let result: unknown;

    service.getRelatedPromotions({ ...promotion, category: '', categories: [] }, 6)
      .subscribe(items => result = items);

    expect(result).toEqual([]);
    http.expectNone(() => true);
    http.verify();
  });
});

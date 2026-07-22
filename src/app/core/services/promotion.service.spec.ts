import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { PromotionService } from './promotion.service';

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
    );
    expect(request.request.transferCache).toBeFalse();
    request.flush({ content: [], totalElements: 0, totalPages: 0, size: 12, page: 0 });
    http.verify();
  });
});

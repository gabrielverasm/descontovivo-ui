import { PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { BehaviorSubject, Subject, of, throwError } from 'rxjs';

import { PagedResponse, Promotion } from '../../core/models/promotion.model';
import { PromotionService } from '../../core/services/promotion.service';
import { PublicNotificationStreamService } from '../../core/services/public-notification-stream.service';
import { SeoService } from '../../core/services/seo.service';
import { StructuredDataService } from '../../core/services/structured-data.service';
import { FeedState, PromotionsFeedStateService } from './promotions-feed-state.service';
import { PromotionsComponent } from './promotions.component';

describe('PromotionsComponent fresh revalidation', () => {
  let fixture: ComponentFixture<PromotionsComponent>;
  let component: PromotionsComponent;
  let promotionService: jasmine.SpyObj<PromotionService>;
  let notificationStream: jasmine.SpyObj<PublicNotificationStreamService>;
  let feedState: jasmine.SpyObj<PromotionsFeedStateService>;
  let freshResponse: Subject<PagedResponse<Promotion>>;

  const oldPromotions = [promotion('old-1'), promotion('old-2')];

  beforeEach(() => {
    freshResponse = new Subject<PagedResponse<Promotion>>();
    promotionService = jasmine.createSpyObj('PromotionService', [
      'getPromotions', 'getPromotionsFresh', 'searchPromotions',
    ]);
    promotionService.getPromotions.and.returnValue(of(page(oldPromotions, 0, 1, 2)));
    promotionService.getPromotionsFresh.and.returnValue(freshResponse);
    promotionService.searchPromotions.and.returnValue(of([]));

    notificationStream = jasmine.createSpyObj(
      'PublicNotificationStreamService',
      ['setDisplayedFeedSnapshot', 'clearNewPromotions', 'formatCount'],
      { state$: new BehaviorSubject({ newPromotionsCount: 3 }) },
    );
    notificationStream.formatCount.and.callFake(String);
    feedState = jasmine.createSpyObj('PromotionsFeedStateService', ['restore', 'save']);
    feedState.restore.and.returnValue(null);

    TestBed.configureTestingModule({
      imports: [PromotionsComponent],
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: PromotionService, useValue: promotionService },
        { provide: PublicNotificationStreamService, useValue: notificationStream },
        { provide: PromotionsFeedStateService, useValue: feedState },
        { provide: SeoService, useValue: jasmine.createSpyObj('SeoService', ['setIndexable']) },
        { provide: StructuredDataService, useValue: jasmine.createSpyObj('StructuredDataService', ['setStructuredData', 'removeStructuredData']) },
        { provide: Router, useValue: { events: new Subject(), navigate: jasmine.createSpy('navigate') } },
      ],
    });
    TestBed.overrideComponent(PromotionsComponent, {
      set: { template: '<span class="count">{{ promotions.length }}</span>' },
    });
  });

  afterEach(() => fixture?.destroy());

  it('shows transferred content first and makes one fresh request after rendering', async () => {
    createComponent();

    expect(component.promotions).toEqual(oldPromotions);
    expect(fixture.nativeElement.querySelector('.count').textContent).toBe('2');

    await fixture.whenStable();
    fixture.detectChanges();

    expect(promotionService.getPromotions).toHaveBeenCalledOnceWith(0, 12);
    expect(promotionService.getPromotionsFresh).toHaveBeenCalledOnceWith(0, 12);

    fixture.detectChanges();
    await fixture.whenStable();
    expect(promotionService.getPromotionsFresh).toHaveBeenCalledTimes(1);
  });

  it('silently replaces page zero, updates totals and clears the stale badge', async () => {
    createComponent();
    await fixture.whenStable();
    const currentPromotions = [promotion('new-1'), promotion('new-2'), promotion('new-3')];

    freshResponse.next(page(currentPromotions, 0, 4, 39));

    expect(component.promotions).toEqual(currentPromotions);
    expect(component.hasMore).toBeTrue();
    expect((component as unknown as { totalElements: number }).totalElements).toBe(39);
    expect(notificationStream.setDisplayedFeedSnapshot).toHaveBeenCalledWith({
      publishedCount: 39,
      latestPublishedAt: currentPromotions[0].publishedAt,
    });
    expect(notificationStream.clearNewPromotions).toHaveBeenCalledTimes(1);
    expect(component.loading).toBeFalse();
    expect(component.error).toBe('');
  });

  it('keeps the old feed and shows no error when fresh revalidation fails', async () => {
    promotionService.getPromotionsFresh.and.returnValue(throwError(() => new Error('offline')));
    createComponent();
    const originalArray = component.promotions;

    await fixture.whenStable();

    expect(component.promotions).toBe(originalArray);
    expect(component.promotions).toEqual(oldPromotions);
    expect(component.error).toBe('');
    expect(notificationStream.clearNewPromotions).not.toHaveBeenCalled();
  });

  it('revalidates a restored first page but does not overwrite an active search', async () => {
    feedState.restore.and.returnValue(savedState(oldPromotions, 0));
    createComponent();
    await fixture.whenStable();
    expect(promotionService.getPromotionsFresh).toHaveBeenCalledTimes(1);
  });

  it('cancels an in-flight fresh response when a search starts', async () => {
    createComponent();
    await fixture.whenStable();
    component.query = 'celular';

    component.onSearch();
    freshResponse.next(page([promotion('late-fresh')], 0, 1, 1));

    expect(component.promotions).toEqual([]);
    expect(notificationStream.clearNewPromotions).not.toHaveBeenCalled();
  });

  it('does not rewrite the array when IDs, order and total are unchanged', async () => {
    createComponent();
    await fixture.whenStable();
    const originalArray = component.promotions;

    freshResponse.next(page(oldPromotions.map((item) => ({ ...item })), 0, 1, 2));

    expect(component.promotions).toBe(originalArray);
    expect(notificationStream.clearNewPromotions).toHaveBeenCalledTimes(1);
  });

  it('does not revalidate a restored search', async () => {
    feedState.restore.and.returnValue({ ...savedState(oldPromotions, 0), query: 'notebook' });
    createComponent();

    await fixture.whenStable();

    expect(component.promotions).toEqual(oldPromotions);
    expect(promotionService.getPromotionsFresh).not.toHaveBeenCalled();
  });

  it('preserves a restored multi-page feed and its scroll position', async () => {
    const deepFeed = [...oldPromotions, promotion('page-2')];
    feedState.restore.and.returnValue(savedState(deepFeed, 1));
    const scrollTo = spyOn(window, 'scrollTo');
    createComponent();

    await fixture.whenStable();

    expect(component.promotions).toEqual(deepFeed);
    expect(promotionService.getPromotionsFresh).not.toHaveBeenCalled();
    expect(scrollTo).toHaveBeenCalledWith(0, 640);
  });

  function createComponent(): void {
    fixture = TestBed.createComponent(PromotionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  function savedState(promotions: Promotion[], currentPage: number): FeedState {
    return {
      promotions,
      currentPage,
      totalPages: 3,
      totalElements: 30,
      scrollY: 640,
    };
  }
});

function promotion(id: string): Promotion {
  return {
    id,
    title: `Promoção ${id}`,
    currentPrice: 99,
    storeName: 'Shopee',
    storeUrl: '',
    url: `https://shopee.com.br/${id}`,
    imageUrl: '/image.webp',
    category: 'Tecnologia',
    tags: ['oferta'],
    likesCount: 0,
    dislikesCount: 0,
    commentsCount: 0,
    status: 'approved',
    createdAt: '2026-07-22T10:00:00Z',
    publishedAt: `2026-07-22T10:00:0${id.length}Z`,
    createdBy: 'tester',
  };
}

function page(
  content: Promotion[], pageNumber: number, totalPages: number, totalElements: number,
): PagedResponse<Promotion> {
  return { content, page: pageNumber, size: 12, totalPages, totalElements };
}

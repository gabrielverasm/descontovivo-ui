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
  let notificationState$: BehaviorSubject<any>;

  const oldPromotions = [promotion('old-1'), promotion('old-2')];

  beforeEach(() => {
    freshResponse = new Subject<PagedResponse<Promotion>>();
    promotionService = jasmine.createSpyObj('PromotionService', [
      'getPromotions', 'getPromotionsFresh', 'searchPromotions',
    ]);
    promotionService.getPromotions.and.returnValue(of(page(oldPromotions, 0, 1, 2)));
    promotionService.getPromotionsFresh.and.returnValue(freshResponse);
    promotionService.searchPromotions.and.returnValue(of([]));

    notificationState$ = new BehaviorSubject({ newPromotionsCount: 3, newPromotionsCountIsLowerBound: false });
    notificationStream = jasmine.createSpyObj(
      'PublicNotificationStreamService',
      ['setDisplayedFeedSnapshot', 'clearNewPromotions', 'formatCount'],
    );
    Object.defineProperties(notificationStream, {
      state$: { value: notificationState$ },
      snapshot: { get: () => notificationState$.value },
    });
    notificationStream.formatCount.and.callFake((count: number, lowerBound = false) => {
      if (count <= 0) return '';
      if (count > 99) return '99+';
      return `${count}${lowerBound ? '+' : ''}`;
    });
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
      set: { template: `
        <span class="count">{{ promotions.length }}</span>
        @if (newPromotionsCount > 0 && !loading) {
          <button class="promotions-feed__new-bar">{{ newPromotionsMessage }} Atualizar</button>
        }
      ` },
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

  it('silently replaces page zero and reconciles notifications from the rendered snapshot', async () => {
    createComponent();
    await fixture.whenStable();
    const currentPromotions = [promotion('new-1'), promotion('new-2'), promotion('new-3')];

    freshResponse.next(page(currentPromotions, 0, 4, 39));

    expect(component.promotions).toEqual(currentPromotions);
    expect(component.hasMore).toBeTrue();
    expect((component as unknown as { totalElements: number }).totalElements).toBe(39);
    expect(notificationStream.setDisplayedFeedSnapshot).toHaveBeenCalledWith({
      promotionIds: currentPromotions.map(item => item.id),
      totalElements: 39,
      latestPromotionId: currentPromotions[0].id,
      latestPublishedAt: currentPromotions[0].publishedAt ?? null,
    });
    expect(notificationStream.clearNewPromotions).not.toHaveBeenCalled();
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
    expect(notificationStream.clearNewPromotions).not.toHaveBeenCalled();
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

  it('uses singular for one confirmed promotion', () => {
    createComponent();
    setNotification(1);
    expect(bannerText()).toContain('Há 1 nova promoção.');
  });

  it('uses plural for exact and lower-bound confirmed counts', () => {
    createComponent();
    setNotification(2);
    expect(bannerText()).toContain('Há 2 novas promoções.');

    setNotification(12, true);
    expect(bannerText()).toContain('Há 12+ novas promoções.');
  });

  it('hides the banner for zero and while the feed is loading', () => {
    createComponent();
    setNotification(0);
    expect(fixture.nativeElement.querySelector('.promotions-feed__new-bar')).toBeNull();

    setNotification(2);
    component.loading = true;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.promotions-feed__new-bar')).toBeNull();
  });

  it('reconciles the confirmed badge only after a successful manual refresh', () => {
    createComponent();
    setNotification(2);
    notificationStream.setDisplayedFeedSnapshot.and.callFake(() => setNotification(0));
    notificationStream.setDisplayedFeedSnapshot.calls.reset();
    const refreshed = [promotion('manual-new'), ...oldPromotions];

    component.refreshFeed();
    expect(promotionService.getPromotionsFresh).toHaveBeenCalledWith(0, 12);
    expect(notificationStream.setDisplayedFeedSnapshot).not.toHaveBeenCalled();

    freshResponse.next(page(refreshed, 0, 1, 3));
    expect(component.promotions).toEqual(refreshed);
    expect(notificationStream.setDisplayedFeedSnapshot).toHaveBeenCalledWith(jasmine.objectContaining({
      promotionIds: refreshed.map(item => item.id),
      latestPromotionId: 'manual-new',
    }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.promotions-feed__new-bar')).toBeNull();
  });

  it('preserves the rendered list and confirmed banner when manual refresh fails', () => {
    promotionService.getPromotionsFresh.and.returnValue(throwError(() => new Error('offline')));
    createComponent();
    setNotification(2);
    notificationStream.setDisplayedFeedSnapshot.calls.reset();
    const original = component.promotions;

    component.refreshFeed();

    expect(component.promotions).toBe(original);
    expect(component.refreshError).toContain('Não foi possível atualizar');
    expect(notificationStream.setDisplayedFeedSnapshot).not.toHaveBeenCalled();
    fixture.detectChanges();
    expect(bannerText()).toContain('Há 2 novas promoções.');
  });

  function setNotification(count: number, isLowerBound = false): void {
    notificationState$.next({ newPromotionsCount: count, newPromotionsCountIsLowerBound: isLowerBound });
    fixture.detectChanges();
  }

  function bannerText(): string {
    return fixture.nativeElement.querySelector('.promotions-feed__new-bar')?.textContent ?? '';
  }

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

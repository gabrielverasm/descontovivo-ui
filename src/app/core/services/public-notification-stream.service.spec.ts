import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { PagedResponse, Promotion } from '../models/promotion.model';
import { PromotionService } from './promotion.service';
import { PublicNotificationStreamService } from './public-notification-stream.service';

class MockEventSource {
  static instances: MockEventSource[] = [];
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 2;
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  readyState = MockEventSource.CONNECTING;
  private readonly listeners: Record<string, ((event: MessageEvent) => void)[]> = {};

  constructor(readonly url: string) { MockEventSource.instances.push(this); }
  addEventListener(type: string, listener: (event: MessageEvent) => void): void {
    (this.listeners[type] ??= []).push(listener);
  }
  close(): void { this.readyState = MockEventSource.CLOSED; }
  open(): void { this.readyState = MockEventSource.OPEN; this.onopen?.(); }
  emit(type: string, data: unknown): void {
    this.emitRaw(type, JSON.stringify(data));
  }
  emitRaw(type: string, data: string): void {
    const event = new MessageEvent(type, { data });
    (this.listeners[type] ?? []).forEach(listener => listener(event));
  }
  fail(permanent = false): void {
    if (permanent) this.readyState = MockEventSource.CLOSED;
    this.onerror?.();
  }
}

describe('PublicNotificationStreamService', () => {
  let service: PublicNotificationStreamService;
  let promotionService: jasmine.SpyObj<PromotionService>;
  let originalEventSource: typeof EventSource;

  beforeEach(() => {
    MockEventSource.instances = [];
    originalEventSource = window.EventSource;
    (window as unknown as { EventSource: typeof EventSource }).EventSource = MockEventSource as unknown as typeof EventSource;
    promotionService = jasmine.createSpyObj('PromotionService', ['getPromotionsFresh']);
    promotionService.getPromotionsFresh.and.returnValue(of(page(['A', 'B', 'C', 'D'])));
    TestBed.configureTestingModule({ providers: [
      PublicNotificationStreamService,
      { provide: PromotionService, useValue: promotionService },
    ] });
    service = TestBed.inject(PublicNotificationStreamService);
  });

  afterEach(() => {
    service.ngOnDestroy();
    (window as unknown as { EventSource: typeof EventSource }).EventSource = originalEventSource;
  });

  it('connects once, reports errors and reconnects a permanently closed stream', () => {
    service.connect();
    service.connect();
    expect(MockEventSource.instances).toHaveSize(1);
    source().open();
    expect(service.snapshot.connected).toBeTrue();
    source().fail(true);
    expect(service.snapshot.error).toBeTrue();
    service.connect();
    expect(MockEventSource.instances).toHaveSize(2);
  });

  it('disconnect closes the EventSource and marks the stream disconnected', () => {
    service.connect();
    source().open();

    service.disconnect();

    expect(source().readyState).toBe(MockEventSource.CLOSED);
    expect(service.snapshot.connected).toBeFalse();
  });

  it('reconnect closes the previous EventSource and creates a new connection', () => {
    service.connect();
    const previous = source();
    previous.open();

    service.reconnect();

    expect(previous.readyState).toBe(MockEventSource.CLOSED);
    expect(MockEventSource.instances).toHaveSize(2);
    expect(source()).not.toBe(previous);
  });

  it('ignores malformed JSON without changing the badge or requesting the feed', fakeAsync(() => {
    displayed(['A', 'B']);
    connectAndEmit(event(10, 'A'));

    expect(() => source().emitRaw('promotions', '{invalid')).not.toThrow();
    tick(100);

    expect(service.snapshot.newPromotionsCount).toBe(0);
    expect(promotionService.getPromotionsFresh).not.toHaveBeenCalled();
  }));

  it('ignores missing, negative and decimal published counts', fakeAsync(() => {
    displayed(['A', 'B']);
    connectAndEmit(event(10, 'A'));

    for (const payload of [
      { latestPromotionId: 'X', latestPublishedAt: '2026-08-01T17:00:00Z' },
      event(-1, 'X'),
      event(10.5, 'X'),
    ]) {
      source().emit('promotions', payload);
    }
    tick(100);

    expect(service.snapshot.newPromotionsCount).toBe(0);
    expect(promotionService.getPromotionsFresh).not.toHaveBeenCalled();
  }));

  it('recreates a closed connection when the tab becomes visible', () => {
    spyOnProperty(document, 'visibilityState', 'get').and.returnValue('visible');
    service.connect();
    source().close();

    document.dispatchEvent(new Event('visibilitychange'));

    expect(MockEventSource.instances).toHaveSize(2);
  });

  it('does not duplicate a live connection when the tab becomes visible', () => {
    spyOnProperty(document, 'visibilityState', 'get').and.returnValue('visible');
    service.connect();
    source().open();

    document.dispatchEvent(new Event('visibilitychange'));

    expect(MockEventSource.instances).toHaveSize(1);
  });

  it('formats exact and lower-bound counts without duplicate plus signs', () => {
    expect(service.formatCount(0)).toBe('');
    expect(service.formatCount(1)).toBe('1');
    expect(service.formatCount(99)).toBe('99');
    expect(service.formatCount(100)).toBe('99+');
    expect(service.formatCount(12, true)).toBe('12+');
    expect(service.formatCount(100, true)).toBe('99+');
  });

  it('uses the first SSE event only as a technical baseline', fakeAsync(() => {
    displayed(['A', 'B', 'C', 'D']);
    connectAndEmit(event(10, 'A', '2026-07-31T14:00:00-03:00'));
    tick(100);
    expect(promotionService.getPromotionsFresh).not.toHaveBeenCalled();
    expect(service.snapshot.newPromotionsCount).toBe(0);
  }));

  it('does not verify twice for identical SSE fingerprints', fakeAsync(() => {
    displayed(['A', 'B', 'C', 'D']);
    connectAndEmit(event(10, 'A'));
    source().emit('promotions', event(11, 'X'));
    source().emit('promotions', event(11, 'X'));
    tick(81);
    expect(promotionService.getPromotionsFresh).toHaveBeenCalledTimes(1);
  }));

  it('normalizes equivalent timestamp formats in the SSE fingerprint', fakeAsync(() => {
    displayed(['A', 'B']);
    connectAndEmit(event(10, 'A', '2026-07-31T14:00:00-03:00'));
    source().emit('promotions', event(10, 'A', '2026-07-31T17:00:00Z'));
    tick(100);
    expect(promotionService.getPromotionsFresh).not.toHaveBeenCalled();
    expect(service.snapshot.newPromotionsCount).toBe(0);
  }));

  it('keeps zero when count or timestamp changes but fresh IDs are unchanged', fakeAsync(() => {
    displayed(['A', 'B', 'C', 'D']);
    connectAndEmit(event(10, 'A', '2026-07-31T17:00:00Z'));
    source().emit('promotions', event(99, 'A', '2026-08-01T17:00:00Z'));
    tick(81);
    expect(service.snapshot.newPromotionsCount).toBe(0);
  }));

  it('confirms one and two leading new IDs', fakeAsync(() => {
    displayed(['A', 'B', 'C', 'D']);
    connectAndEmit(event(10, 'A'));
    promotionService.getPromotionsFresh.and.returnValue(of(page(['X', 'A', 'B', 'C'])));
    source().emit('promotions', event(11, 'X'));
    tick(81);
    expect(service.snapshot.newPromotionsCount).toBe(1);

    service.setDisplayedFeedSnapshot(snapshot(['A', 'B', 'C', 'D']));
    promotionService.getPromotionsFresh.and.returnValue(of(page(['X', 'Y', 'A', 'B'])));
    source().emit('promotions', event(12, 'Y'));
    tick(81);
    expect(service.snapshot.newPromotionsCount).toBe(2);
  }));

  it('does not announce removals, retroactive insertion or reordering below an existing leader', fakeAsync(() => {
    displayed(['A', 'B', 'C', 'D']);
    connectAndEmit(event(10, 'A'));
    let publishedCount = 11;
    for (const ids of [['A', 'C', 'D', 'E'], ['A', 'B', 'X', 'C'], ['B', 'A', 'C', 'D']]) {
      promotionService.getPromotionsFresh.and.returnValue(of(page(ids)));
      source().emit('promotions', event(publishedCount++, ids[0]));
      tick(81);
      expect(service.snapshot.newPromotionsCount).toBe(0);
    }
  }));

  it('marks a page with no common ID as a proven lower bound', fakeAsync(() => {
    displayed(['A', 'B', 'C', 'D']);
    connectAndEmit(event(10, 'A'));
    promotionService.getPromotionsFresh.and.returnValue(of(page(['W', 'X', 'Y', 'Z'])));
    source().emit('promotions', event(14, 'W'));
    tick(81);
    expect(service.snapshot.newPromotionsCount).toBe(4);
    expect(service.snapshot.newPromotionsCountIsLowerBound).toBeTrue();
    expect(service.formatCount(4, true)).toBe('4+');
  }));

  it('discards a verification response after the displayed feed changes', fakeAsync(() => {
    const response = new Subject<PagedResponse<Promotion>>();
    promotionService.getPromotionsFresh.and.returnValue(response);
    displayed(['A', 'B', 'C']);
    connectAndEmit(event(10, 'A'));
    source().emit('promotions', event(11, 'X'));
    tick(81);
    service.setDisplayedFeedSnapshot(snapshot(['X', 'A', 'B']));
    response.next(page(['X', 'A', 'B']));
    expect(service.snapshot.newPromotionsCount).toBe(0);
  }));

  it('does not resurrect a badge when an SSE event arrives after fresh content was rendered', fakeAsync(() => {
    displayed(['A', 'B', 'C']);
    connectAndEmit(event(10, 'A'));
    service.setDisplayedFeedSnapshot(snapshot(['X', 'A', 'B']));
    promotionService.getPromotionsFresh.and.returnValue(of(page(['X', 'A', 'B'])));

    source().emit('promotions', event(11, 'X'));
    tick(81);

    expect(service.snapshot.newPromotionsCount).toBe(0);
  }));

  it('cancels an obsolete verification when a newer SSE event arrives', fakeAsync(() => {
    const first = new Subject<PagedResponse<Promotion>>();
    const second = new Subject<PagedResponse<Promotion>>();
    promotionService.getPromotionsFresh.and.returnValues(first, second);
    displayed(['A', 'B', 'C']);
    connectAndEmit(event(10, 'A'));
    source().emit('promotions', event(11, 'X'));
    tick(81);
    source().emit('promotions', event(12, 'Y'));
    tick(81);
    first.next(page(['X', 'A', 'B']));
    expect(service.snapshot.newPromotionsCount).toBe(0);
    second.next(page(['Y', 'X', 'A']));
    expect(service.snapshot.newPromotionsCount).toBe(2);
  }));

  it('keeps zero when fresh verification fails', fakeAsync(() => {
    promotionService.getPromotionsFresh.and.returnValue(throwError(() => new Error('offline')));
    displayed(['A', 'B']);
    connectAndEmit(event(10, 'A'));
    source().emit('promotions', event(11, 'X'));
    tick(81);
    expect(service.snapshot.newPromotionsCount).toBe(0);
  }));

  it('does not create a badge before a displayed baseline exists', fakeAsync(() => {
    connectAndEmit(event(10, 'A'));
    source().emit('promotions', event(11, 'X'));
    tick(100);
    expect(promotionService.getPromotionsFresh).not.toHaveBeenCalled();
    expect(service.snapshot.newPromotionsCount).toBe(0);
  }));

  it('ngOnDestroy cancels verification and closes the EventSource', fakeAsync(() => {
    const response = new Subject<PagedResponse<Promotion>>();
    promotionService.getPromotionsFresh.and.returnValue(response);
    displayed(['A', 'B']);
    connectAndEmit(event(10, 'A'));
    source().emit('promotions', event(11, 'X'));
    tick(81);
    const activeSource = source();

    service.ngOnDestroy();
    response.next(page(['X', 'A']));

    expect(activeSource.readyState).toBe(MockEventSource.CLOSED);
    expect(service.snapshot.connected).toBeFalse();
    expect(service.snapshot.newPromotionsCount).toBe(0);
  }));

  function displayed(ids: string[]): void {
    service.setDisplayedFeedSnapshot(snapshot(ids));
  }

  function connectAndEmit(payload: object): void {
    service.connect();
    source().open();
    source().emit('promotions', payload);
  }

  function source(): MockEventSource {
    return MockEventSource.instances[MockEventSource.instances.length - 1];
  }
});

function event(publishedCount: number, latestPromotionId: string, latestPublishedAt = '2026-07-31T17:00:00Z') {
  return { publishedCount, latestPromotionId, latestPublishedAt };
}

function snapshot(ids: string[]) {
  return {
    promotionIds: ids,
    latestPromotionId: ids[0] ?? null,
    latestPublishedAt: '2026-07-31T17:00:00Z',
    totalElements: ids.length,
  };
}

function page(ids: string[]): PagedResponse<Promotion> {
  return {
    content: ids.map(id => ({ id } as Promotion)),
    page: 0,
    size: 12,
    totalPages: 1,
    totalElements: ids.length,
  };
}

import { TestBed, fakeAsync } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { PublicNotificationStreamService } from './public-notification-stream.service';

// Mock EventSource
class MockEventSource {
  static instances: MockEventSource[] = [];

  url: string;
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  private listeners: Record<string, ((event: MessageEvent) => void)[]> = {};
  readyState = 0;

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: (event: MessageEvent) => void): void {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(listener);
  }

  close(): void {
    this.readyState = 2;
  }

  // Test helper: simulate opening
  simulateOpen(): void {
    this.readyState = 1;
    this.onopen?.();
  }

  // Test helper: simulate message event
  simulateMessage(type: string, data: unknown): void {
    const event = new MessageEvent(type, { data: JSON.stringify(data) });
    (this.listeners[type] || []).forEach((fn) => fn(event));
  }

  // Test helper: simulate error
  simulateError(): void {
    this.onerror?.();
  }
}

describe('PublicNotificationStreamService', () => {
  let service: PublicNotificationStreamService;
  let titleService: Title;
  let originalEventSource: typeof EventSource;

  beforeEach(() => {
    MockEventSource.instances = [];
    originalEventSource = (window as any).EventSource;
    (window as any).EventSource = MockEventSource as any;

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        PublicNotificationStreamService,
      ],
    });

    service = TestBed.inject(PublicNotificationStreamService);
    titleService = TestBed.inject(Title);
    titleService.setTitle('Promoções | DescontoVivo');
  });

  afterEach(() => {
    service.disconnect();
    (window as any).EventSource = originalEventSource;
  });

  function getEventSource(): MockEventSource {
    return MockEventSource.instances[MockEventSource.instances.length - 1];
  }

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  it('should connect and set connected=true on open', () => {
    service.connect();
    const es = getEventSource();
    es.simulateOpen();

    expect(service.snapshot.connected).toBeTrue();
    expect(service.snapshot.error).toBeFalse();
  });

  it('should set error=true on EventSource error', () => {
    service.connect();
    const es = getEventSource();
    es.simulateError();

    expect(service.snapshot.connected).toBeFalse();
    expect(service.snapshot.error).toBeTrue();
  });

  it('should define baseline on first promotions event without showing badge', () => {
    service.connect();
    const es = getEventSource();
    es.simulateOpen();
    es.simulateMessage('promotions', { publishedCount: 10, latestPublishedAt: '2026-07-01T00:00:00Z' });

    expect(service.snapshot.publishedCount).toBe(10);
    expect(service.snapshot.newPromotionsCount).toBe(0);
  });

  it('should calculate newPromotionsCount when publishedCount increases', () => {
    service.connect();
    const es = getEventSource();
    es.simulateOpen();

    // First event: baseline
    es.simulateMessage('promotions', { publishedCount: 10, latestPublishedAt: null });
    expect(service.snapshot.newPromotionsCount).toBe(0);

    // Second event: count increased by 3
    es.simulateMessage('promotions', { publishedCount: 13, latestPublishedAt: '2026-07-01T12:00:00Z' });
    expect(service.snapshot.newPromotionsCount).toBe(3);
    expect(service.snapshot.publishedCount).toBe(13);
  });

  it('should not show negative count when publishedCount decreases', () => {
    service.connect();
    const es = getEventSource();
    es.simulateOpen();

    es.simulateMessage('promotions', { publishedCount: 10, latestPublishedAt: null });
    es.simulateMessage('promotions', { publishedCount: 8, latestPublishedAt: null });

    expect(service.snapshot.newPromotionsCount).toBe(0);
  });

  it('should clear new promotions count and reset baseline', () => {
    service.connect();
    const es = getEventSource();
    es.simulateOpen();

    es.simulateMessage('promotions', { publishedCount: 10, latestPublishedAt: null });
    es.simulateMessage('promotions', { publishedCount: 15, latestPublishedAt: null });
    expect(service.snapshot.newPromotionsCount).toBe(5);

    service.clearNewPromotions();
    expect(service.snapshot.newPromotionsCount).toBe(0);

    // Further events should use new baseline of 15
    es.simulateMessage('promotions', { publishedCount: 17, latestPublishedAt: null });
    expect(service.snapshot.newPromotionsCount).toBe(2);
  });

  it('should format count correctly', () => {
    expect(service.formatCount(0)).toBe('');
    expect(service.formatCount(1)).toBe('1');
    expect(service.formatCount(50)).toBe('50');
    expect(service.formatCount(99)).toBe('99');
    expect(service.formatCount(100)).toBe('99+');
    expect(service.formatCount(500)).toBe('99+');
  });

  it('should update tab title with notification prefix', fakeAsync(() => {
    service.connect();
    const es = getEventSource();
    es.simulateOpen();

    es.simulateMessage('promotions', { publishedCount: 10, latestPublishedAt: null });
    es.simulateMessage('promotions', { publishedCount: 13, latestPublishedAt: null });

    expect(titleService.getTitle()).toBe('(3) Promoções | DescontoVivo');
  }));

  it('should not stack title prefixes', fakeAsync(() => {
    service.connect();
    const es = getEventSource();
    es.simulateOpen();

    es.simulateMessage('promotions', { publishedCount: 10, latestPublishedAt: null });
    es.simulateMessage('promotions', { publishedCount: 12, latestPublishedAt: null });
    es.simulateMessage('promotions', { publishedCount: 14, latestPublishedAt: null });

    expect(titleService.getTitle()).toBe('(4) Promoções | DescontoVivo');
  }));

  it('should restore title on clearNewPromotions', fakeAsync(() => {
    service.connect();
    const es = getEventSource();
    es.simulateOpen();

    es.simulateMessage('promotions', { publishedCount: 10, latestPublishedAt: null });
    es.simulateMessage('promotions', { publishedCount: 13, latestPublishedAt: null });
    expect(titleService.getTitle()).toBe('(3) Promoções | DescontoVivo');

    service.clearNewPromotions();
    expect(titleService.getTitle()).toBe('Promoções | DescontoVivo');
  }));

  it('should use 99+ in title when count exceeds 99', fakeAsync(() => {
    service.connect();
    const es = getEventSource();
    es.simulateOpen();

    es.simulateMessage('promotions', { publishedCount: 10, latestPublishedAt: null });
    es.simulateMessage('promotions', { publishedCount: 200, latestPublishedAt: null });

    expect(titleService.getTitle()).toBe('(99+) Promoções | DescontoVivo');
  }));

  it('should not open duplicate connection if already connected', () => {
    service.connect();
    service.connect();

    expect(MockEventSource.instances.length).toBe(1);
  });

  it('should disconnect properly', () => {
    service.connect();
    const es = getEventSource();
    service.disconnect();

    expect(es.readyState).toBe(2);
    expect(service.snapshot.connected).toBeFalse();
  });

  it('should reconnect by closing old connection and opening new', () => {
    service.connect();
    const firstEs = getEventSource();
    service.reconnect();

    expect(firstEs.readyState).toBe(2);
    expect(MockEventSource.instances.length).toBe(2);
  });

  it('should handle malformed JSON gracefully', () => {
    service.connect();
    const es = getEventSource();
    es.simulateOpen();

    // Manually dispatch a malformed event
    const event = new MessageEvent('promotions', { data: 'not-json' });
    (es as any).listeners['promotions'][0](event);

    // Should not crash, state unchanged
    expect(service.snapshot.publishedCount).toBe(0);
    expect(service.snapshot.newPromotionsCount).toBe(0);
  });
});

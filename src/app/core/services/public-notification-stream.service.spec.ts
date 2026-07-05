import { TestBed, fakeAsync } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { PublicNotificationStreamService } from './public-notification-stream.service';

// Mock EventSource
class MockEventSource {
  static instances: MockEventSource[] = [];
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 2;

  url: string;
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  private listeners: Record<string, ((event: MessageEvent) => void)[]> = {};
  readyState = MockEventSource.CONNECTING;

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: (event: MessageEvent) => void): void {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(listener);
  }

  removeEventListener(type: string, listener: (event: MessageEvent) => void): void {
    if (!this.listeners[type]) return;
    this.listeners[type] = this.listeners[type].filter((fn) => fn !== listener);
  }

  close(): void {
    this.readyState = MockEventSource.CLOSED;
  }

  // Test helper: simulate opening
  simulateOpen(): void {
    this.readyState = MockEventSource.OPEN;
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

  // Test helper: simulate permanent close (no auto-reconnect)
  simulatePermanentClose(): void {
    this.readyState = MockEventSource.CLOSED;
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

  // --- Connection lifecycle ---

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

  it('should not open duplicate connection if already connected', () => {
    service.connect();
    service.connect();

    expect(MockEventSource.instances.length).toBe(1);
  });

  it('should disconnect properly', () => {
    service.connect();
    const es = getEventSource();
    service.disconnect();

    expect(es.readyState).toBe(MockEventSource.CLOSED);
    expect(service.snapshot.connected).toBeFalse();
  });

  it('should reconnect by closing old connection and opening new', () => {
    service.connect();
    const firstEs = getEventSource();
    service.reconnect();

    expect(firstEs.readyState).toBe(MockEventSource.CLOSED);
    expect(MockEventSource.instances.length).toBe(2);
  });

  it('should allow reconnection when EventSource is permanently closed', () => {
    service.connect();
    const es = getEventSource();
    es.simulatePermanentClose();

    service.connect();
    expect(MockEventSource.instances.length).toBe(2);
  });

  // --- Server vs Displayed snapshot model ---

  it('should use first SSE event as initial displayed snapshot when feed has not registered yet', () => {
    service.connect();
    const es = getEventSource();
    es.simulateOpen();
    es.simulateMessage('promotions', { publishedCount: 10, latestPublishedAt: '2026-07-01T00:00:00Z' });

    // No badge because first event is used as initial displayed state
    expect(service.snapshot.publishedCount).toBe(10);
    expect(service.snapshot.newPromotionsCount).toBe(0);
  });

  it('should show badge when server publishedCount > displayed publishedCount', () => {
    service.connect();
    const es = getEventSource();
    es.simulateOpen();

    // First event sets initial displayed snapshot
    es.simulateMessage('promotions', { publishedCount: 10, latestPublishedAt: null });
    expect(service.snapshot.newPromotionsCount).toBe(0);

    // Second event: count increased by 3
    es.simulateMessage('promotions', { publishedCount: 13, latestPublishedAt: '2026-07-01T12:00:00Z' });
    expect(service.snapshot.newPromotionsCount).toBe(3);
  });

  it('should detect staleness when feed registers snapshot older than server', () => {
    service.connect();
    const es = getEventSource();
    es.simulateOpen();

    // SSE delivers server state
    es.simulateMessage('promotions', { publishedCount: 15, latestPublishedAt: '2026-07-02T10:00:00Z' });

    // Initially no badge (first event is initial displayed)
    expect(service.snapshot.newPromotionsCount).toBe(0);

    // Feed loads from cache and registers an older snapshot
    service.setDisplayedFeedSnapshot({ publishedCount: 12, latestPublishedAt: '2026-07-01T08:00:00Z' });

    // Now badge should show difference
    expect(service.snapshot.newPromotionsCount).toBe(3);
  });

  it('should show badge when feed registers snapshot with older latestPublishedAt', () => {
    service.connect();
    const es = getEventSource();
    es.simulateOpen();

    es.simulateMessage('promotions', { publishedCount: 10, latestPublishedAt: '2026-07-02T10:00:00Z' });

    // Feed registers same count but older date
    service.setDisplayedFeedSnapshot({ publishedCount: 10, latestPublishedAt: '2026-07-01T08:00:00Z' });

    // At least 1 new promotion detected via date comparison
    expect(service.snapshot.newPromotionsCount).toBe(1);
  });

  it('should clear badge when feed catches up with server', () => {
    service.connect();
    const es = getEventSource();
    es.simulateOpen();

    es.simulateMessage('promotions', { publishedCount: 10, latestPublishedAt: '2026-07-01T08:00:00Z' });

    // Feed registers stale snapshot
    service.setDisplayedFeedSnapshot({ publishedCount: 8, latestPublishedAt: '2026-06-30T10:00:00Z' });
    expect(service.snapshot.newPromotionsCount).toBe(2);

    // Feed refreshes and catches up
    service.setDisplayedFeedSnapshot({ publishedCount: 10, latestPublishedAt: '2026-07-01T08:00:00Z' });
    expect(service.snapshot.newPromotionsCount).toBe(0);
  });

  it('should not show negative count when server count decreases', () => {
    service.connect();
    const es = getEventSource();
    es.simulateOpen();

    es.simulateMessage('promotions', { publishedCount: 10, latestPublishedAt: null });
    service.setDisplayedFeedSnapshot({ publishedCount: 10, latestPublishedAt: null });

    // Server count decreases (deletion/rejection)
    es.simulateMessage('promotions', { publishedCount: 8, latestPublishedAt: null });

    expect(service.snapshot.newPromotionsCount).toBe(0);
  });

  it('should maintain badge across navigation (no auto-clear)', () => {
    service.connect();
    const es = getEventSource();
    es.simulateOpen();

    es.simulateMessage('promotions', { publishedCount: 10, latestPublishedAt: null });
    service.setDisplayedFeedSnapshot({ publishedCount: 7, latestPublishedAt: null });
    expect(service.snapshot.newPromotionsCount).toBe(3);

    // Badge persists — no auto-clear from navigation or other events
    expect(service.snapshot.newPromotionsCount).toBe(3);
  });

  it('first SSE should not hide badge if feed loaded is stale', () => {
    // Feed registers first (from cache)
    service.setDisplayedFeedSnapshot({ publishedCount: 5, latestPublishedAt: '2026-06-30T00:00:00Z' });

    // SSE connects later with newer state
    service.connect();
    const es = getEventSource();
    es.simulateOpen();
    es.simulateMessage('promotions', { publishedCount: 8, latestPublishedAt: '2026-07-01T10:00:00Z' });

    // Badge should show 3
    expect(service.snapshot.newPromotionsCount).toBe(3);
  });

  // --- clearNewPromotions ---

  it('should clear badge and align displayed snapshot to server on clearNewPromotions', () => {
    service.connect();
    const es = getEventSource();
    es.simulateOpen();

    es.simulateMessage('promotions', { publishedCount: 15, latestPublishedAt: '2026-07-01T12:00:00Z' });
    service.setDisplayedFeedSnapshot({ publishedCount: 10, latestPublishedAt: '2026-06-30T10:00:00Z' });
    expect(service.snapshot.newPromotionsCount).toBe(5);

    service.clearNewPromotions();
    expect(service.snapshot.newPromotionsCount).toBe(0);

    // Further events use new aligned baseline
    es.simulateMessage('promotions', { publishedCount: 17, latestPublishedAt: '2026-07-01T14:00:00Z' });
    expect(service.snapshot.newPromotionsCount).toBe(2);
  });

  it('should not show badge after clear when same event arrives', () => {
    service.connect();
    const es = getEventSource();
    es.simulateOpen();

    es.simulateMessage('promotions', { publishedCount: 12, latestPublishedAt: '2026-07-01T12:00:00Z' });
    service.setDisplayedFeedSnapshot({ publishedCount: 10, latestPublishedAt: '2026-07-01T08:00:00Z' });
    expect(service.snapshot.newPromotionsCount).toBe(2);

    service.clearNewPromotions();

    // Same event (no change)
    es.simulateMessage('promotions', { publishedCount: 12, latestPublishedAt: '2026-07-01T12:00:00Z' });
    expect(service.snapshot.newPromotionsCount).toBe(0);
  });

  // --- setDisplayedFeedSnapshot edge cases ---

  it('should handle setDisplayedFeedSnapshot before any SSE event arrives', () => {
    // No SSE connected yet — feed loads before stream
    service.setDisplayedFeedSnapshot({ publishedCount: 10, latestPublishedAt: '2026-07-01T00:00:00Z' });

    // No crash, no badge yet
    expect(service.snapshot.newPromotionsCount).toBe(0);

    // SSE connects later
    service.connect();
    const es = getEventSource();
    es.simulateOpen();
    es.simulateMessage('promotions', { publishedCount: 12, latestPublishedAt: '2026-07-01T10:00:00Z' });

    // Now badge shows because displayed (10) < server (12)
    expect(service.snapshot.newPromotionsCount).toBe(2);
  });

  it('should recalculate when setDisplayedFeedSnapshot is called with higher count', () => {
    service.connect();
    const es = getEventSource();
    es.simulateOpen();

    es.simulateMessage('promotions', { publishedCount: 10, latestPublishedAt: '2026-07-01T10:00:00Z' });
    service.setDisplayedFeedSnapshot({ publishedCount: 8, latestPublishedAt: '2026-06-30T00:00:00Z' });
    expect(service.snapshot.newPromotionsCount).toBe(2);

    // Feed refreshes and loads all 10
    service.setDisplayedFeedSnapshot({ publishedCount: 10, latestPublishedAt: '2026-07-01T10:00:00Z' });
    expect(service.snapshot.newPromotionsCount).toBe(0);
  });

  // --- Reconnect preserves state ---

  it('should preserve badge count across reconnect', () => {
    service.connect();
    const es = getEventSource();
    es.simulateOpen();

    es.simulateMessage('promotions', { publishedCount: 13, latestPublishedAt: null });
    service.setDisplayedFeedSnapshot({ publishedCount: 10, latestPublishedAt: null });
    expect(service.snapshot.newPromotionsCount).toBe(3);

    // Reconnect
    service.reconnect();
    const es2 = getEventSource();
    es2.simulateOpen();

    // Stored badge count is maintained in state
    expect(service.snapshot.newPromotionsCount).toBe(3);

    // New event uses preserved displayed snapshot (10)
    es2.simulateMessage('promotions', { publishedCount: 14, latestPublishedAt: null });
    expect(service.snapshot.newPromotionsCount).toBe(4);
  });

  // --- Format ---

  it('should format count correctly', () => {
    expect(service.formatCount(0)).toBe('');
    expect(service.formatCount(1)).toBe('1');
    expect(service.formatCount(50)).toBe('50');
    expect(service.formatCount(99)).toBe('99');
    expect(service.formatCount(100)).toBe('99+');
    expect(service.formatCount(500)).toBe('99+');
  });

  // --- Tab title ---

  it('should update tab title with notification prefix', fakeAsync(() => {
    service.connect();
    const es = getEventSource();
    es.simulateOpen();

    es.simulateMessage('promotions', { publishedCount: 10, latestPublishedAt: null });
    service.setDisplayedFeedSnapshot({ publishedCount: 7, latestPublishedAt: null });

    expect(titleService.getTitle()).toBe('(3) Promoções | DescontoVivo');
  }));

  it('should not stack title prefixes', fakeAsync(() => {
    service.connect();
    const es = getEventSource();
    es.simulateOpen();

    service.setDisplayedFeedSnapshot({ publishedCount: 10, latestPublishedAt: null });
    es.simulateMessage('promotions', { publishedCount: 12, latestPublishedAt: null });
    es.simulateMessage('promotions', { publishedCount: 14, latestPublishedAt: null });

    expect(titleService.getTitle()).toBe('(4) Promoções | DescontoVivo');
  }));

  it('should restore title on clearNewPromotions', fakeAsync(() => {
    service.connect();
    const es = getEventSource();
    es.simulateOpen();

    es.simulateMessage('promotions', { publishedCount: 13, latestPublishedAt: null });
    service.setDisplayedFeedSnapshot({ publishedCount: 10, latestPublishedAt: null });
    expect(titleService.getTitle()).toBe('(3) Promoções | DescontoVivo');

    service.clearNewPromotions();
    expect(titleService.getTitle()).toBe('Promoções | DescontoVivo');
  }));

  it('should use 99+ in title when count exceeds 99', fakeAsync(() => {
    service.connect();
    const es = getEventSource();
    es.simulateOpen();

    service.setDisplayedFeedSnapshot({ publishedCount: 10, latestPublishedAt: null });
    es.simulateMessage('promotions', { publishedCount: 200, latestPublishedAt: null });

    expect(titleService.getTitle()).toBe('(99+) Promoções | DescontoVivo');
  }));

  // --- Malformed data ---

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

  // --- Visibility change ---

  it('should reconnect when tab becomes visible and connection is closed', () => {
    service.connect();
    const es = getEventSource();
    es.simulateOpen();

    // Simulate permanent close
    es.simulatePermanentClose();
    expect(MockEventSource.instances.length).toBe(1);

    // Simulate tab becoming visible
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));

    // Should have created a new connection
    expect(MockEventSource.instances.length).toBe(2);

    // Cleanup
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
  });

  it('should not create duplicate connection when tab becomes visible and connection is alive', () => {
    service.connect();
    const es = getEventSource();
    es.simulateOpen();

    // Tab becomes visible while connection is active
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));

    // Should NOT create another connection
    expect(MockEventSource.instances.length).toBe(1);
  });

  // --- Cache scenario: navigation does not clear badge ---

  it('should not clear badge when navigating away and back with cache', () => {
    service.connect();
    const es = getEventSource();
    es.simulateOpen();

    // Server says 15
    es.simulateMessage('promotions', { publishedCount: 15, latestPublishedAt: '2026-07-02T10:00:00Z' });

    // Feed loaded from cache shows 12
    service.setDisplayedFeedSnapshot({ publishedCount: 12, latestPublishedAt: '2026-07-01T08:00:00Z' });
    expect(service.snapshot.newPromotionsCount).toBe(3);

    // User navigates away (no action changes badge)
    // User comes back — feed restores same cache
    service.setDisplayedFeedSnapshot({ publishedCount: 12, latestPublishedAt: '2026-07-01T08:00:00Z' });
    expect(service.snapshot.newPromotionsCount).toBe(3); // Still stale
  });
});

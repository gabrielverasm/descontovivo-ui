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

    // Now connect() should create a new EventSource
    service.connect();
    expect(MockEventSource.instances.length).toBe(2);
  });

  it('should clear eventSource reference on permanent close', () => {
    service.connect();
    const es = getEventSource();

    // Simulate permanent failure (CLOSED state triggers in onerror)
    es.simulatePermanentClose();

    // Should be able to connect again
    service.connect();
    expect(MockEventSource.instances.length).toBe(2);
    expect(service.snapshot.error).toBeTrue(); // Still in error until new one opens
  });

  // --- Baseline and badge detection ---

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

  it('should detect new content via latestPublishedAt when count unchanged', () => {
    service.connect();
    const es = getEventSource();
    es.simulateOpen();

    // Baseline with a known timestamp
    es.simulateMessage('promotions', { publishedCount: 10, latestPublishedAt: '2026-07-01T10:00:00Z' });
    expect(service.snapshot.newPromotionsCount).toBe(0);

    // Same count but newer timestamp (one added, one removed simultaneously)
    es.simulateMessage('promotions', { publishedCount: 10, latestPublishedAt: '2026-07-01T15:00:00Z' });
    expect(service.snapshot.newPromotionsCount).toBe(1);
  });

  it('should not show badge when count and timestamp are unchanged', () => {
    service.connect();
    const es = getEventSource();
    es.simulateOpen();

    es.simulateMessage('promotions', { publishedCount: 10, latestPublishedAt: '2026-07-01T10:00:00Z' });
    es.simulateMessage('promotions', { publishedCount: 10, latestPublishedAt: '2026-07-01T10:00:00Z' });

    expect(service.snapshot.newPromotionsCount).toBe(0);
  });

  it('should not alert via latestPublishedAt when baseline has no timestamp', () => {
    service.connect();
    const es = getEventSource();
    es.simulateOpen();

    // Baseline with null timestamp
    es.simulateMessage('promotions', { publishedCount: 10, latestPublishedAt: null });

    // Same count with a timestamp — should not flag as new
    es.simulateMessage('promotions', { publishedCount: 10, latestPublishedAt: '2026-07-01T15:00:00Z' });
    expect(service.snapshot.newPromotionsCount).toBe(0);
  });

  // --- clearNewPromotions ---

  it('should clear new promotions count and reset baseline', () => {
    service.connect();
    const es = getEventSource();
    es.simulateOpen();

    es.simulateMessage('promotions', { publishedCount: 10, latestPublishedAt: null });
    es.simulateMessage('promotions', { publishedCount: 15, latestPublishedAt: '2026-07-01T12:00:00Z' });
    expect(service.snapshot.newPromotionsCount).toBe(5);

    service.clearNewPromotions();
    expect(service.snapshot.newPromotionsCount).toBe(0);

    // Further events should use new baseline of 15
    es.simulateMessage('promotions', { publishedCount: 17, latestPublishedAt: '2026-07-01T14:00:00Z' });
    expect(service.snapshot.newPromotionsCount).toBe(2);
  });

  it('should not accumulate badge after clear and equal count but same timestamp', () => {
    service.connect();
    const es = getEventSource();
    es.simulateOpen();

    es.simulateMessage('promotions', { publishedCount: 10, latestPublishedAt: '2026-07-01T10:00:00Z' });
    es.simulateMessage('promotions', { publishedCount: 12, latestPublishedAt: '2026-07-01T12:00:00Z' });
    service.clearNewPromotions();

    // Same event again (no change)
    es.simulateMessage('promotions', { publishedCount: 12, latestPublishedAt: '2026-07-01T12:00:00Z' });
    expect(service.snapshot.newPromotionsCount).toBe(0);
  });

  // --- Reconnect preserves state ---

  it('should preserve baseline and badge count across reconnect', () => {
    service.connect();
    const es = getEventSource();
    es.simulateOpen();

    es.simulateMessage('promotions', { publishedCount: 10, latestPublishedAt: null });
    es.simulateMessage('promotions', { publishedCount: 13, latestPublishedAt: null });
    expect(service.snapshot.newPromotionsCount).toBe(3);

    // Reconnect
    service.reconnect();
    const es2 = getEventSource();
    es2.simulateOpen();

    // Badge count should be preserved (newPromotionsCount stays in state)
    expect(service.snapshot.newPromotionsCount).toBe(3);

    // New event after reconnect uses preserved baseline (10)
    es2.simulateMessage('promotions', { publishedCount: 14, latestPublishedAt: null });
    expect(service.snapshot.newPromotionsCount).toBe(4);
  });

  it('should not reset baseline on reconnect when badge is pending', () => {
    service.connect();
    const es = getEventSource();
    es.simulateOpen();

    es.simulateMessage('promotions', { publishedCount: 48, latestPublishedAt: '2026-07-01T10:00:00Z' });
    es.simulateMessage('promotions', { publishedCount: 49, latestPublishedAt: '2026-07-01T12:00:00Z' });
    expect(service.snapshot.newPromotionsCount).toBe(1);

    // Simulate permanent close + reconnect
    es.simulatePermanentClose();
    service.connect();
    const es2 = getEventSource();
    es2.simulateOpen();

    // First event after reconnect should NOT reset baseline since it's already set
    es2.simulateMessage('promotions', { publishedCount: 49, latestPublishedAt: '2026-07-01T12:00:00Z' });
    expect(service.snapshot.newPromotionsCount).toBe(1); // preserved, not reset to 0
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
    document.dispatchEvent(new Event('visibilitychange'));
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

  // --- publishedCount equal after disconnect does not reset badge ---

  it('should preserve newPromotionsCount in state after disconnect', () => {
    service.connect();
    const es = getEventSource();
    es.simulateOpen();

    es.simulateMessage('promotions', { publishedCount: 10, latestPublishedAt: null });
    es.simulateMessage('promotions', { publishedCount: 13, latestPublishedAt: null });
    expect(service.snapshot.newPromotionsCount).toBe(3);

    service.disconnect();
    // newPromotionsCount should still be accessible in state (not reset)
    expect(service.snapshot.newPromotionsCount).toBe(3);
  });
});

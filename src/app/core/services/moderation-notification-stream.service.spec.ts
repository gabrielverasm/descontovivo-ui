import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ModerationNotificationStreamService } from './moderation-notification-stream.service';
import { AuthService } from './auth.service';

function createMockReadableStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let index = 0;

  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index < chunks.length) {
        controller.enqueue(encoder.encode(chunks[index]));
        index++;
      } else {
        controller.close();
      }
    },
  });
}

describe('ModerationNotificationStreamService', () => {
  let service: ModerationNotificationStreamService;
  let authServiceMock: jasmine.SpyObj<AuthService>;
  let originalFetch: typeof window.fetch;
  let fetchSpy: jasmine.Spy;

  beforeEach(() => {
    authServiceMock = jasmine.createSpyObj('AuthService', ['canModerate', 'getAccessToken']);
    authServiceMock.canModerate.and.returnValue(true);
    authServiceMock.getAccessToken.and.returnValue(of('test-token-123'));

    TestBed.configureTestingModule({
      providers: [
        ModerationNotificationStreamService,
        { provide: AuthService, useValue: authServiceMock },
      ],
    });

    service = TestBed.inject(ModerationNotificationStreamService);
    originalFetch = window.fetch;
    fetchSpy = jasmine.createSpy('fetch');
    (window as any).fetch = fetchSpy;
  });

  afterEach(() => {
    service.disconnect();
    (window as any).fetch = originalFetch;
  });

  function mockFetchResponse(chunks: string[], status = 200): void {
    const body = createMockReadableStream(chunks);
    fetchSpy.and.returnValue(
      Promise.resolve(new Response(body, { status, headers: { 'Content-Type': 'text/event-stream' } })),
    );
  }

  function mockFetchError(status: number): void {
    fetchSpy.and.returnValue(
      Promise.resolve(new Response(null, { status })),
    );
  }

  function mockFetchNetworkError(): void {
    fetchSpy.and.returnValue(Promise.reject(new TypeError('Failed to fetch')));
  }

  // --- Basic connection ---

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  it('should call fetch with correct URL ending in /events/moderation/stream', async () => {
    mockFetchResponse(['event:heartbeat\ndata:\n\n']);
    service.connect();
    await flushMicrotasks();

    expect(fetchSpy).toHaveBeenCalledWith(
      jasmine.stringMatching(/\/events\/moderation\/stream$/),
      jasmine.objectContaining({ method: 'GET' }),
    );
  });

  it('should send Authorization Bearer header', async () => {
    mockFetchResponse(['event:heartbeat\ndata:\n\n']);
    service.connect();
    await flushMicrotasks();

    const callArgs = fetchSpy.calls.mostRecent().args;
    expect(callArgs[1].headers['Authorization']).toBe('Bearer test-token-123');
  });

  it('should send Accept text/event-stream header', async () => {
    mockFetchResponse(['event:heartbeat\ndata:\n\n']);
    service.connect();
    await flushMicrotasks();

    const callArgs = fetchSpy.calls.mostRecent().args;
    expect(callArgs[1].headers['Accept']).toBe('text/event-stream');
  });

  it('should NOT put token in URL', async () => {
    mockFetchResponse(['event:heartbeat\ndata:\n\n']);
    service.connect();
    await flushMicrotasks();

    const url = fetchSpy.calls.mostRecent().args[0];
    expect(url).not.toContain('token=');
    expect(url).not.toContain('access_token=');
  });

  // --- Event parsing ---

  it('should parse moderation-promotions event and update moderationPendingCount', async () => {
    mockFetchResponse(['event:moderation-promotions\ndata:{"pendingCount":5}\n\n']);
    service.connect();
    await new Promise((r) => setTimeout(r, 50));

    expect(service.snapshot.moderationPendingCount).toBe(5);
  });

  it('should ignore admin-data-requests event', async () => {
    mockFetchResponse(['event:admin-data-requests\ndata:{"openCount":3}\n\n']);
    service.connect();
    await new Promise((r) => setTimeout(r, 50));

    // Should not have any admin-related state
    expect((service.snapshot as any).dataRequestsOpenCount).toBeUndefined();
  });

  it('should handle heartbeat event', async () => {
    mockFetchResponse(['event:heartbeat\ndata:\n\n']);
    service.connect();
    await new Promise((r) => setTimeout(r, 50));

    expect(service.snapshot.connected).toBeTrue();
    expect(service.snapshot.error).toBeFalse();
  });

  it('should handle invalid JSON without crashing', async () => {
    mockFetchResponse(['event:moderation-promotions\ndata:not-valid-json\n\n']);
    service.connect();
    await new Promise((r) => setTimeout(r, 50));

    expect(service.snapshot.moderationPendingCount).toBe(0);
  });

  it('should handle multiple events in sequence', async () => {
    mockFetchResponse([
      'event:moderation-promotions\ndata:{"pendingCount":2}\n\nevent:moderation-promotions\ndata:{"pendingCount":8}\n\n',
    ]);
    service.connect();
    await new Promise((r) => setTimeout(r, 50));

    expect(service.snapshot.moderationPendingCount).toBe(8);
  });

  it('should handle partial chunks correctly', async () => {
    mockFetchResponse([
      'event:moderation-pro',
      'motions\ndata:{"pendingCount":4}\n\n',
    ]);
    service.connect();
    await new Promise((r) => setTimeout(r, 50));

    expect(service.snapshot.moderationPendingCount).toBe(4);
  });

  // --- Disconnect ---

  it('should abort stream on disconnect', async () => {
    mockFetchResponse(['event:heartbeat\ndata:\n\n']);
    service.connect();
    await flushMicrotasks();

    service.disconnect();

    expect(service.snapshot.connected).toBeFalse();
  });

  // --- Duplicate connections ---

  it('should not open two connections when connect called twice', async () => {
    mockFetchResponse(['event:heartbeat\ndata:\n\n']);
    service.connect();
    service.connect();
    await flushMicrotasks();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  // --- Error handling ---

  it('should mark error on 401 response', async () => {
    mockFetchError(401);
    service.connect();
    await new Promise((r) => setTimeout(r, 50));

    expect(service.snapshot.connected).toBeFalse();
    expect(service.snapshot.error).toBeTrue();
  });

  it('should mark error on 403 response', async () => {
    mockFetchError(403);
    service.connect();
    await new Promise((r) => setTimeout(r, 50));

    expect(service.snapshot.connected).toBeFalse();
    expect(service.snapshot.error).toBeTrue();
  });

  it('should mark error on network failure', async () => {
    mockFetchNetworkError();
    service.connect();
    await new Promise((r) => setTimeout(r, 50));

    expect(service.snapshot.connected).toBeFalse();
    expect(service.snapshot.error).toBeTrue();
  });

  // --- Auth guards ---

  it('should not connect if user cannot moderate', async () => {
    authServiceMock.canModerate.and.returnValue(false);
    mockFetchResponse(['event:heartbeat\ndata:\n\n']);
    service.connect();
    await flushMicrotasks();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('should not connect if token retrieval fails', async () => {
    authServiceMock.getAccessToken.and.returnValue(throwError(() => new Error('no token')));
    service.connect();
    await new Promise((r) => setTimeout(r, 50));

    expect(service.snapshot.connected).toBeFalse();
    expect(service.snapshot.error).toBeTrue();
  });

  // --- formatCount ---

  it('should format count 0 as empty string', () => {
    expect(service.formatCount(0)).toBe('');
  });

  it('should format count 1-99 as string number', () => {
    expect(service.formatCount(1)).toBe('1');
    expect(service.formatCount(50)).toBe('50');
    expect(service.formatCount(99)).toBe('99');
  });

  it('should format count >99 as 99+', () => {
    expect(service.formatCount(100)).toBe('99+');
    expect(service.formatCount(500)).toBe('99+');
  });

  // --- State observable ---

  it('should emit state updates via state$', async () => {
    const states: any[] = [];
    service.state$.subscribe((s) => states.push({ ...s }));

    mockFetchResponse(['event:moderation-promotions\ndata:{"pendingCount":3}\n\n']);
    service.connect();
    await new Promise((r) => setTimeout(r, 50));

    const lastState = states[states.length - 1];
    expect(lastState.moderationPendingCount).toBe(3);
    expect(lastState.connected).toBeTrue();
  });
});

function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

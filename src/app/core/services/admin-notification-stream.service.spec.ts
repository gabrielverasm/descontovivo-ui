import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AdminNotificationStreamService } from './admin-notification-stream.service';
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

describe('AdminNotificationStreamService', () => {
  let service: AdminNotificationStreamService;
  let authServiceMock: jasmine.SpyObj<AuthService>;
  let originalFetch: typeof window.fetch;
  let fetchSpy: jasmine.Spy;

  beforeEach(() => {
    authServiceMock = jasmine.createSpyObj('AuthService', ['hasRole', 'getAccessToken']);
    authServiceMock.hasRole.and.callFake((role: string) => role === 'admin');
    authServiceMock.getAccessToken.and.returnValue(of('test-token-456'));

    TestBed.configureTestingModule({
      providers: [
        AdminNotificationStreamService,
        { provide: AuthService, useValue: authServiceMock },
      ],
    });

    service = TestBed.inject(AdminNotificationStreamService);
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

  it('should call fetch with correct URL ending in /events/admin/stream', async () => {
    mockFetchResponse(['event:heartbeat\ndata:\n\n']);
    service.connect();
    await flushMicrotasks();

    expect(fetchSpy).toHaveBeenCalledWith(
      jasmine.stringMatching(/\/events\/admin\/stream$/),
      jasmine.objectContaining({ method: 'GET' }),
    );
  });

  it('should connect only for admin role', async () => {
    mockFetchResponse(['event:heartbeat\ndata:\n\n']);
    service.connect();
    await flushMicrotasks();

    expect(authServiceMock.hasRole).toHaveBeenCalledWith('admin');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('should send Authorization Bearer header', async () => {
    mockFetchResponse(['event:heartbeat\ndata:\n\n']);
    service.connect();
    await flushMicrotasks();

    const callArgs = fetchSpy.calls.mostRecent().args;
    expect(callArgs[1].headers['Authorization']).toBe('Bearer test-token-456');
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

  // --- LF event parsing (standard) ---

  it('should parse LF admin-data-requests event and update dataRequestsOpenCount', async () => {
    mockFetchResponse(['event:admin-data-requests\ndata:{"openCount":3}\n\n']);
    service.connect();
    await new Promise((r) => setTimeout(r, 50));

    expect(service.snapshot.dataRequestsOpenCount).toBe(3);
  });

  it('should handle LF heartbeat event', async () => {
    mockFetchResponse(['event:heartbeat\ndata:\n\n']);
    service.connect();
    await new Promise((r) => setTimeout(r, 50));

    expect(service.snapshot.connected).toBeTrue();
    expect(service.snapshot.error).toBeFalse();
  });

  // --- CRLF event parsing ---

  it('should parse CRLF admin-data-requests event and update dataRequestsOpenCount', async () => {
    mockFetchResponse(['event:admin-data-requests\r\ndata:{"openCount":5}\r\n\r\n']);
    service.connect();
    await new Promise((r) => setTimeout(r, 50));

    expect(service.snapshot.dataRequestsOpenCount).toBe(5);
  });

  it('should handle CRLF heartbeat event without breaking', async () => {
    mockFetchResponse(['event:heartbeat\r\ndata:\r\n\r\n']);
    service.connect();
    await new Promise((r) => setTimeout(r, 50));

    expect(service.snapshot.connected).toBeTrue();
    expect(service.snapshot.error).toBeFalse();
  });

  it('should handle mixed LF and CRLF in same stream', async () => {
    mockFetchResponse([
      'event:heartbeat\r\ndata:\r\n\r\nevent:admin-data-requests\ndata:{"openCount":4}\n\n',
    ]);
    service.connect();
    await new Promise((r) => setTimeout(r, 50));

    expect(service.snapshot.dataRequestsOpenCount).toBe(4);
    expect(service.snapshot.connected).toBeTrue();
  });

  // --- Absolute count (no baseline) ---

  it('should use openCount as absolute value, not delta from baseline', async () => {
    mockFetchResponse([
      'event:admin-data-requests\ndata:{"openCount":2}\n\nevent:admin-data-requests\ndata:{"openCount":2}\n\n',
    ]);
    service.connect();
    await new Promise((r) => setTimeout(r, 50));

    // Count stays at 2, not accumulated
    expect(service.snapshot.dataRequestsOpenCount).toBe(2);
  });

  it('should show openCount 0 when server reports 0 (badge removed)', async () => {
    mockFetchResponse([
      'event:admin-data-requests\ndata:{"openCount":4}\n\nevent:admin-data-requests\ndata:{"openCount":0}\n\n',
    ]);
    service.connect();
    await new Promise((r) => setTimeout(r, 50));

    expect(service.snapshot.dataRequestsOpenCount).toBe(0);
  });

  it('should show openCount 2 and maintain it until server sends different count', async () => {
    mockFetchResponse(['event:admin-data-requests\ndata:{"openCount":2}\n\n']);
    service.connect();
    await new Promise((r) => setTimeout(r, 50));

    expect(service.snapshot.dataRequestsOpenCount).toBe(2);
    // Count persists
    expect(service.snapshot.dataRequestsOpenCount).toBe(2);
  });

  it('should decrease openCount when server reports lower value (requests resolved)', async () => {
    mockFetchResponse([
      'event:admin-data-requests\ndata:{"openCount":5}\n\nevent:admin-data-requests\ndata:{"openCount":1}\n\n',
    ]);
    service.connect();
    await new Promise((r) => setTimeout(r, 50));

    expect(service.snapshot.dataRequestsOpenCount).toBe(1);
  });

  // --- Other event handling ---

  it('should ignore moderation-promotions event (handled by ModerationNotificationStreamService)', async () => {
    mockFetchResponse(['event:moderation-promotions\ndata:{"pendingCount":5}\n\n']);
    service.connect();
    await new Promise((r) => setTimeout(r, 50));

    expect((service.snapshot as any).moderationPendingCount).toBeUndefined();
    expect(service.snapshot.dataRequestsOpenCount).toBe(0);
  });

  it('should handle invalid JSON without crashing', async () => {
    mockFetchResponse(['event:admin-data-requests\ndata:not-valid-json\n\n']);
    service.connect();
    await new Promise((r) => setTimeout(r, 50));

    expect(service.snapshot.dataRequestsOpenCount).toBe(0);
  });

  it('should handle partial chunks correctly', async () => {
    mockFetchResponse([
      'event:admin-data-',
      'requests\ndata:{"openCount":7}\n\n',
    ]);
    service.connect();
    await new Promise((r) => setTimeout(r, 50));

    expect(service.snapshot.dataRequestsOpenCount).toBe(7);
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

  it('should not connect if user is not admin', async () => {
    authServiceMock.hasRole.and.returnValue(false);
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

    mockFetchResponse(['event:admin-data-requests\ndata:{"openCount":9}\n\n']);
    service.connect();
    await new Promise((r) => setTimeout(r, 50));

    const lastState = states[states.length - 1];
    expect(lastState.dataRequestsOpenCount).toBe(9);
    expect(lastState.connected).toBeTrue();
  });
});

function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

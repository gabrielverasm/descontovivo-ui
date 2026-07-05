import { Injectable, inject, NgZone, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

export interface AdminNotificationState {
  connected: boolean;
  error: boolean;
  dataRequestsOpenCount: number;
}

@Injectable({ providedIn: 'root' })
export class AdminNotificationStreamService implements OnDestroy {
  private readonly ngZone = inject(NgZone);
  private readonly authService = inject(AuthService);

  private abortController: AbortController | null = null;
  private reading = false;

  private readonly stateSubject = new BehaviorSubject<AdminNotificationState>({
    connected: false,
    error: false,
    dataRequestsOpenCount: 0,
  });

  readonly state$: Observable<AdminNotificationState> = this.stateSubject.asObservable();

  get snapshot(): AdminNotificationState {
    return this.stateSubject.value;
  }

  connect(): void {
    if (typeof window === 'undefined' || !('fetch' in window)) return;
    if (this.reading) return;

    if (!this.authService.hasRole('admin')) return;

    this.reading = true;
    this.startStream();
  }

  disconnect(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.reading = false;
    this.updateState({ connected: false, error: false });
  }

  ngOnDestroy(): void {
    this.disconnect();
  }

  formatCount(count: number): string {
    if (count <= 0) return '';
    if (count > 99) return '99+';
    return String(count);
  }

  // --- Private ---

  private async startStream(): Promise<void> {
    let token: string;
    try {
      token = await firstValueFrom(this.authService.getAccessToken());
    } catch {
      this.ngZone.run(() => {
        this.updateState({ connected: false, error: true });
      });
      this.reading = false;
      return;
    }

    if (!token) {
      this.ngZone.run(() => {
        this.updateState({ connected: false, error: true });
      });
      this.reading = false;
      return;
    }

    const url = `${environment.apiBaseUrl}/events/admin/stream`;
    this.abortController = new AbortController();

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'text/event-stream',
        },
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        this.ngZone.run(() => {
          this.updateState({ connected: false, error: true });
        });
        this.reading = false;
        return;
      }

      this.ngZone.run(() => {
        this.updateState({ connected: true, error: false });
      });

      await this.readStream(response);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      this.ngZone.run(() => {
        this.updateState({ connected: false, error: true });
      });
    } finally {
      this.reading = false;
    }
  }

  private async readStream(response: Response): Promise<void> {
    const reader = response.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let buffer = '';
    let currentEvent = '';
    let currentData = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');

        buffer = lines.pop() ?? '';

        for (const rawLine of lines) {
          // Handle CRLF: server may send \r\n; after split('\n') the \r remains
          const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine;

          if (line.startsWith('event:')) {
            currentEvent = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            currentData = line.slice(5).trim();
          } else if (line === '') {
            if (currentEvent && currentData) {
              this.handleEvent(currentEvent, currentData);
            } else if (currentEvent === 'heartbeat') {
              this.ngZone.run(() => {
                this.updateState({ connected: true, error: false });
              });
            }
            currentEvent = '';
            currentData = '';
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      throw err;
    } finally {
      reader.releaseLock();
    }
  }

  private handleEvent(eventName: string, data: string): void {
    switch (eventName) {
      case 'admin-data-requests':
        this.parseAdminDataRequests(data);
        break;
      case 'heartbeat':
        this.ngZone.run(() => {
          this.updateState({ connected: true, error: false });
        });
        break;
      // moderation-promotions is intentionally ignored here;
      // moderation counts come from ModerationNotificationStreamService.
    }
  }

  private parseAdminDataRequests(data: string): void {
    try {
      const parsed = JSON.parse(data);
      const openCount = typeof parsed.openCount === 'number' ? parsed.openCount : 0;
      this.ngZone.run(() => {
        this.updateState({ dataRequestsOpenCount: openCount, connected: true, error: false });
      });
    } catch {
      // Invalid JSON — ignore silently
    }
  }

  private updateState(partial: Partial<AdminNotificationState>): void {
    this.stateSubject.next({ ...this.stateSubject.value, ...partial });
  }
}

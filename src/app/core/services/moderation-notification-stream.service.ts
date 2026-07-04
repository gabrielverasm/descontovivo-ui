import { Injectable, inject, NgZone, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

export interface ModerationNotificationState {
  connected: boolean;
  error: boolean;
  moderationPendingCount: number;
}

@Injectable({ providedIn: 'root' })
export class ModerationNotificationStreamService implements OnDestroy {
  private readonly ngZone = inject(NgZone);
  private readonly authService = inject(AuthService);

  private abortController: AbortController | null = null;
  private reading = false;

  private readonly stateSubject = new BehaviorSubject<ModerationNotificationState>({
    connected: false,
    error: false,
    moderationPendingCount: 0,
  });

  readonly state$: Observable<ModerationNotificationState> = this.stateSubject.asObservable();

  get snapshot(): ModerationNotificationState {
    return this.stateSubject.value;
  }

  connect(): void {
    if (typeof window === 'undefined' || !('fetch' in window)) return;
    if (this.reading) return;

    if (!this.authService.canModerate()) return;

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

    const url = `${environment.apiBaseUrl}/events/moderation/stream`;
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

        for (const line of lines) {
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
      case 'moderation-promotions':
        this.parseModerationPromotions(data);
        break;
      case 'heartbeat':
        this.ngZone.run(() => {
          this.updateState({ connected: true, error: false });
        });
        break;
    }
  }

  private parseModerationPromotions(data: string): void {
    try {
      const parsed = JSON.parse(data);
      const pendingCount = typeof parsed.pendingCount === 'number' ? parsed.pendingCount : 0;
      this.ngZone.run(() => {
        this.updateState({ moderationPendingCount: pendingCount, connected: true, error: false });
      });
    } catch {
      // Invalid JSON — ignore silently
    }
  }

  private updateState(partial: Partial<ModerationNotificationState>): void {
    this.stateSubject.next({ ...this.stateSubject.value, ...partial });
  }
}

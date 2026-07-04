import { Injectable, inject, NgZone, OnDestroy } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Router, NavigationEnd } from '@angular/router';
import { BehaviorSubject, Observable, Subscription, filter } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PublicPromotionsEvent {
  publishedCount: number;
  latestPublishedAt: string | null;
}

export interface PublicNotificationState {
  connected: boolean;
  error: boolean;
  publishedCount: number;
  latestPublishedAt: string | null;
  newPromotionsCount: number;
}

@Injectable({ providedIn: 'root' })
export class PublicNotificationStreamService implements OnDestroy {
  private readonly ngZone = inject(NgZone);
  private readonly titleService = inject(Title);
  private readonly router = inject(Router);

  private eventSource: EventSource | null = null;
  private baselinePublishedCount: number | null = null;
  private baseTitle = '';
  private routerSub: Subscription | null = null;

  private readonly stateSubject = new BehaviorSubject<PublicNotificationState>({
    connected: false,
    error: false,
    publishedCount: 0,
    latestPublishedAt: null,
    newPromotionsCount: 0,
  });

  readonly state$: Observable<PublicNotificationState> = this.stateSubject.asObservable();

  get snapshot(): PublicNotificationState {
    return this.stateSubject.value;
  }

  connect(): void {
    if (typeof window === 'undefined' || !('EventSource' in window)) return;
    if (this.eventSource) return;

    this.subscribeToRouterEvents();

    const url = `${environment.apiBaseUrl}/events/public/stream`;

    this.ngZone.runOutsideAngular(() => {
      this.eventSource = new EventSource(url);

      this.eventSource.onopen = () => {
        this.ngZone.run(() => {
          this.updateState({ connected: true, error: false });
        });
      };

      this.eventSource.addEventListener('promotions', (event: MessageEvent) => {
        this.ngZone.run(() => {
          this.handlePromotionsEvent(event);
        });
      });

      this.eventSource.addEventListener('heartbeat', () => {
        // Heartbeat received — connection is alive. No state change needed.
      });

      this.eventSource.onerror = () => {
        this.ngZone.run(() => {
          this.updateState({ connected: false, error: true });
        });
        // EventSource reconnects automatically; no manual retry needed.
      };
    });
  }

  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.updateState({ connected: false, error: false });
    this.routerSub?.unsubscribe();
    this.routerSub = null;
  }

  reconnect(): void {
    this.disconnect();
    this.connect();
  }

  clearNewPromotions(): void {
    const current = this.stateSubject.value;
    this.baselinePublishedCount = current.publishedCount;
    this.updateState({ newPromotionsCount: 0 });
    this.restoreBaseTitle();
  }

  ngOnDestroy(): void {
    this.disconnect();
  }

  /** Format count for display: 1-99 or "99+" */
  formatCount(count: number): string {
    if (count <= 0) return '';
    if (count > 99) return '99+';
    return String(count);
  }

  // --- Private ---

  private handlePromotionsEvent(event: MessageEvent): void {
    let data: PublicPromotionsEvent;
    try {
      data = JSON.parse(event.data);
    } catch {
      return;
    }

    const { publishedCount, latestPublishedAt } = data;

    // First event defines the baseline — no badge shown
    if (this.baselinePublishedCount === null) {
      this.baselinePublishedCount = publishedCount;
      this.updateState({
        connected: true,
        error: false,
        publishedCount,
        latestPublishedAt,
        newPromotionsCount: 0,
      });
      return;
    }

    // Calculate new promotions
    let newCount = publishedCount - this.baselinePublishedCount;
    if (newCount < 0) {
      // Count decreased (deletion/moderation) — don't show negative, reset baseline
      this.baselinePublishedCount = publishedCount;
      newCount = 0;
    }

    this.updateState({
      connected: true,
      error: false,
      publishedCount,
      latestPublishedAt,
      newPromotionsCount: newCount,
    });

    this.updateTabTitle(newCount);
  }

  private updateState(partial: Partial<PublicNotificationState>): void {
    this.stateSubject.next({ ...this.stateSubject.value, ...partial });
  }

  private updateTabTitle(count: number): void {
    if (typeof document === 'undefined') return;

    const currentTitle = this.titleService.getTitle();
    const stripped = this.stripNotificationPrefix(currentTitle);

    if (count > 0) {
      this.baseTitle = stripped;
      const prefix = count > 99 ? '(99+)' : `(${count})`;
      this.titleService.setTitle(`${prefix} ${stripped}`);
    } else {
      this.titleService.setTitle(stripped);
    }
  }

  private restoreBaseTitle(): void {
    if (typeof document === 'undefined') return;
    const currentTitle = this.titleService.getTitle();
    const stripped = this.stripNotificationPrefix(currentTitle);
    this.titleService.setTitle(stripped);
  }

  private stripNotificationPrefix(title: string): string {
    return title.replace(/^\(\d+\+?\)\s+/, '');
  }

  private subscribeToRouterEvents(): void {
    if (this.routerSub) return;

    this.routerSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => {
        // After navigation, Angular sets the route title.
        // Re-apply notification prefix if there are new promotions.
        const count = this.stateSubject.value.newPromotionsCount;
        if (count > 0) {
          // Small delay to ensure Angular's TitleStrategy has run
          setTimeout(() => this.updateTabTitle(count), 0);
        }
      });
  }
}

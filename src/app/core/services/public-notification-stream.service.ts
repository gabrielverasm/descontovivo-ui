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

export interface DisplayedFeedSnapshot {
  publishedCount?: number;
  latestPublishedAt?: string | null;
}

@Injectable({ providedIn: 'root' })
export class PublicNotificationStreamService implements OnDestroy {
  private readonly ngZone = inject(NgZone);
  private readonly titleService = inject(Title);
  private readonly router = inject(Router);

  private eventSource: EventSource | null = null;
  private routerSub: Subscription | null = null;
  private visibilityHandler: (() => void) | null = null;

  // Server snapshot — updated by SSE events
  private serverPublishedCount: number | null = null;
  private serverLatestPublishedAt: string | null = null;

  // Displayed snapshot — updated by the feed component after loading
  private displayedPublishedCount: number | null = null;
  private displayedLatestPublishedAt: string | null = null;

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

    // Allow reconnection if EventSource is closed (readyState === 2)
    if (this.eventSource && this.eventSource.readyState !== EventSource.CLOSED) return;

    // Clean up closed EventSource reference
    if (this.eventSource && this.eventSource.readyState === EventSource.CLOSED) {
      this.eventSource = null;
    }

    this.subscribeToRouterEvents();
    this.subscribeToVisibilityChange();

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

          // If EventSource is permanently closed (won't auto-reconnect),
          // clear the reference so connect() can create a new one
          if (this.eventSource?.readyState === EventSource.CLOSED) {
            this.eventSource = null;
          }
        });
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
    this.unsubscribeVisibilityChange();
  }

  reconnect(): void {
    this.disconnect();
    this.connect();
  }

  /**
   * Called by the feed component after successfully loading promotions.
   * Registers what the user is currently seeing so we can compare against the server.
   */
  setDisplayedFeedSnapshot(snapshot: DisplayedFeedSnapshot): void {
    if (snapshot.publishedCount !== undefined) {
      this.displayedPublishedCount = snapshot.publishedCount;
    }
    if (snapshot.latestPublishedAt !== undefined) {
      this.displayedLatestPublishedAt = snapshot.latestPublishedAt ?? null;
    }
    this.recalculateNewPromotionsCount();
  }

  /**
   * Clears the badge only if the displayed feed is now aligned with the server.
   * Called after refreshFeed() completes successfully.
   */
  clearNewPromotions(): void {
    // Align displayed snapshot to current server state
    if (this.serverPublishedCount !== null) {
      this.displayedPublishedCount = this.serverPublishedCount;
    }
    if (this.serverLatestPublishedAt !== null) {
      this.displayedLatestPublishedAt = this.serverLatestPublishedAt;
    }
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

    // Update server snapshot
    this.serverPublishedCount = publishedCount;
    this.serverLatestPublishedAt = latestPublishedAt;

    // If no displayed snapshot exists yet, use first server event as initial displayed state.
    // The feed component will override this when it calls setDisplayedFeedSnapshot().
    if (this.displayedPublishedCount === null && this.displayedLatestPublishedAt === null) {
      this.displayedPublishedCount = publishedCount;
      this.displayedLatestPublishedAt = latestPublishedAt;
    }

    this.updateState({
      connected: true,
      error: false,
      publishedCount,
      latestPublishedAt,
    });

    this.recalculateNewPromotionsCount();
  }

  private recalculateNewPromotionsCount(): void {
    if (this.serverPublishedCount === null) {
      // No server data yet — nothing to compare
      return;
    }

    let newCount = 0;

    // Primary: compare counts
    if (this.displayedPublishedCount !== null && this.serverPublishedCount > this.displayedPublishedCount) {
      newCount = this.serverPublishedCount - this.displayedPublishedCount;
    }

    // Edge case: count is same but latestPublishedAt is newer
    // (one added + one removed simultaneously)
    if (
      newCount === 0 &&
      this.serverLatestPublishedAt &&
      this.displayedLatestPublishedAt &&
      this.serverLatestPublishedAt > this.displayedLatestPublishedAt
    ) {
      newCount = 1;
    }

    // If server count is lower (deletion/moderation), no negative badge
    if (newCount < 0) {
      newCount = 0;
    }

    this.updateState({ newPromotionsCount: newCount });
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

  private subscribeToVisibilityChange(): void {
    if (typeof document === 'undefined' || this.visibilityHandler) return;

    this.visibilityHandler = () => {
      if (document.visibilityState === 'visible') {
        // Tab became visible again — ensure connection is alive
        if (!this.eventSource || this.eventSource.readyState === EventSource.CLOSED) {
          this.connect();
        }
      }
    };

    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  private unsubscribeVisibilityChange(): void {
    if (typeof document === 'undefined' || !this.visibilityHandler) return;
    document.removeEventListener('visibilitychange', this.visibilityHandler);
    this.visibilityHandler = null;
  }
}

import { Injectable, inject, NgZone, OnDestroy } from '@angular/core';
import { BehaviorSubject, EMPTY, Observable, Subject, Subscription } from 'rxjs';
import { catchError, debounceTime, map, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { PromotionService } from './promotion.service';

export interface PublicPromotionsEvent {
  publishedCount: number;
  latestPromotionId?: string | null;
  latestPublishedAt: string | null;
}

export interface PublicNotificationState {
  connected: boolean;
  error: boolean;
  publishedCount: number;
  latestPromotionId: string | null;
  latestPublishedAt: string | null;
  newPromotionsCount: number;
  newPromotionsCountIsLowerBound: boolean;
}

export interface DisplayedFeedSnapshot {
  promotionIds: string[];
  latestPromotionId: string | null;
  latestPublishedAt: string | null;
  totalElements: number;
}

interface VerificationRequest {
  fingerprint: string;
  displayedRevision: number;
  displayedIds: string[];
  pageSize: number;
}

@Injectable({ providedIn: 'root' })
export class PublicNotificationStreamService implements OnDestroy {
  private readonly ngZone = inject(NgZone);
  private readonly promotionService = inject(PromotionService);

  private eventSource: EventSource | null = null;
  private visibilityHandler: (() => void) | null = null;
  private hasReceivedServerBaseline = false;
  private lastServerFingerprint: string | null = null;
  private displayedRevision = 0;
  private displayedIds: string[] = [];
  private displayedSnapshotRegistered = false;

  private readonly verificationRequests = new Subject<VerificationRequest>();
  private readonly verificationSubscription: Subscription;

  private readonly stateSubject = new BehaviorSubject<PublicNotificationState>({
    connected: false,
    error: false,
    publishedCount: 0,
    latestPromotionId: null,
    latestPublishedAt: null,
    newPromotionsCount: 0,
    newPromotionsCountIsLowerBound: false,
  });

  readonly state$: Observable<PublicNotificationState> = this.stateSubject.asObservable();

  constructor() {
    this.verificationSubscription = this.verificationRequests.pipe(
      debounceTime(80),
      switchMap(request => this.promotionService.getPromotionsFresh(0, request.pageSize).pipe(
        map(response => ({ request, freshIds: response.content.map(promotion => promotion.id) })),
        catchError(() => EMPTY),
      )),
    ).subscribe(({ request, freshIds }) => {
      if (request.displayedRevision !== this.displayedRevision) return;
      const confirmation = this.countLeadingNewPromotions(request.displayedIds, freshIds);
      this.updateState({
        newPromotionsCount: confirmation.count,
        newPromotionsCountIsLowerBound: confirmation.isLowerBound,
      });
    });
  }

  get snapshot(): PublicNotificationState {
    return this.stateSubject.value;
  }

  connect(): void {
    if (typeof window === 'undefined' || !('EventSource' in window)) return;
    if (this.eventSource && this.eventSource.readyState !== EventSource.CLOSED) return;
    if (this.eventSource?.readyState === EventSource.CLOSED) this.eventSource = null;

    this.subscribeToVisibilityChange();
    const url = `${environment.apiBaseUrl}/events/public/stream`;

    this.ngZone.runOutsideAngular(() => {
      this.eventSource = new EventSource(url);
      this.eventSource.onopen = () => this.ngZone.run(() =>
        this.updateState({ connected: true, error: false }));
      this.eventSource.addEventListener('promotions', (event: MessageEvent) =>
        this.ngZone.run(() => this.handlePromotionsEvent(event)));
      this.eventSource.addEventListener('heartbeat', () => undefined);
      this.eventSource.onerror = () => this.ngZone.run(() => {
        this.updateState({ connected: false, error: true });
        if (this.eventSource?.readyState === EventSource.CLOSED) this.eventSource = null;
      });
    });
  }

  disconnect(): void {
    this.eventSource?.close();
    this.eventSource = null;
    this.updateState({ connected: false, error: false });
    this.unsubscribeVisibilityChange();
  }

  reconnect(): void {
    this.disconnect();
    this.connect();
  }

  /** Registers the authoritative first page currently visible to the user. */
  setDisplayedFeedSnapshot(snapshot: DisplayedFeedSnapshot): void {
    this.displayedIds = [...snapshot.promotionIds];
    this.displayedSnapshotRegistered = true;
    this.displayedRevision += 1;
    this.updateState({ newPromotionsCount: 0, newPromotionsCountIsLowerBound: false });
  }

  /** Kept for callers during rollout; never copies an unverified SSE snapshot. */
  clearNewPromotions(): void {
    this.updateState({ newPromotionsCount: 0, newPromotionsCountIsLowerBound: false });
  }

  ngOnDestroy(): void {
    this.verificationSubscription.unsubscribe();
    this.disconnect();
  }

  formatCount(count: number, isLowerBound = false): string {
    if (count <= 0) return '';
    if (count > 99) return '99+';
    return `${count}${isLowerBound ? '+' : ''}`;
  }

  private handlePromotionsEvent(event: MessageEvent): void {
    let data: PublicPromotionsEvent;
    try {
      data = JSON.parse(event.data);
    } catch {
      return;
    }
    if (!Number.isSafeInteger(data.publishedCount) || data.publishedCount < 0) return;

    const latestPromotionId = typeof data.latestPromotionId === 'string' ? data.latestPromotionId : null;
    const latestPublishedAt = typeof data.latestPublishedAt === 'string' ? data.latestPublishedAt : null;
    const fingerprint = this.serverFingerprint(data.publishedCount, latestPromotionId, latestPublishedAt);

    this.updateState({
      connected: true,
      error: false,
      publishedCount: data.publishedCount,
      latestPromotionId,
      latestPublishedAt,
    });

    if (!this.hasReceivedServerBaseline) {
      this.hasReceivedServerBaseline = true;
      this.lastServerFingerprint = fingerprint;
      return;
    }
    if (fingerprint === this.lastServerFingerprint) return;
    this.lastServerFingerprint = fingerprint;
    if (!this.displayedSnapshotRegistered) return;

    this.verificationRequests.next({
      fingerprint,
      displayedRevision: this.displayedRevision,
      displayedIds: [...this.displayedIds],
      pageSize: Math.max(this.displayedIds.length, 12),
    });
  }

  private serverFingerprint(count: number, id: string | null, timestamp: string | null): string {
    const instant = timestamp == null ? '' : Date.parse(timestamp);
    const normalizedInstant = typeof instant === 'number' && Number.isFinite(instant) ? String(instant) : timestamp ?? '';
    return `${count}|${id ?? ''}|${normalizedInstant}`;
  }

  private countLeadingNewPromotions(displayedIds: string[], freshIds: string[]): { count: number; isLowerBound: boolean } {
    if (freshIds.length === 0 || displayedIds.length === 0) {
      return { count: 0, isLowerBound: false };
    }
    const displayed = new Set(displayedIds);
    if (displayed.has(freshIds[0])) return { count: 0, isLowerBound: false };

    const firstCommonIndex = freshIds.findIndex(id => displayed.has(id));
    if (firstCommonIndex >= 0) {
      return { count: firstCommonIndex, isLowerBound: false };
    }
    return {
      count: freshIds.filter(id => !displayed.has(id)).length,
      isLowerBound: freshIds.length > 0,
    };
  }

  private updateState(partial: Partial<PublicNotificationState>): void {
    this.stateSubject.next({ ...this.stateSubject.value, ...partial });
  }

  private subscribeToVisibilityChange(): void {
    if (typeof document === 'undefined' || this.visibilityHandler) return;
    this.visibilityHandler = () => {
      if (document.visibilityState === 'visible'
        && (!this.eventSource || this.eventSource.readyState === EventSource.CLOSED)) {
        this.connect();
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

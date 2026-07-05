import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ConsentStatus = 'pending' | 'granted' | 'denied';

const CONSENT_KEY = 'descontovivo_analytics_consent';

@Injectable({ providedIn: 'root' })
export class AnalyticsConsentService {
  private readonly statusSubject = new BehaviorSubject<ConsentStatus>(this.loadConsent());
  readonly status$ = this.statusSubject.asObservable();

  get currentStatus(): ConsentStatus {
    return this.statusSubject.value;
  }

  get hasDecided(): boolean {
    return this.currentStatus !== 'pending';
  }

  grant(): void {
    this.persist('granted');
  }

  deny(): void {
    this.persist('denied');
  }

  reset(): void {
    try {
      localStorage.removeItem(CONSENT_KEY);
    } catch { /* noop */ }
    this.statusSubject.next('pending');
  }

  private persist(status: ConsentStatus): void {
    try {
      localStorage.setItem(CONSENT_KEY, status);
    } catch { /* noop */ }
    this.statusSubject.next(status);
  }

  private loadConsent(): ConsentStatus {
    try {
      const stored = localStorage.getItem(CONSENT_KEY);
      if (stored === 'granted' || stored === 'denied') return stored;
    } catch { /* noop */ }
    return 'pending';
  }
}

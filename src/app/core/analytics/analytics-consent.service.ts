import { Injectable, signal } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ConsentStatus = 'pending' | 'granted' | 'denied';

const CONSENT_KEY = 'descontovivo_analytics_consent';
const CONSENT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 * 2;

@Injectable({ providedIn: 'root' })
export class AnalyticsConsentService {
  private readonly statusSubject = new BehaviorSubject<ConsentStatus>(this.loadConsent());
  readonly status = signal<ConsentStatus>(this.statusSubject.value);
  readonly status$ = this.statusSubject.asObservable();

  get currentStatus(): ConsentStatus {
    return this.status();
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
    this.writeCookie('');
    this.setStatus('pending');
  }

  private persist(status: ConsentStatus): void {
    try {
      localStorage.setItem(CONSENT_KEY, status);
    } catch { /* noop */ }
    // Safari/iOS webviews can reject localStorage while still allowing a
    // first-party cookie. Keeping both prevents the banner from reappearing
    // after a reload in those browsers.
    this.writeCookie(status);
    this.setStatus(status);
  }

  private setStatus(status: ConsentStatus): void {
    this.status.set(status);
    this.statusSubject.next(status);
  }

  private loadConsent(): ConsentStatus {
    try {
      const stored = localStorage.getItem(CONSENT_KEY);
      if (stored === 'granted' || stored === 'denied') return stored;
    } catch { /* noop */ }

    try {
      const stored = document.cookie
        .split('; ')
        .find((entry) => entry.startsWith(`${CONSENT_KEY}=`))
        ?.split('=')[1];
      if (stored === 'granted' || stored === 'denied') return stored;
    } catch { /* noop */ }

    return 'pending';
  }

  private writeCookie(value: ConsentStatus | ''): void {
    try {
      document.cookie = value
        ? `${CONSENT_KEY}=${value}; Max-Age=${CONSENT_COOKIE_MAX_AGE}; Path=/; SameSite=Lax`
        : `${CONSENT_KEY}=; Max-Age=0; Path=/; SameSite=Lax`;
    } catch { /* noop */ }
  }
}

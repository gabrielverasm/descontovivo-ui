import { Injectable, OnDestroy, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { filter, Subscription } from 'rxjs';

import { analyticsConfig } from './analytics-config';
import { AnalyticsConsentService } from './analytics-consent.service';
import {
  buildPageViewParams,
  ClickStoreParams,
  CommentSubmitParams,
  PageViewParams,
  PromotionVoteParams,
  ShareParams,
  ViewPromotionParams,
} from './analytics-events';
import { UI_VERSION } from '../app-version';

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

/**
 * AnalyticsService — GA4 event layer.
 *
 * The gtag.js script is loaded statically via index.html with consent default
 * denied and send_page_view: false. This service is responsible for:
 * - Listening to consent changes and calling gtag('consent', 'update', ...)
 * - Sending page_view on SPA navigation (manual, no duplicates)
 * - Sending business events when consent is granted
 *
 * It does NOT inject scripts or manage the dataLayer initialization.
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsService implements OnDestroy {
  private readonly router = inject(Router);
  private readonly titleService = inject(Title);
  private readonly consent = inject(AnalyticsConsentService);

  private routerSub: Subscription | null = null;
  private consentSub: Subscription | null = null;
  private initialized = false;
  private lastTrackedPath = '';

  /**
   * Call once from AppComponent.ngOnInit() to wire up page view tracking
   * and consent listeners.
   *
   * In development: events are logged to console (no GA4 requests sent).
   * In production: events are sent to GA4 only after consent is granted.
   */
  init(): void {
    if (this.initialized) return;
    this.initialized = true;

    if (analyticsConfig.debug) {
      console.log('[Analytics] Init', {
        ga4Enabled: analyticsConfig.ga4Enabled,
        debug: analyticsConfig.debug,
      });
    }

    // Listen to consent changes — update GA4 consent mode accordingly
    if (analyticsConfig.ga4Enabled) {
      this.consentSub = this.consent.status$.subscribe((status) => {
        this.updateConsent(status);

        // When consent becomes granted, fire current page_view if not yet tracked
        if (status === 'granted') {
          this.fireCurrentPageViewOnce();
        }
      });
    }

    // Track page views on route change — works in BOTH dev and prod
    this.routerSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((event) => {
        const path = event.urlAfterRedirects;
        if (path === this.lastTrackedPath) return;
        this.lastTrackedPath = path;

        // Delay to let TitleStrategy set the new title
        setTimeout(() => {
          this.trackPageView(buildPageViewParams(path, this.titleService.getTitle()));
        }, 0);
      });

    // Safe initial page_view: if NavigationEnd already fired before subscription
    this.trackInitialPageViewIfMissed();
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
    this.consentSub?.unsubscribe();
  }

  // --- Public tracking methods ---

  trackPageView(params: PageViewParams): void {
    this.sendEvent('page_view', params);
  }

  trackViewPromotion(params: ViewPromotionParams): void {
    this.sendEvent('view_promotion', params);
  }

  trackClickStore(params: ClickStoreParams): void {
    this.sendEvent('click_store', params);
  }

  trackSharePromotion(params: ShareParams): void {
    this.sendEvent('share', params);
  }

  trackLoginStart(): void {
    this.sendEvent('login_start', { ui_version: UI_VERSION });
  }

  trackSignUpStart(): void {
    this.sendEvent('sign_up_start', { ui_version: UI_VERSION });
  }

  trackPromotionSubmitStart(): void {
    this.sendEvent('promotion_submit_start', { ui_version: UI_VERSION });
  }

  trackPromotionSubmit(): void {
    this.sendEvent('promotion_submit', { ui_version: UI_VERSION });
  }

  trackPromotionVote(params: PromotionVoteParams): void {
    this.sendEvent('promotion_vote', params);
  }

  trackCommentSubmit(params: CommentSubmitParams): void {
    this.sendEvent('comment_submit', params);
  }

  trackError(description: string, fatal = false): void {
    this.sendEvent('exception', { description, fatal, ui_version: UI_VERSION });
  }

  // --- Private ---

  private sendEvent(eventName: string, params: object): void {
    // Always log in debug mode (development) for local validation
    if (analyticsConfig.debug) {
      console.log(`[Analytics] Event: ${eventName}`, params);
    }

    // If GA4 is not enabled (dev, or prod without measurement ID), stop here
    if (!analyticsConfig.ga4Enabled) {
      return;
    }

    // Block sending if consent is not granted
    if (this.consent.currentStatus !== 'granted') {
      if (analyticsConfig.debug) {
        console.log(`[Analytics] Blocked (consent=${this.consent.currentStatus}): ${eventName}`);
      }
      return;
    }

    // Send via window.gtag (loaded by index.html)
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, params);
    }
  }

  /**
   * Updates GA4 consent mode. Called when user grants or denies analytics.
   */
  private updateConsent(status: string): void {
    if (typeof window.gtag !== 'function') return;

    if (status === 'granted') {
      window.gtag('consent', 'update', {
        analytics_storage: 'granted',
      });

      if (analyticsConfig.debug) {
        console.log('[Analytics] Consent updated to granted');
      }
    } else if (status === 'denied') {
      window.gtag('consent', 'update', {
        analytics_storage: 'denied',
      });

      if (analyticsConfig.debug) {
        console.log('[Analytics] Consent updated to denied');
      }
    }
  }

  /**
   * Fires a page_view for the current route if consent was just granted
   * and no page_view has been sent yet for the current path.
   */
  private fireCurrentPageViewOnce(): void {
    const currentPath = this.router.url || '/';

    if (currentPath === this.lastTrackedPath) {
      // Already tracked via router subscription — just need to re-send since
      // the original send was blocked by consent. Send it now.
      const title = this.titleService.getTitle();
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'page_view', buildPageViewParams(currentPath, title));
      }
      return;
    }

    this.lastTrackedPath = currentPath;
    this.trackPageView(buildPageViewParams(currentPath, this.titleService.getTitle()));
  }

  /**
   * Handles the case where Angular's initial NavigationEnd fires before
   * we subscribe to router.events. Uses setTimeout to let the router
   * stabilize and then tracks the current URL if no page_view was recorded.
   */
  private trackInitialPageViewIfMissed(): void {
    setTimeout(() => {
      if (this.lastTrackedPath === '') {
        const currentPath = this.router.url || '/';
        this.lastTrackedPath = currentPath;
        this.trackPageView(buildPageViewParams(currentPath, this.titleService.getTitle()));
      }
    }, 0);
  }
}

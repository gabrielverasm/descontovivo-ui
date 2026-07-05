import { DOCUMENT } from '@angular/common';
import { inject, Injectable, OnDestroy } from '@angular/core';
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

@Injectable({ providedIn: 'root' })
export class AnalyticsService implements OnDestroy {
  private readonly router = inject(Router);
  private readonly titleService = inject(Title);
  private readonly document = inject(DOCUMENT);
  private readonly consent = inject(AnalyticsConsentService);

  private routerSub: Subscription | null = null;
  private consentSub: Subscription | null = null;
  private initialized = false;
  private scriptLoaded = false;
  private lastTrackedPath = '';

  /**
   * Call once from AppComponent.ngOnInit() to wire up page view tracking
   * and consent listeners.
   *
   * In development: events are logged to console (no GA4 script loaded).
   * In production without ga4MeasurementId: events are silently dropped,
   * Cloudflare Web Analytics continues to work independently (via CF panel).
   */
  init(): void {
    if (this.initialized) return;
    this.initialized = true;

    // Log initialization state in debug mode
    if (analyticsConfig.debug) {
      console.log('[Analytics] Init', {
        ga4Enabled: analyticsConfig.ga4Enabled,
        ga4MeasurementId: analyticsConfig.ga4MeasurementId ? '(configured)' : '(empty)',
        debug: analyticsConfig.debug,
      });
    }

    // If GA4 is enabled (production + valid ID), set up consent listeners
    if (analyticsConfig.ga4Enabled) {
      this.consentSub = this.consent.status$.subscribe((status) => {
        if (status === 'granted') {
          this.activateGa4();
        }
        // No action needed for denied — script is never loaded
      });
    }

    // Track page views on route change — works in BOTH dev and prod
    // In dev: logs to console for validation
    // In prod: sends to GA4 (if consent granted and ID configured)
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

    // Safe initial page_view: if NavigationEnd already fired before subscription,
    // track the current URL so the first page view is never lost.
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

    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, params);
    }
  }

  /**
   * Activates GA4 when consent is granted.
   * Only loads the script once. On subsequent calls (e.g. consent toggled), does nothing.
   *
   * The correct initialization order for GA4 with consent mode:
   * 1. Initialize dataLayer and window.gtag function
   * 2. Set consent defaults (denied for all)
   * 3. Update consent to granted (before config so GA4 knows it can collect)
   * 4. Call gtag('js', new Date())
   * 5. Call gtag('config', measurementId, { send_page_view: false })
   * 6. Inject the gtag.js script tag
   * 7. Fire an initial page_view for the current route
   */
  private activateGa4(): void {
    if (this.scriptLoaded) return;
    this.scriptLoaded = true;

    const id = analyticsConfig.ga4MeasurementId;
    if (!id) return;

    this.initDataLayer();
    this.setConsentDefault();
    this.setConsentGranted();
    this.configureMeasurement(id);
    this.injectScript(id);
    this.fireInitialPageView();
  }

  /** Step 1: Initialize dataLayer and define window.gtag */
  private initDataLayer(): void {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function (...args: unknown[]) {
      window.dataLayer.push(args);
    };
  }

  /** Step 2: Set consent defaults to denied (required by Google consent mode v2) */
  private setConsentDefault(): void {
    window.gtag('consent', 'default', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });
  }

  /** Step 3: Update consent to granted BEFORE config so GA4 dispatches events */
  private setConsentGranted(): void {
    window.gtag('consent', 'update', {
      analytics_storage: 'granted',
    });
  }

  /** Step 4-5: Register gtag timestamp and configure measurement ID */
  private configureMeasurement(id: string): void {
    window.gtag('js', new Date());
    window.gtag('config', id, { send_page_view: false });
  }

  /** Step 6: Inject the gtag.js script tag into the document head */
  private injectScript(id: string): void {
    const doc = this.document;
    const script = doc.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
    doc.head.appendChild(script);
  }

  /**
   * Step 7: Fire a page_view for the current route after GA4 is activated.
   * The initial NavigationEnd likely fired before GA4 was ready, so this
   * ensures the first page view is always collected.
   */
  private fireInitialPageView(): void {
    const currentPath = this.router.url || '/';

    if (currentPath === this.lastTrackedPath) {
      return;
    }

    this.lastTrackedPath = currentPath;
    const title = this.titleService.getTitle();
    this.trackPageView(buildPageViewParams(currentPath, title));
  }

  /**
   * Handles the case where Angular's initial NavigationEnd fires before
   * we subscribe to router.events. Uses setTimeout to let the router
   * stabilize and then tracks the current URL if no page_view was recorded.
   */
  private trackInitialPageViewIfMissed(): void {
    setTimeout(() => {
      if (this.lastTrackedPath === '') {
        const currentPath = this.router.url;
        if (currentPath && currentPath !== '/') {
          this.lastTrackedPath = currentPath;
          this.trackPageView(buildPageViewParams(currentPath, this.titleService.getTitle()));
        } else if (currentPath === '/') {
          this.lastTrackedPath = '/';
          this.trackPageView(buildPageViewParams('/', this.titleService.getTitle()));
        }
      }
    }, 0);
  }
}

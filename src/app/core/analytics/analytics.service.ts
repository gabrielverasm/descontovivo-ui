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
          this.loadGtagScript();
          this.updateConsent('granted');
        } else if (status === 'denied') {
          this.updateConsent('denied');
        }
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

  private loadGtagScript(): void {
    if (this.scriptLoaded) return;
    this.scriptLoaded = true;

    const id = analyticsConfig.ga4MeasurementId;
    if (!id) return; // Safety: should not happen since ga4Enabled checks this

    const doc = this.document;

    // Initialize dataLayer
    window.dataLayer = window.dataLayer || [];
    window.gtag = function (...args: unknown[]) {
      window.dataLayer.push(args);
    };

    // Set consent defaults before loading the script
    window.gtag('consent', 'default', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });

    // Configure GA4
    window.gtag('js', new Date());
    window.gtag('config', id, { send_page_view: false });

    // Load gtag.js script
    const script = doc.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
    doc.head.appendChild(script);
  }

  private updateConsent(status: 'granted' | 'denied'): void {
    if (typeof window.gtag !== 'function') return;

    window.gtag('consent', 'update', {
      analytics_storage: status,
    });
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

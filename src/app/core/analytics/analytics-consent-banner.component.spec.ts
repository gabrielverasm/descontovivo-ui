import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AnalyticsConsentBannerComponent } from './analytics-consent-banner.component';
import { AnalyticsConsentService } from './analytics-consent.service';

const CONSENT_KEY = 'descontovivo_analytics_consent';

describe('AnalyticsConsentBannerComponent', () => {
  beforeEach(() => {
    clearConsent();
    configureTestBed();
  });

  afterEach(() => {
    clearConsent();
  });

  describe('new visitor (consent pending)', () => {
    it('shows the banner after the browser render hook flips ready', async () => {
      const fixture = TestBed.createComponent(AnalyticsConsentBannerComponent);

      await settle(fixture);

      expect(fixture.componentInstance.ready()).toBeTrue();
      expect(bannerOf(fixture)).not.toBeNull();
    });

    it('stays empty while ready is false, which is all the server and the prerender ever see', async () => {
      const fixture = TestBed.createComponent(AnalyticsConsentBannerComponent);
      // afterNextRender never runs on the server; blocking the flip reproduces that.
      const setReady = spyOn(fixture.componentInstance.ready, 'set').and.stub();

      await settle(fixture);

      expect(setReady).toHaveBeenCalledWith(true);
      expect(TestBed.inject(AnalyticsConsentService).status()).toBe('pending');
      expect(bannerOf(fixture)).toBeNull();
    });

    it('closes immediately and persists the choice after accepting metrics', async () => {
      const fixture = await createComponent();

      click(fixture, '.consent-banner__btn--accept');

      expect(bannerOf(fixture)).toBeNull();
      expect(localStorage.getItem(CONSENT_KEY)).toBe('granted');
    });

    it('closes immediately and persists the choice after denying metrics', async () => {
      const fixture = await createComponent();

      click(fixture, '.consent-banner__btn--deny');

      expect(bannerOf(fixture)).toBeNull();
      expect(localStorage.getItem(CONSENT_KEY)).toBe('denied');
    });

    it('does not show again on the next load after accepting or denying', async () => {
      for (const [selector, saved] of [
        ['.consent-banner__btn--accept', 'granted'],
        ['.consent-banner__btn--deny', 'denied'],
      ] as const) {
        clearConsent();
        TestBed.resetTestingModule();
        configureTestBed();

        const firstVisit = await createComponent();
        expect(bannerOf(firstVisit)).not.toBeNull();
        click(firstVisit, selector);
        expect(localStorage.getItem(CONSENT_KEY)).toBe(saved);

        // Simulates a reload: a new injector reads the storage again.
        TestBed.resetTestingModule();
        configureTestBed();

        const reload = await trackRenders(TestBed.createComponent(AnalyticsConsentBannerComponent));
        expect(reload).toEqual({ everShown: false });
      }
    });
  });

  describe('visitor who already chose', () => {
    const saved: { name: string; arrange: (value: string) => void }[] = [
      { name: 'localStorage', arrange: (value) => localStorage.setItem(CONSENT_KEY, value) },
      { name: 'cookie only', arrange: (value) => (document.cookie = `${CONSENT_KEY}=${value}; Path=/`) },
    ];

    for (const { name, arrange } of saved) {
      for (const value of ['granted', 'denied']) {
        it(`never renders the banner when "${value}" is saved in ${name}`, async () => {
          arrange(value);

          const result = await trackRenders(TestBed.createComponent(AnalyticsConsentBannerComponent));

          expect(result).toEqual({ everShown: false });
        });
      }
    }

    it('has the saved choice available synchronously, before any render', () => {
      localStorage.setItem(CONSENT_KEY, 'denied');

      const service = TestBed.inject(AnalyticsConsentService);

      expect(service.status()).toBe('denied');
    });
  });

  function configureTestBed(): void {
    TestBed.configureTestingModule({
      imports: [AnalyticsConsentBannerComponent],
      providers: [provideRouter([])],
    });
  }

  function clearConsent(): void {
    localStorage.removeItem(CONSENT_KEY);
    document.cookie = `${CONSENT_KEY}=; Max-Age=0; Path=/`;
  }

  function bannerOf(fixture: ComponentFixture<AnalyticsConsentBannerComponent>): Element | null {
    return fixture.nativeElement.querySelector('.consent-banner');
  }

  async function settle(fixture: ComponentFixture<AnalyticsConsentBannerComponent>): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function createComponent(): Promise<ComponentFixture<AnalyticsConsentBannerComponent>> {
    const fixture = TestBed.createComponent(AnalyticsConsentBannerComponent);
    await settle(fixture);
    return fixture;
  }

  /** Runs every render pass and reports whether the banner was in the DOM at any of them. */
  async function trackRenders(
    fixture: ComponentFixture<AnalyticsConsentBannerComponent>,
  ): Promise<{ everShown: boolean }> {
    let everShown = bannerOf(fixture) !== null;
    fixture.detectChanges();
    everShown ||= bannerOf(fixture) !== null;
    await fixture.whenStable();
    everShown ||= bannerOf(fixture) !== null;
    fixture.detectChanges();
    everShown ||= bannerOf(fixture) !== null;
    return { everShown };
  }

  function click(
    fixture: ComponentFixture<AnalyticsConsentBannerComponent>,
    selector: string,
  ): void {
    const button = fixture.nativeElement.querySelector(selector) as HTMLButtonElement;
    button.click();
    fixture.detectChanges();
  }
});

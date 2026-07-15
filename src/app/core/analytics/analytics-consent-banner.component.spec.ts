import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AnalyticsConsentBannerComponent } from './analytics-consent-banner.component';

const CONSENT_KEY = 'descontovivo_analytics_consent';

describe('AnalyticsConsentBannerComponent', () => {
  beforeEach(() => {
    localStorage.removeItem(CONSENT_KEY);
    TestBed.configureTestingModule({
      imports: [AnalyticsConsentBannerComponent],
      providers: [provideRouter([])],
    });
  });

  afterEach(() => localStorage.removeItem(CONSENT_KEY));

  it('shows the banner while consent is pending', () => {
    const fixture = createComponent();

    expect(fixture.nativeElement.querySelector('.consent-banner')).not.toBeNull();
  });

  it('hides immediately and persists the choice after accepting metrics', () => {
    const fixture = createComponent();

    click(fixture, '.consent-banner__btn--accept');

    expect(fixture.nativeElement.querySelector('.consent-banner')).toBeNull();
    expect(localStorage.getItem(CONSENT_KEY)).toBe('granted');
  });

  it('hides immediately and persists the choice after denying metrics', () => {
    const fixture = createComponent();

    click(fixture, '.consent-banner__btn--deny');

    expect(fixture.nativeElement.querySelector('.consent-banner')).toBeNull();
    expect(localStorage.getItem(CONSENT_KEY)).toBe('denied');
  });

  it('stays hidden when a saved choice already exists', () => {
    localStorage.setItem(CONSENT_KEY, 'granted');

    const fixture = createComponent();

    expect(fixture.nativeElement.querySelector('.consent-banner')).toBeNull();
  });

  function createComponent(): ComponentFixture<AnalyticsConsentBannerComponent> {
    const fixture = TestBed.createComponent(AnalyticsConsentBannerComponent);
    fixture.detectChanges();
    return fixture;
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

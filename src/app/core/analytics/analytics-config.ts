import { environment } from '../../../environments/environment';

export interface AnalyticsConfig {
  /** Whether to actually send events to GA4 (requires production + valid measurement ID) */
  ga4Enabled: boolean;
  /** GA4 Measurement ID (e.g. G-XXXXXXXXXX). Empty = GA4 disabled. */
  ga4MeasurementId: string;
  /** Whether to log events to console for local validation */
  debug: boolean;
  /** Whether consent is required before sending to GA4 */
  requireConsent: boolean;
}

export const analyticsConfig: AnalyticsConfig = {
  ga4Enabled: environment.production && !!((environment as any).analytics?.ga4MeasurementId),
  ga4MeasurementId: (environment as any).analytics?.ga4MeasurementId || '',
  debug: !(environment.production),
  requireConsent: true,
};

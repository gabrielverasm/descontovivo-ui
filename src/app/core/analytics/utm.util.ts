/**
 * UTM utility for building share URLs with campaign tracking.
 */

export interface UtmParams {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
}

export function appendUtmParams(baseUrl: string, utm: UtmParams): string {
  try {
    const url = new URL(baseUrl);
    url.searchParams.set('utm_source', utm.utm_source);
    url.searchParams.set('utm_medium', utm.utm_medium);
    url.searchParams.set('utm_campaign', utm.utm_campaign);
    return url.toString();
  } catch {
    // If URL parsing fails, return original
    return baseUrl;
  }
}

export function buildShareUtm(method: 'whatsapp' | 'native_share' | 'copy_link'): UtmParams {
  return {
    utm_source: method,
    utm_medium: 'share',
    utm_campaign: 'share_button',
  };
}

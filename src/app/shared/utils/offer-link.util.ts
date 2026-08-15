const SHOPEE_SHORT_HOSTS = new Set(['s.shopee.com.br', 'shope.ee']);

export function buildOfferNavigationUrl(offerUrl: string): string {
  try {
    const url = new URL(offerUrl);
    if (!SHOPEE_SHORT_HOSTS.has(url.hostname.toLowerCase())) return offerUrl;
    return `/go?url=${encodeURIComponent(offerUrl)}`;
  } catch {
    return offerUrl;
  }
}

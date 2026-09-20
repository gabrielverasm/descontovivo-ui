import { Promotion } from '../../core/models/promotion.model';

const SHOPEE_SHORT_HOSTS = new Set(['s.shopee.com.br', 'shope.ee']);
// Hosts are compared without "www." and without a trailing dot, and exactly (no subdomains).
const AMAZON_HOSTS = new Set(['amazon.com.br']);
// Hosts whose links are affiliate links by nature: short links and affiliate storefronts.
const AFFILIATE_LINK_HOSTS = new Set([
  ...SHOPEE_SHORT_HOSTS,
  'amzn.to',
  'link.amazon',
  'meli.la',
  'magazinevoce.com.br',
  'magazineluiza.onelink.me',
  's.click.aliexpress.com',
]);

export function buildOfferNavigationUrl(offerUrl: string): string {
  try {
    const url = new URL(offerUrl);
    if (!SHOPEE_SHORT_HOSTS.has(url.hostname.toLowerCase())) return offerUrl;
    return `/go?url=${encodeURIComponent(offerUrl)}`;
  } catch {
    return offerUrl;
  }
}

type OfferLinkFields = Partial<
  Pick<Promotion, 'sponsoredLink' | 'affiliateProgram' | 'url' | 'offerUrl' | 'storeUrl'>
>;

function normalizedHost(url: URL): string {
  return url.hostname.toLowerCase().replace(/\.$/, '').replace(/^www\./, '');
}

/**
 * Whether the outgoing link earns us a commission. The API's explicit flags win,
 * but the API does not send them today, so the link itself is checked too: a
 * tagged amazon.com.br URL or a known affiliate link host.
 */
export function isAffiliateOffer(promotion: OfferLinkFields | null | undefined): boolean {
  if (!promotion) return false;
  if (promotion.sponsoredLink === true) return true;
  if (promotion.affiliateProgram != null && promotion.affiliateProgram !== 'NONE') return true;

  try {
    const url = new URL(promotion.url || promotion.offerUrl || promotion.storeUrl || '');
    const host = normalizedHost(url);
    if (AFFILIATE_LINK_HOSTS.has(host)) return true;
    return AMAZON_HOSTS.has(host) && !!url.searchParams.get('tag');
  } catch {
    return false;
  }
}

export function buildOfferRel(isAffiliate: boolean): string {
  return isAffiliate ? 'sponsored noopener noreferrer' : 'noopener noreferrer';
}

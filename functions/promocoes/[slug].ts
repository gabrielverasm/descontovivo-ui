/**
 * Cloudflare Pages Function para /promocoes/:slug
 *
 * Injeta meta tags OG/Twitter dinâmicas no HTML para que crawlers sociais
 * (WhatsApp, Facebook, Telegram, Twitter) mostrem preview correto da promoção.
 */

interface PagesFunctionContext {
  request: Request;
  params: {
    slug?: string | string[];
  };
  env: {
    ASSETS: {
      fetch: (input: Request | string | URL, init?: RequestInit) => Promise<Response>;
    };
  };
  next?: () => Promise<Response>;
}

interface PromotionOgData {
  id?: string;
  slug?: string;
  title?: string;
  currentPrice?: number;
  originalPrice?: number | null;
  imageUrl?: string | null;
  store?: {
    name?: string | null;
  } | null;
  storeName?: string | null;
  soldBy?: string | null;
  deliveredBy?: string | null;
}

interface PromotionMeta {
  title: string;
  description: string;
  imageUrl: string;
  canonicalUrl: string;
  ogType: string;
}

const SITE_NAME = 'DescontoVivo';
const DEFAULT_OG_IMAGE_PATH = '/brand/logo-og-image.jpg';

function escapeHtml(value: unknown): string {
  const str = String(value ?? '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatBRL(value?: number | null): string {
  if (value == null || isNaN(value)) return '';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function buildDescription(promotion: PromotionOgData): string {
  const title = promotion.title || 'Promoção';
  const price = formatBRL(promotion.currentPrice);
  const store = promotion.store?.name || promotion.storeName || '';

  if (price && store) {
    return `${title} por ${price} em ${store}. Oferta compartilhada no ${SITE_NAME}.`;
  }
  if (price) {
    return `${title} por ${price}. Oferta compartilhada no ${SITE_NAME}.`;
  }
  return `Veja esta promoção no ${SITE_NAME}.`;
}

function buildMeta(promotion: PromotionOgData, requestUrl: URL): PromotionMeta {
  const slug = promotion.slug || promotion.id || '';
  const canonicalUrl = `${requestUrl.origin}/promocoes/${slug}`;
  const title = `${promotion.title || 'Promoção'} | ${SITE_NAME}`;
  const description = buildDescription(promotion);

  let imageUrl: string;
  if (promotion.imageUrl) {
    try {
      imageUrl = new URL(promotion.imageUrl, requestUrl.origin).toString();
    } catch {
      imageUrl = `${requestUrl.origin}${DEFAULT_OG_IMAGE_PATH}`;
    }
  } else {
    imageUrl = `${requestUrl.origin}${DEFAULT_OG_IMAGE_PATH}`;
  }

  return { title, description, imageUrl, canonicalUrl, ogType: 'product' };
}

function injectPromotionMeta(html: string, meta: PromotionMeta): string {
  // Remove existing OG/Twitter/canonical tags
  html = html.replace(/<meta\s+property="og:[^"]*"\s+content="[^"]*"\s*\/?>/gi, '');
  html = html.replace(/<meta\s+name="twitter:[^"]*"\s+content="[^"]*"\s*\/?>/gi, '');
  html = html.replace(/<link[^>]*rel="canonical"[^>]*\/?>/gi, '');
  html = html.replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/gi, '');

  // Replace <title>
  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(meta.title)}</title>`);

  // Build meta block
  const metaBlock = [
    `<meta name="description" content="${escapeHtml(meta.description)}">`,
    `<meta property="og:type" content="${escapeHtml(meta.ogType)}">`,
    `<meta property="og:site_name" content="${escapeHtml(SITE_NAME)}">`,
    `<meta property="og:title" content="${escapeHtml(meta.title)}">`,
    `<meta property="og:description" content="${escapeHtml(meta.description)}">`,
    `<meta property="og:image" content="${escapeHtml(meta.imageUrl)}">`,
    `<meta property="og:url" content="${escapeHtml(meta.canonicalUrl)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${escapeHtml(meta.title)}">`,
    `<meta name="twitter:description" content="${escapeHtml(meta.description)}">`,
    `<meta name="twitter:image" content="${escapeHtml(meta.imageUrl)}">`,
    `<link rel="canonical" href="${escapeHtml(meta.canonicalUrl)}">`,
  ].join('\n    ');

  // Insert before </head>
  html = html.replace('</head>', `    ${metaBlock}\n  </head>`);

  return html;
}

async function fetchPromotion(slug: string, requestUrl: URL): Promise<PromotionOgData | null> {
  try {
    const apiUrl = new URL(`/api/v1/promotions/${encodeURIComponent(slug)}`, requestUrl.origin);
    const response = await fetch(apiUrl.toString(), {
      headers: { 'Accept': 'application/json' },
    });
    if (!response.ok) return null;
    return await response.json() as PromotionOgData;
  } catch {
    return null;
  }
}

async function fetchAssetHtml(context: PagesFunctionContext): Promise<Response> {
  const url = new URL(context.request.url);
  const assetUrl = new URL('/', url.origin);
  const assetRequest = new Request(assetUrl.toString(), {
    method: 'GET',
    headers: context.request.headers,
  });
  return context.env.ASSETS.fetch(assetRequest);
}

export async function onRequest(context: PagesFunctionContext): Promise<Response> {
  const slug = Array.isArray(context.params.slug)
    ? context.params.slug[0]
    : context.params.slug;

  // Fetch the base HTML asset
  let assetResponse: Response;
  try {
    assetResponse = await fetchAssetHtml(context);
  } catch {
    // If asset fetch fails entirely, try next handler
    if (context.next) return context.next();
    return new Response('Internal Server Error', { status: 500 });
  }

  let html = await assetResponse.text();

  // If no slug, return unmodified HTML
  if (!slug) {
    return new Response(html, {
      status: assetResponse.status,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  }

  // Fetch promotion data from API
  const requestUrl = new URL(context.request.url);
  const promotion = await fetchPromotion(slug, requestUrl);

  // If we got promotion data, inject meta tags
  if (promotion?.title) {
    const meta = buildMeta(promotion, requestUrl);
    html = injectPromotionMeta(html, meta);
  }

  return new Response(html, {
    status: assetResponse.status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=300',
    },
  });
}

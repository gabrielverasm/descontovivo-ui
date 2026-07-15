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
  availability?: string | null;
  store?: {
    name?: string | null;
  } | null;
  storeName?: string | null;
  soldBy?: string | null;
  deliveredBy?: string | null;
}

type PromotionFetchResult =
  | { kind: 'ok'; promotion: PromotionOgData }
  | { kind: 'not-found' }
  | { kind: 'unavailable' };

interface PromotionMeta {
  title: string;
  description: string;
  imageUrl: string;
  canonicalUrl: string;
  ogType: string;
}

interface StructuredDataBlock {
  id: string;
  data: object;
}

const SITE_NAME = 'DescontoVivo';
const SITE_BASE_URL = 'https://descontovivo.com';
const DEFAULT_OG_IMAGE_PATH = '/brand/logo-og-image.jpg';
const API_BASE_URL = 'https://api.descontovivo.com/api/v1';
const MAX_TITLE_LENGTH = 70;
const MAX_DESCRIPTION_LENGTH = 160;

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
  if (value == null || !Number.isFinite(value)) return '';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function truncateAtWord(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;

  const candidate = value.slice(0, Math.max(1, maxLength - 1)).trimEnd();
  const lastSpace = candidate.lastIndexOf(' ');
  const cutAt = lastSpace >= Math.floor(maxLength * 0.6) ? lastSpace : candidate.length;
  return `${candidate.slice(0, cutAt).trimEnd()}…`;
}

function buildDescription(promotion: PromotionOgData): string {
  const productName = normalizeWhitespace(promotion.title || 'Promoção');
  const price = formatBRL(promotion.currentPrice);
  const store = normalizeWhitespace(promotion.store?.name || promotion.storeName || '');
  const description = normalizeWhitespace([
    'Veja a promoção',
    productName,
    price ? `por ${price}` : '',
    store ? `em ${store}` : '',
    `no ${SITE_NAME}.`,
    'Confira os detalhes antes de comprar.',
  ].filter(Boolean).join(' '));
  return truncateAtWord(description, MAX_DESCRIPTION_LENGTH);
}

function buildMeta(promotion: PromotionOgData): PromotionMeta {
  const slug = promotion.slug || promotion.id || '';
  const canonicalUrl = `${SITE_BASE_URL}/promocoes/${slug}`;
  const price = formatBRL(promotion.currentPrice);
  const suffix = normalizeWhitespace([
    price ? `por ${price}` : '',
    `| ${SITE_NAME}`,
  ].filter(Boolean).join(' '));
  const productName = normalizeWhitespace(promotion.title || 'Promoção');
  const productMaxLength = Math.max(1, MAX_TITLE_LENGTH - suffix.length - 1);
  const title = normalizeWhitespace(
    `${truncateAtWord(productName, productMaxLength)} ${suffix}`,
  );
  const description = buildDescription(promotion);

  let imageUrl: string;
  if (promotion.imageUrl) {
    try {
      const candidate = new URL(promotion.imageUrl, SITE_BASE_URL);
      if (candidate.protocol !== 'https:') throw new Error('OG image must use HTTPS');
      imageUrl = candidate.toString();
    } catch {
      imageUrl = `${SITE_BASE_URL}${DEFAULT_OG_IMAGE_PATH}`;
    }
  } else {
    imageUrl = `${SITE_BASE_URL}${DEFAULT_OG_IMAGE_PATH}`;
  }

  return { title, description, imageUrl, canonicalUrl, ogType: 'product' };
}

function resolveSchemaAvailability(value?: string | null): string | null {
  const normalized = value?.trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (normalized === 'available' || normalized === 'in_stock' || normalized === 'instock') {
    return 'https://schema.org/InStock';
  }
  if (
    normalized === 'expired'
    || normalized === 'unavailable'
    || normalized === 'out_of_stock'
    || normalized === 'outofstock'
  ) {
    return 'https://schema.org/OutOfStock';
  }
  return null;
}

function buildStructuredData(promotion: PromotionOgData, meta: PromotionMeta): StructuredDataBlock[] {
  const blocks: StructuredDataBlock[] = [];
  const storeName = promotion.store?.name || promotion.storeName || '';

  if (promotion.title && promotion.currentPrice != null && Number.isFinite(promotion.currentPrice)) {
    const offer: Record<string, unknown> = {
      '@type': 'Offer',
      price: promotion.currentPrice.toFixed(2),
      priceCurrency: 'BRL',
      url: meta.canonicalUrl,
    };
    const availability = resolveSchemaAvailability(promotion.availability);
    if (availability) offer['availability'] = availability;
    if (storeName) offer['seller'] = { '@type': 'Organization', name: storeName };

    const product: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: promotion.title,
      description: meta.description,
      url: meta.canonicalUrl,
      offers: offer,
    };
    if (promotion.imageUrl) product['image'] = meta.imageUrl;
    blocks.push({ id: 'sd-page-product', data: product });
  }

  blocks.push({
    id: 'sd-page-breadcrumb',
    data: {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: SITE_NAME, item: `${SITE_BASE_URL}/` },
        { '@type': 'ListItem', position: 2, name: promotion.title || 'Promoção', item: meta.canonicalUrl },
      ],
    },
  });

  return blocks;
}

function serializeJsonLd(value: object): string {
  return JSON.stringify(value)
    .replace(/&/g, '\\u0026')
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e');
}

function injectPromotionMeta(
  html: string,
  meta: PromotionMeta,
  structuredData: StructuredDataBlock[],
): string {
  // Remove existing OG/Twitter/canonical tags
  html = html.replace(/<meta\s+property="og:[^"]*"\s+content="[^"]*"\s*\/?>/gi, '');
  html = html.replace(/<meta\s+name="twitter:[^"]*"\s+content="[^"]*"\s*\/?>/gi, '');
  html = html.replace(/<link[^>]*rel="canonical"[^>]*\/?>/gi, '');
  html = html.replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/gi, '');
  html = html.replace(/<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/gi, '');

  // Replace <title>
  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(meta.title)}</title>`);

  // Build meta block
  const metaBlock = [
    `<meta name="robots" content="index, follow">`,
    `<meta name="description" content="${escapeHtml(meta.description)}">`,
    `<meta property="og:type" content="${escapeHtml(meta.ogType)}">`,
    `<meta property="og:site_name" content="${escapeHtml(SITE_NAME)}">`,
    `<meta property="og:title" content="${escapeHtml(meta.title)}">`,
    `<meta property="og:description" content="${escapeHtml(meta.description)}">`,
    `<meta property="og:image" content="${escapeHtml(meta.imageUrl)}">`,
    `<meta property="og:image:secure_url" content="${escapeHtml(meta.imageUrl)}">`,
    `<meta property="og:image:alt" content="${escapeHtml(meta.title)}">`,
    `<meta property="og:url" content="${escapeHtml(meta.canonicalUrl)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${escapeHtml(meta.title)}">`,
    `<meta name="twitter:description" content="${escapeHtml(meta.description)}">`,
    `<meta name="twitter:image" content="${escapeHtml(meta.imageUrl)}">`,
    `<link rel="canonical" href="${escapeHtml(meta.canonicalUrl)}">`,
    ...structuredData.map((block) =>
      `<script id="${block.id}" type="application/ld+json">${serializeJsonLd(block.data)}</script>`
    ),
  ].join('\n    ');

  // Insert before </head>
  html = html.replace('</head>', `    ${metaBlock}\n  </head>`);

  return html;
}

async function fetchPromotion(slug: string): Promise<PromotionFetchResult> {
  try {
    const apiUrl = new URL(`${API_BASE_URL}/promotions/${encodeURIComponent(slug)}`);
    const response = await fetch(apiUrl.toString(), {
      headers: { 'Accept': 'application/json' },
    });
    if (response.status === 404) return { kind: 'not-found' };
    if (!response.ok) return { kind: 'unavailable' };
    return { kind: 'ok', promotion: await response.json() as PromotionOgData };
  } catch {
    return { kind: 'unavailable' };
  }
}

function buildStatusHtml(title: string, description: string, noIndex: boolean): string {
  const robotsMeta = noIndex ? '\n    <meta name="robots" content="noindex, nofollow">' : '';
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">${robotsMeta}
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
  </head>
  <body>
    <main>
      <h1>${escapeHtml(title.replace(` | ${SITE_NAME}`, ''))}</h1>
      <p>${escapeHtml(description)}</p>
      <a href="${SITE_BASE_URL}/">Ver promoções no ${SITE_NAME}</a>
    </main>
  </body>
</html>`;
}

function buildStatusResponse(status: 404 | 503): Response {
  const notFound = status === 404;
  const title = notFound
    ? `Promoção não encontrada | ${SITE_NAME}`
    : `Promoção temporariamente indisponível | ${SITE_NAME}`;
  const description = notFound
    ? 'Esta promoção não foi encontrada. Confira outras ofertas no DescontoVivo.'
    : 'Não foi possível consultar esta promoção agora. Tente novamente em alguns minutos.';
  const headers = new Headers({
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store',
  });
  if (notFound) {
    headers.set('x-robots-tag', 'noindex, nofollow');
  } else {
    headers.set('retry-after', '300');
  }
  return new Response(buildStatusHtml(title, description, notFound), { status, headers });
}

async function fetchAssetHtml(context: PagesFunctionContext): Promise<Response> {
  const url = new URL(context.request.url);
  const assetUrl = new URL('/__app-shell/', url.origin);
  const assetRequest = new Request(assetUrl.toString(), {
    method: 'GET',
    headers: context.request.headers,
  });
  const response = await context.env.ASSETS.fetch(assetRequest);
  if (!response.ok) {
    throw new Error(`Unable to load CSR shell: ${response.status}`);
  }
  return response;
}

export async function onRequest(context: PagesFunctionContext): Promise<Response> {
  const slug = Array.isArray(context.params.slug)
    ? context.params.slug[0]
    : context.params.slug;

  if (slug) {
    const promotionResult = await fetchPromotion(slug);
    if (promotionResult.kind === 'not-found') return buildStatusResponse(404);
    if (promotionResult.kind === 'unavailable') return buildStatusResponse(503);

    return renderPromotionPage(context, promotionResult.promotion);
  }

  // Fetch the base HTML asset
  let assetResponse: Response;
  try {
    assetResponse = await fetchAssetHtml(context);
  } catch {
    // If asset fetch fails entirely, try next handler
    if (context.next) return context.next();
    return new Response('Internal Server Error', { status: 500 });
  }

  const html = await assetResponse.text();
  const headers = new Headers(assetResponse.headers);
  headers.set('content-type', 'text/html; charset=utf-8');
  return new Response(html, { status: assetResponse.status, headers });
}

async function renderPromotionPage(
  context: PagesFunctionContext,
  promotion: PromotionOgData,
): Promise<Response> {
  let assetResponse: Response;
  try {
    assetResponse = await fetchAssetHtml(context);
  } catch {
    return buildStatusResponse(503);
  }

  const meta = buildMeta(promotion);
  const structuredData = buildStructuredData(promotion, meta);
  const html = injectPromotionMeta(await assetResponse.text(), meta, structuredData);
  const headers = new Headers(assetResponse.headers);
  headers.set('content-type', 'text/html; charset=utf-8');
  headers.set('cache-control', 'public, max-age=300');
  headers.delete('x-robots-tag');
  return new Response(html, { status: assetResponse.status, headers });
}

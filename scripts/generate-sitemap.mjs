/**
 * generate-sitemap.mjs
 *
 * Gera public/sitemap.xml com páginas estáticas + promoções publicadas.
 * Usa a API pública paginada para buscar promoções.
 *
 * Uso:
 *   SITEMAP_API_BASE_URL=https://api.descontovivo.com/api/v1 node scripts/generate-sitemap.mjs
 *
 * Variáveis de ambiente:
 *   SITEMAP_API_BASE_URL - URL base da API (default: https://api.descontovivo.com/api/v1)
 *   SITEMAP_BASE_URL     - URL base do site (default: https://descontovivo.com)
 *   SITEMAP_MAX_PROMOTIONS - Máximo de promoções a incluir (default: 5000)
 */

import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const API_BASE_URL = process.env.SITEMAP_API_BASE_URL || 'https://api.descontovivo.com/api/v1';
const SITE_BASE_URL = process.env.SITEMAP_BASE_URL || 'https://descontovivo.com';
const MAX_PROMOTIONS = parseInt(process.env.SITEMAP_MAX_PROMOTIONS || '5000', 10);
const PAGE_SIZE = 100;

const STATIC_PAGES = [
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/sobre', priority: '0.5', changefreq: 'monthly' },
  { path: '/servicos', priority: '0.5', changefreq: 'monthly' },
  { path: '/transparencia', priority: '0.5', changefreq: 'monthly' },
  { path: '/privacidade', priority: '0.4', changefreq: 'monthly' },
  { path: '/termos', priority: '0.4', changefreq: 'monthly' },
];

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toISODate(dateStr) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    return d.toISOString().split('T')[0];
  } catch {
    return null;
  }
}

async function fetchPromotions() {
  const promotions = [];
  let page = 0;

  while (promotions.length < MAX_PROMOTIONS) {
    const url = `${API_BASE_URL}/promotions?page=${page}&size=${PAGE_SIZE}`;
    console.log(`  Fetching: ${url}`);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API responded with ${response.status} for ${url}`);
    }

    const data = await response.json();
    const items = data.content || [];

    if (items.length === 0) break;

    for (const item of items) {
      if (!item.slug) continue;
      promotions.push({
        slug: item.slug,
        publishedAt: item.publishedAt,
      });
      if (promotions.length >= MAX_PROMOTIONS) break;
    }

    if (page >= data.totalPages - 1) break;
    page++;
  }

  return promotions;
}

function buildSitemap(promotions) {
  const urls = [];

  // Static pages
  for (const page of STATIC_PAGES) {
    const loc = `${SITE_BASE_URL}${page.path}`;
    urls.push(
      `  <url>\n    <loc>${escapeXml(loc)}</loc>\n    <changefreq>${page.changefreq}</changefreq>\n    <priority>${page.priority}</priority>\n  </url>`
    );
  }

  // Promotion pages
  for (const promo of promotions) {
    const loc = `${SITE_BASE_URL}/promocoes/${encodeURIComponent(promo.slug)}`;
    const lastmod = toISODate(promo.publishedAt);
    let entry = `  <url>\n    <loc>${escapeXml(loc)}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>`;
    if (lastmod) {
      entry += `\n    <lastmod>${lastmod}</lastmod>`;
    }
    entry += '\n  </url>';
    urls.push(entry);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

async function main() {
  console.log('🗺️  Gerando sitemap...');
  console.log(`  API: ${API_BASE_URL}`);
  console.log(`  Site: ${SITE_BASE_URL}`);
  console.log(`  Max promoções: ${MAX_PROMOTIONS}`);

  let promotions;
  try {
    promotions = await fetchPromotions();
  } catch (err) {
    console.error(`  ❌ Erro ao buscar promoções: ${err.message}`);
    console.error('  Erro ao buscar promoções. Sitemap não foi gerado.');
    process.exit(1);
  }

  if (promotions.length === 0) {
    console.error('  ❌ Nenhuma promoção encontrada. Sitemap não foi gerado.');
    process.exit(1);
  }

  console.log(`  ✅ ${promotions.length} promoções encontradas`);

  const xml = buildSitemap(promotions);
  const outputPath = resolve(__dirname, '..', 'public', 'sitemap.xml');
  writeFileSync(outputPath, xml, 'utf-8');
  console.log(`  ✅ Sitemap salvo em: ${outputPath}`);
  console.log(`  Total de URLs: ${STATIC_PAGES.length + promotions.length}`);
}

main().catch((err) => {
  console.error('❌ Falha fatal ao gerar sitemap:', err.message);
  process.exit(1);
});

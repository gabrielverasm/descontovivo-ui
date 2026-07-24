import { AngularAppEngine } from '@angular/ssr';

interface CloudflareEnv {
  ASSETS: {
    fetch(input: Request | string | URL, init?: RequestInit): Promise<Response>;
  };
  SSR_PREVIEW_HOSTNAME?: string;
}

const IMAGE_HOST = 'img.descontovivo.com.br';
const BASE_ALLOWED_HOSTS = ['127.0.0.1', 'localhost', 'descontovivo.com', 'www.descontovivo.com'];
const INSTITUTIONAL_ROUTES = ['/sobre', '/servicos', '/transparencia', '/privacidade', '/termos'] as const;
const angularApps = new Map<string, AngularAppEngine>();

const SECURITY_HEADERS: Record<string, string> = {
  'Content-Security-Policy': "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://static.cloudflareinsights.com; connect-src 'self' https://api.descontovivo.com https://auth.descontovivo.com https://*.r2.cloudflarestorage.com https://www.google-analytics.com https://region1.google-analytics.com https://analytics.google.com; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; frame-src 'self' https://auth.descontovivo.com; form-action 'self' https://auth.descontovivo.com; upgrade-insecure-requests",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000',
};

function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    if (!headers.has(name)) headers.set(name, value);
  }
  if (response.status === 404) headers.set('X-Robots-Tag', 'noindex, nofollow');
  if (response.status === 503 && !headers.has('Retry-After')) headers.set('Retry-After', '60');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function isPromotionPath(pathname: string): boolean {
  return /^\/promocoes\/[^/]+\/?$/.test(pathname);
}

function isKnownCsrRoute(pathname: string): boolean {
  return [
    '/login',
    '/cadastro',
    '/publicar',
    '/minha-conta',
    '/erro',
    '/promocoes',
    '/admin',
    '/moderacao',
    '/callback',
    '/silent-renew',
  ].some((route) => {
    if (route === '/promocoes') return pathname === route || pathname === `${route}/`;
    return pathname === route || pathname === `${route}/` || pathname.startsWith(`${route}/`);
  });
}

function prerenderedAssetPath(pathname: string): string | null {
  const route = INSTITUTIONAL_ROUTES.find((candidate) => pathname === `${candidate}/`);
  return route ? `${route}/index.html` : null;
}

function redirectInstitutionalRoute(request: Request): Response | null {
  const url = new URL(request.url);
  if (!INSTITUTIONAL_ROUTES.includes(url.pathname as (typeof INSTITUTIONAL_ROUTES)[number])) return null;

  url.pathname = `${url.pathname}/`;
  return Response.redirect(url.toString(), 301);
}

function getAngularApp(env: CloudflareEnv): AngularAppEngine {
  const configuredPreviewHost = env.SSR_PREVIEW_HOSTNAME?.trim().toLowerCase() || '';
  const previewHost = /^[a-z0-9.-]+$/.test(configuredPreviewHost) ? configuredPreviewHost : '';
  const cacheKey = previewHost || 'default';
  const cachedApp = angularApps.get(cacheKey);
  if (cachedApp) return cachedApp;

  const app = new AngularAppEngine({
    allowedHosts: previewHost ? [...BASE_ALLOWED_HOSTS, previewHost] : BASE_ALLOWED_HOSTS,
  });
  angularApps.set(cacheKey, app);
  return app;
}

function redirectLegacyHost(request: Request): Response | null {
  const url = new URL(request.url);
  if (!['www.descontovivo.com', 'descontovivo.com.br', 'www.descontovivo.com.br'].includes(url.hostname)) {
    return null;
  }

  const canonicalUrl = `https://descontovivo.com${url.pathname}${url.search}`;
  return Response.redirect(canonicalUrl, 301);
}

function textResponse(message: string, status: number, headers: Record<string, string> = {}): Response {
  return new Response(message, {
    status,
    headers: { 'content-type': 'text/plain; charset=utf-8', ...headers },
  });
}

async function serveKnownCsrRoute(request: Request, env: CloudflareEnv): Promise<Response> {
  const shellUrl = new URL('/index.csr.html', request.url);
  return env.ASSETS.fetch(new Request(shellUrl, { method: 'GET', headers: request.headers }));
}

async function servePrerenderedRoute(request: Request, env: CloudflareEnv, assetPath: string): Promise<Response> {
  const assetUrl = new URL(assetPath, request.url);
  return env.ASSETS.fetch(new Request(assetUrl, { method: 'GET', headers: request.headers }));
}

async function handleStoryImage(request: Request): Promise<Response> {
  if (request.method !== 'GET') return textResponse('Method Not Allowed', 405, { allow: 'GET' });

  const rawImageUrl = new URL(request.url).searchParams.get('url');
  if (!rawImageUrl) return textResponse('Missing image URL', 400);

  let imageUrl: URL;
  try {
    imageUrl = new URL(rawImageUrl);
  } catch {
    return textResponse('Invalid image URL', 400);
  }

  if (
    imageUrl.protocol !== 'https:' ||
    imageUrl.hostname !== IMAGE_HOST ||
    (imageUrl.port && imageUrl.port !== '443') ||
    imageUrl.username ||
    imageUrl.password
  ) {
    return textResponse('Image host not allowed', 400);
  }

  let upstream: Response;
  try {
    upstream = await fetch(imageUrl.toString(), {
      headers: { accept: 'image/*' },
      redirect: 'manual',
    });
  } catch {
    return textResponse('Unable to fetch image', 502);
  }

  if (upstream.status === 404) return textResponse('Image not found', 404);
  if (!upstream.ok) return textResponse('Unable to fetch image', 502);

  const contentType = upstream.headers.get('content-type')?.split(';')[0].trim() || '';
  if (!contentType.toLowerCase().startsWith('image/')) {
    return textResponse('Upstream response is not an image', 502);
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      'content-type': contentType,
      'cache-control': 'public, max-age=86400',
      'access-control-allow-origin': '*',
      'x-content-type-options': 'nosniff',
    },
  });
}

export default {
  async fetch(request: Request, env: CloudflareEnv): Promise<Response> {
    const url = new URL(request.url);

    const legacyHostRedirect = redirectLegacyHost(request);
    if (legacyHostRedirect) return withSecurityHeaders(legacyHostRedirect);

    const institutionalRedirect = redirectInstitutionalRoute(request);
    if (institutionalRedirect) return withSecurityHeaders(institutionalRedirect);

    if (isPromotionPath(url.pathname)) {
      if (url.pathname.endsWith('/') && url.pathname !== '/promocoes/') {
        const canonicalUrl = new URL(request.url);
        canonicalUrl.pathname = canonicalUrl.pathname.slice(0, -1);
        return withSecurityHeaders(Response.redirect(canonicalUrl.toString(), 301));
      }

      const response = await getAngularApp(env).handle(request);
      if (response) return withSecurityHeaders(response);
      return withSecurityHeaders(new Response('Not Found', { status: 404 }));
    }

    if (url.pathname === '/story-image' || url.pathname.startsWith('/story-image/')) {
      return withSecurityHeaders(await handleStoryImage(request));
    }

    if (isKnownCsrRoute(url.pathname)) {
      return withSecurityHeaders(await serveKnownCsrRoute(request, env));
    }

    const prerenderedPath = prerenderedAssetPath(url.pathname);
    if (prerenderedPath) {
      return withSecurityHeaders(await servePrerenderedRoute(request, env, prerenderedPath));
    }

    return withSecurityHeaders(await env.ASSETS.fetch(request));
  },
};

export type NextFunction = () => Promise<Response>;

const EXACT_CSR_PATHS = new Set([
  '/login',
  '/login/',
  '/cadastro',
  '/cadastro/',
  '/publicar',
  '/publicar/',
  '/minha-conta',
  '/minha-conta/',
  '/erro',
  '/erro/',
  '/promocoes',
  '/promocoes/',
  '/admin',
  '/admin/',
  '/moderacao',
  '/moderacao/',
  '/callback',
  '/callback/',
  '/silent-renew',
  '/silent-renew/',
]);

const CSR_SUBPATH_PREFIXES = [
  '/login/',
  '/cadastro/',
  '/publicar/',
  '/minha-conta/',
  '/erro/',
  '/admin/',
  '/moderacao/',
  '/callback/',
  '/silent-renew/',
];

const SECURITY_HEADERS: Record<string, string> = {
  'Content-Security-Policy': "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://static.cloudflareinsights.com; connect-src 'self' https://api.descontovivo.com https://auth.descontovivo.com https://*.r2.cloudflarestorage.com https://www.google-analytics.com https://region1.google-analytics.com https://analytics.google.com; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; frame-src 'self' https://auth.descontovivo.com; form-action 'self' https://auth.descontovivo.com; upgrade-insecure-requests",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000',
};

function isCsrPath(pathname: string): boolean {
  return EXACT_CSR_PATHS.has(pathname) ||
    CSR_SUBPATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function htmlHeaders(): Headers {
  const headers = new Headers({
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex, nofollow',
  });
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value);
  return headers;
}

export async function handleCsrRoute(
  request: Request,
  csrHtml: string,
  next: NextFunction,
): Promise<Response> {
  if (!isCsrPath(new URL(request.url).pathname)) return next();

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const headers = htmlHeaders();
    headers.set('Content-Type', 'text/plain; charset=utf-8');
    headers.set('Allow', 'GET, HEAD');
    return new Response('Method Not Allowed', { status: 405, headers });
  }

  return new Response(request.method === 'HEAD' ? null : csrHtml, {
    status: 200,
    headers: htmlHeaders(),
  });
}

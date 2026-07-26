import worker, { handleWorkerRequest } from './cloudflare-worker';

const CSR_HTML = '<!doctype html><html><head><title>CSR shell</title></head><body><app-root></app-root></body></html>';
const SECURITY_HEADERS = [
  'content-security-policy',
  'x-content-type-options',
  'referrer-policy',
  'x-frame-options',
  'permissions-policy',
  'strict-transport-security',
];

class StaticAssetsMock {
  readonly requests: Request[] = [];

  async fetch(input: Request | string | URL): Promise<Response> {
    const request = input instanceof Request ? input : new Request(input);
    this.requests.push(request);
    const { pathname } = new URL(request.url);

    if (pathname === '/index.csr.html') {
      return Response.redirect(new URL('/index.csr', request.url).toString(), 308);
    }
    if (pathname === '/index.csr') {
      return new Response(request.method === 'HEAD' ? null : CSR_HTML, {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
      });
    }
    if (pathname === '/' || pathname === '/app.js') {
      return new Response(request.method === 'HEAD' ? null : 'static asset', { status: 200 });
    }
    return new Response('Not Found', { status: 404 });
  }
}

function createEnv(assets = new StaticAssetsMock()) {
  return { env: { ASSETS: assets }, assets };
}

describe('Cloudflare Worker CSR routing', () => {
  it('resolves every known CSR route through the canonical shell without exposing it', async () => {
    const { env, assets } = createEnv();
    const routes = [
      '/login', '/login/', '/cadastro', '/cadastro/', '/publicar', '/publicar/',
      '/minha-conta', '/minha-conta/', '/erro', '/erro/', '/promocoes', '/promocoes/',
      '/admin', '/admin/', '/admin/qualquer-subrota',
      '/moderacao', '/moderacao/', '/moderacao/qualquer-subrota',
      '/callback', '/callback/', '/silent-renew', '/silent-renew/',
    ];

    for (const route of routes) {
      const response = await worker.fetch(new Request(`https://descontovivo.com${route}`), env);
      expect(response.status).withContext(route).toBe(200);
      expect(response.headers.has('location')).withContext(route).toBeFalse();
      expect(response.headers.get('content-type')).withContext(route).toContain('text/html');
      expect(await response.text()).withContext(route).toContain('<app-root>');
    }

    expect(assets.requests.every(request => new URL(request.url).pathname === '/index.csr')).toBeTrue();
    expect(assets.requests.some(request => new URL(request.url).pathname === '/index.csr.html')).toBeFalse();
  });

  it('returns consistent GET and HEAD responses for a CSR route', async () => {
    const { env } = createEnv();
    const get = await worker.fetch(new Request('https://descontovivo.com/publicar'), env);
    const head = await worker.fetch(new Request('https://descontovivo.com/publicar', { method: 'HEAD' }), env);

    expect(get.status).toBe(200);
    expect(head.status).toBe(get.status);
    expect(head.headers.get('content-type')).toBe(get.headers.get('content-type'));
    expect(head.headers.has('location')).toBeFalse();
    expect(await head.text()).toBe('');
    for (const header of SECURITY_HEADERS) {
      expect(get.headers.has(header)).withContext(header).toBeTrue();
      expect(head.headers.get(header)).withContext(header).toBe(get.headers.get(header));
    }
  });

  it('keeps unknown routes as real 404 responses with noindex', async () => {
    const { env } = createEnv();
    const response = await worker.fetch(new Request('https://descontovivo.com/rota-inexistente-hotfix'), env);

    expect(response.status).toBe(404);
    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow');
    expect(await response.text()).toBe('Not Found');
  });

  it('preserves the canonical redirect for institutional routes', async () => {
    const { env } = createEnv();
    const response = await worker.fetch(new Request('https://descontovivo.com/sobre'), env);

    expect(response.status).toBe(301);
    expect(response.headers.get('location')).toBe('https://descontovivo.com/sobre/');
  });

  it('keeps promotion detail requests on the Angular SSR path', async () => {
    const handle = jasmine.createSpy('handle').and.resolveTo(
      new Response('<!doctype html><html><body>SSR promotion</body></html>', {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      }),
    );
    const { env, assets } = createEnv();
    const request = new Request('https://descontovivo.com/promocoes/produto-teste');
    const response = await handleWorkerRequest(request, env, handle);

    expect(response.status).toBe(200);
    expect(await response.text()).toContain('SSR promotion');
    expect(handle).toHaveBeenCalledWith(request);
    expect(assets.requests).toEqual([]);
  });

  it('keeps the story-image proxy separate from static assets', async () => {
    const upstream = spyOn(globalThis, 'fetch').and.resolveTo(
      new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { 'content-type': 'image/webp' } }),
    );
    const { env, assets } = createEnv();
    const response = await worker.fetch(
      new Request('https://descontovivo.com/story-image?url=https%3A%2F%2Fimg.descontovivo.com.br%2Fproduto.webp'),
      env,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/webp');
    expect(upstream).toHaveBeenCalled();
    expect(assets.requests).toEqual([]);
  });

  it('preserves legacy-host redirects and ordinary static asset delivery', async () => {
    const { env } = createEnv();
    const legacy = await worker.fetch(new Request('https://www.descontovivo.com/publicar?origem=teste'), env);
    const asset = await worker.fetch(new Request('https://descontovivo.com/app.js'), env);

    expect(legacy.status).toBe(301);
    expect(legacy.headers.get('location')).toBe('https://descontovivo.com/publicar?origem=teste');
    expect(asset.status).toBe(200);
    expect(await asset.text()).toBe('static asset');
  });
});

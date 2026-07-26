import { handleCsrRoute, NextFunction } from './csr-route-handler';

const CSR_HTML = '<!doctype html><html><body><app-root></app-root></body></html>';
const SECURITY_HEADERS = [
  'content-security-policy',
  'x-content-type-options',
  'referrer-policy',
  'x-frame-options',
  'permissions-policy',
  'strict-transport-security',
];

function createNext(status = 404): jasmine.Spy<NextFunction> {
  return jasmine.createSpy<NextFunction>('next').and.resolveTo(new Response('static', { status }));
}

describe('Pages Functions CSR route handler', () => {
  it('returns the imported shell for GET /publicar without changing its URL', async () => {
    const request = new Request('https://descontovivo.com/publicar');
    const next = createNext();
    const response = await handleCsrRoute(request, CSR_HTML, next);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/html; charset=utf-8');
    expect(response.headers.has('Location')).toBeFalse();
    expect(await response.text()).toContain('<app-root>');
    expect(request.url).toBe('https://descontovivo.com/publicar');
    expect(next).not.toHaveBeenCalled();
  });

  it('ignores the query string when selecting and returning the shell', async () => {
    const request = new Request('https://descontovivo.com/publicar?hotfix=0529');
    const response = await handleCsrRoute(request, CSR_HTML, createNext());

    expect(response.status).toBe(200);
    expect(await response.text()).toBe(CSR_HTML);
    expect(request.url).toBe('https://descontovivo.com/publicar?hotfix=0529');
  });

  it('returns GET-equivalent headers and an empty body for HEAD', async () => {
    const next = createNext();
    const get = await handleCsrRoute(
      new Request('https://descontovivo.com/admin/subrota'),
      CSR_HTML,
      next,
    );
    const head = await handleCsrRoute(
      new Request('https://descontovivo.com/admin/subrota', { method: 'HEAD' }),
      CSR_HTML,
      next,
    );

    expect(head.status).toBe(200);
    expect(head.headers.get('Content-Type')).toBe(get.headers.get('Content-Type'));
    expect(head.headers.get('Cache-Control')).toBe(get.headers.get('Cache-Control'));
    expect(head.headers.get('X-Robots-Tag')).toBe(get.headers.get('X-Robots-Tag'));
    expect(await head.text()).toBe('');
  });

  it('returns 405 with navigation headers for unsupported methods', async () => {
    const response = await handleCsrRoute(
      new Request('https://descontovivo.com/publicar', { method: 'POST' }),
      CSR_HTML,
      createNext(),
    );

    expect(response.status).toBe(405);
    expect(response.headers.get('Allow')).toBe('GET, HEAD');
    expect(response.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(response.headers.get('X-Robots-Tag')).toBe('noindex, nofollow');
  });

  it('applies cache, robots and project security headers', async () => {
    const response = await handleCsrRoute(
      new Request('https://descontovivo.com/login'),
      CSR_HTML,
      createNext(),
    );

    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(response.headers.get('X-Robots-Tag')).toBe('noindex, nofollow');
    for (const header of SECURITY_HEADERS) {
      expect(response.headers.has(header)).withContext(header).toBeTrue();
    }
  });

  for (const path of ['/admin/subrota', '/moderacao/subrota', '/promocoes']) {
    it(`returns the shell for ${path}`, async () => {
      const response = await handleCsrRoute(
        new Request(`https://descontovivo.com${path}`),
        CSR_HTML,
        createNext(),
      );

      expect(response.status).toBe(200);
      expect(await response.text()).toBe(CSR_HTML);
    });
  }

  for (const path of [
    '/promocoes/produto-teste',
    '/story-image',
    '/sobre',
    '/app.js',
    '/rota-desconhecida',
  ]) {
    it(`delegates ${path} without returning the shell`, async () => {
      const next = createNext();
      const response = await handleCsrRoute(
        new Request(`https://descontovivo.com${path}`),
        CSR_HTML,
        next,
      );

      expect(next).toHaveBeenCalledOnceWith();
      expect(response.status).toBe(404);
      expect(await response.text()).toBe('static');
    });
  }
});

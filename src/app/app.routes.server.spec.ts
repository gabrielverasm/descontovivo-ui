import { RenderMode } from '@angular/ssr';
import { serverRoutes } from './app.routes.server';

describe('server routes', () => {
  it('renders only promotion details on demand', () => {
    expect(serverRoutes.find((route) => route.path === 'promocoes/:slug')?.renderMode)
      .toBe(RenderMode.Server);
    expect(serverRoutes.find((route) => route.path === '')?.renderMode)
      .toBe(RenderMode.Prerender);
    expect(serverRoutes.find((route) => route.path === 'sobre')?.renderMode)
      .toBe(RenderMode.Prerender);
    expect(serverRoutes.find((route) => route.path === '**')?.renderMode)
      .toBe(RenderMode.Client);
  });
});

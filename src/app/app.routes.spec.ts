import { routes } from './app.routes';

describe('administrative routes', () => {
  it('keeps queue and workspace as separate moderator routes', () => {
    const queue = routes[0].children?.find((route) => route.path === 'moderacao');
    const workspace = routes[0].children?.find((route) => route.path === 'moderacao/promocoes');
    expect(queue?.canActivate).toBeTruthy();
    expect(workspace?.canActivate).toBeTruthy();
    expect(queue?.title).toBe('Moderação | DescontoVivo');
    expect(workspace?.title).toBe('Moderação | DescontoVivo');
  });

  it('does not add administrative paths to prerender routes', async () => {
    const { serverRoutes } = await import('./app.routes.server');
    expect(serverRoutes.some((route) => route.path === 'moderacao' || route.path === 'moderacao/promocoes')).toBeFalse();
  });
});

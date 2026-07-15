import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: '',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'sobre',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'servicos',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'transparencia',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'privacidade',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'termos',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'promocoes/:slug',
    renderMode: RenderMode.Client,
  },
  {
    path: '**',
    renderMode: RenderMode.Client,
  },
];

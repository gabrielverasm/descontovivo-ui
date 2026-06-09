import { Routes } from '@angular/router';

import { PublicLayoutComponent } from './layouts/public-layout/public-layout.component';

export const routes: Routes = [
  {
    path: '',
    component: PublicLayoutComponent,
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/promotions/promotions.component').then((m) => m.PromotionsComponent),
        title: 'Promocoes | DescontoVivo'
      },
      {
        path: 'promocoes',
        redirectTo: '',
        pathMatch: 'full'
      },
      {
        path: 'promocoes/:id',
        loadComponent: () =>
          import('./features/promotions/promotion-detail.component').then(
            (m) => m.PromotionDetailComponent
          ),
        title: 'Detalhe da promocao | DescontoVivo'
      },
      {
        path: 'publicar',
        loadComponent: () =>
          import('./features/publish/publish-promotion.component').then(
            (m) => m.PublishPromotionComponent
          ),
        title: 'Publicar promocao | DescontoVivo'
      },
      {
        path: 'sobre',
        loadComponent: () =>
          import('./features/about/about.component').then((m) => m.AboutComponent),
        title: 'Sobre o DescontoVivo | Promoções com contexto, comunidade e segurança'
      },
      {
        path: 'login',
        loadComponent: () =>
          import('./features/auth/login.component').then((m) => m.LoginComponent),
        title: 'Entrar | DescontoVivo'
      },
      {
        path: 'cadastro',
        loadComponent: () =>
          import('./features/auth/register.component').then((m) => m.RegisterComponent),
        title: 'Cadastro | DescontoVivo'
      },
      {
        path: 'erro',
        loadComponent: () =>
          import('./features/errors/server-error.component').then((m) => m.ServerErrorComponent),
        title: 'Erro | DescontoVivo'
      },
      {
        path: '**',
        loadComponent: () =>
          import('./features/errors/not-found.component').then((m) => m.NotFoundComponent),
        title: 'Pagina nao encontrada | DescontoVivo'
      }
    ]
  }
];

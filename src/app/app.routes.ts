import { Routes } from '@angular/router';

import { emailVerifiedGuard } from './core/guards/email-verified.guard';
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
        title: 'Promoções | DescontoVivo',
      },
      {
        path: 'promocoes',
        redirectTo: '',
        pathMatch: 'full',
      },
      {
        path: 'promocoes/:id',
        loadComponent: () =>
          import('./features/promotions/promotion-detail.component').then(
            (m) => m.PromotionDetailComponent,
          ),
        title: 'Detalhe da promoção | DescontoVivo',
      },
      {
        path: 'publicar',
        canActivate: [emailVerifiedGuard],
        loadComponent: () =>
          import('./features/publish/publish-promotion.component').then(
            (m) => m.PublishPromotionComponent,
          ),
        title: 'Publicar promoção | DescontoVivo',
      },
      {
        path: 'sobre',
        loadComponent: () =>
          import('./features/about/about.component').then((m) => m.AboutComponent),
        title: 'Sobre o DescontoVivo | Promoções com contexto, comunidade e segurança',
      },
      {
        path: 'servicos',
        loadComponent: () =>
          import('./features/services/services.component').then((m) => m.ServicesComponent),
        title: 'Serviços | DescontoVivo',
      },
      {
        path: 'login',
        loadComponent: () =>
          import('./features/auth/login.component').then((m) => m.LoginComponent),
        title: 'Entrar | DescontoVivo',
      },
      {
        path: 'cadastro',
        loadComponent: () =>
          import('./features/auth/register.component').then((m) => m.RegisterComponent),
        title: 'Cadastro | DescontoVivo',
      },
      {
        path: 'erro',
        loadComponent: () =>
          import('./features/errors/server-error.component').then((m) => m.ServerErrorComponent),
        title: 'Erro | DescontoVivo',
      },
      {
        path: '**',
        loadComponent: () =>
          import('./features/errors/not-found.component').then((m) => m.NotFoundComponent),
        title: 'Página não encontrada | DescontoVivo',
      },
    ],
  },
];

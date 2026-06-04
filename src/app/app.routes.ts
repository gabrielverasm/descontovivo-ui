import { Routes } from '@angular/router';

import { PublicLayoutComponent } from './layouts/public-layout/public-layout.component';
import { HomeComponent } from './features/home/home.component';
import { LoginComponent } from './features/auth/login.component';
import { RegisterComponent } from './features/auth/register.component';
import { PromotionsComponent } from './features/promotions/promotions.component';
import { NotFoundComponent } from './features/errors/not-found.component';
import { ServerErrorComponent } from './features/errors/server-error.component';

export const routes: Routes = [
  {
    path: '',
    component: PublicLayoutComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        component: HomeComponent,
      },
      {
        path: 'login',
        component: LoginComponent,
      },
      {
        path: 'cadastro',
        component: RegisterComponent,
      },
      {
        path: 'promocoes',
        component: PromotionsComponent,
      },
      {
        path: 'erro-500',
        component: ServerErrorComponent,
      },
    ],
  },
  {
    path: '**',
    component: NotFoundComponent,
  },
];

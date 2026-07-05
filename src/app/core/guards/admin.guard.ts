import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, take } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.checkAuth().pipe(
    take(1),
    map((isAuthenticated) => {
      if (!isAuthenticated) {
        authService.login(state.url);
        return false;
      }
      if (!authService.hasRole('admin')) {
        return router.createUrlTree(['/']);
      }
      return true;
    }),
  );
};

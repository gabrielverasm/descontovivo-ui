import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { map, take, tap } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);

  return authService.checkAuth().pipe(
    take(1),
    tap((isAuthenticated) => {
      if (!isAuthenticated) {
        authService.login();
      }
    }),
    map((isAuthenticated) => isAuthenticated),
  );
};

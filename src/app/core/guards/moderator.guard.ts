import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { map, take } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const moderatorGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);

  return authService.checkAuth().pipe(
    take(1),
    map((isAuthenticated) => {
      if (!isAuthenticated) {
        authService.login(state.url);
        return false;
      }
      return authService.canModerate();
    }),
  );
};

import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { AbstractSecurityStorage, DefaultLocalStorageService, LogLevel, provideAuth } from 'angular-auth-oidc-client';

import { routes } from './app.routes';
import { environment } from '../environments/environment';
import { authInterceptor } from './core/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'disabled', anchorScrolling: 'enabled' })),
    provideHttpClient(withInterceptors([authInterceptor])),
    /**
     * Store OIDC tokens in localStorage instead of the default sessionStorage.
     * Trade-offs:
     * - ✓ Resolves session sharing between tabs (new tab recognizes logged-in user)
     * - ✓ Refresh token persists across tabs, enabling silent renew without iframes
     * - ✗ Increases impact of XSS attacks (tokens accessible to any script on the page)
     * - Mitigation: CSP headers in _headers file + no inline scripts
     * - Note: users with existing sessionStorage tokens will need to log in once after deploy
     * Logout sync: the library does NOT auto-sync logout across tabs via storage events.
     * When logout is triggered in one tab, checkAuth() in the other tab will detect
     * invalid/expired tokens on next navigation or refresh. Full cross-tab logout
     * sync (via StorageEvent listener) can be added later if needed.
     */
    { provide: AbstractSecurityStorage, useClass: DefaultLocalStorageService },
    provideAuth({
      config: {
        authority: environment.oidc.issuer,
        redirectUrl: environment.oidc.redirectUri,
        postLogoutRedirectUri: environment.oidc.postLogoutRedirectUri,
        clientId: environment.oidc.clientId,
        scope: environment.oidc.scope,
        responseType: 'code',
        silentRenew: true,
        useRefreshToken: true,
        silentRenewUrl: `${window.location.origin}/silent-renew.html`,
        logLevel: environment.production ? LogLevel.None : LogLevel.Debug,
      },
    }),
  ],
};

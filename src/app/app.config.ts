import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { AbstractSecurityStorage, DefaultLocalStorageService, LogLevel, provideAuth } from 'angular-auth-oidc-client';

import { routes } from './app.routes';
import { environment } from '../environments/environment';
import { authInterceptor } from './core/interceptors/auth.interceptor';

const oidcOrigin = new URL(environment.oidc.redirectUri).origin;

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'disabled', anchorScrolling: 'enabled' })),
    provideHttpClient(withInterceptors([authInterceptor])),
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
        silentRenewUrl: `${oidcOrigin}/silent-renew.html`,
        logLevel: environment.production ? LogLevel.None : LogLevel.Debug,
      },
    }),
    /**
     * Override OIDC token storage to use localStorage instead of sessionStorage.
     * MUST be registered AFTER provideAuth() so the library picks up the override.
     *
     * Benefits:
     * - ✓ Session sharing between tabs (new tab recognizes logged-in user)
     * - ✓ Refresh token persists across tabs, enabling silent renew
     * Risk mitigation:
     * - CSP headers in public/_headers + no inline scripts
     * - Users with existing sessionStorage tokens will need to log in once after deploy
     *
     * Logout sync: the library does NOT auto-sync logout across tabs via storage events.
     * When logout is triggered in one tab, checkAuth() in the other tab will detect
     * invalid/expired tokens on next navigation or refresh.
     */
    { provide: AbstractSecurityStorage, useClass: DefaultLocalStorageService },
    provideClientHydration(withEventReplay()),
  ],
};

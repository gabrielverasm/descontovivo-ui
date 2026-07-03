import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { LogLevel, provideAuth } from 'angular-auth-oidc-client';

import { routes } from './app.routes';
import { environment } from '../environments/environment';
import { authInterceptor } from './core/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' })),
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
        logLevel: environment.production ? LogLevel.None : LogLevel.Debug,
      },
    }),
  ],
};

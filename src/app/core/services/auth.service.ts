import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { BehaviorSubject, catchError, map, Observable, of, switchMap, tap } from 'rxjs';
import { AccountMe } from '../models/account-me.model';
import { AccountService } from './account.service';
import { canComment, canModerate, canPublish, canVote, hasRole } from '../utils/permissions';

const RETURN_URL_KEY = 'descontovivo_return_url';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly oidc = inject(OidcSecurityService);
  private readonly accountService = inject(AccountService);
  private readonly router = inject(Router);

  private readonly currentUserSubject = new BehaviorSubject<AccountMe | null>(null);
  private readonly authReadySubject = new BehaviorSubject<boolean>(false);

  readonly currentUser$ = this.currentUserSubject.asObservable();
  readonly isAuthenticated$: Observable<boolean> = this.oidc.isAuthenticated$.pipe(
    map((result) => result.isAuthenticated),
  );

  /**
   * Emits `true` once the initial auth check has completed.
   * The header uses this to avoid flashing "Entrar" while
   * the auth state is still being determined.
   */
  readonly authReady$ = this.authReadySubject.asObservable();

  login(returnUrl?: string): void {
    this.storeReturnUrl(returnUrl);
    this.oidc.authorize();
  }

  register(returnUrl?: string): void {
    this.storeReturnUrl(returnUrl);

    this.oidc.authorize(undefined, {
      urlHandler: (authUrl: string) => {
        const registrationUrl = authUrl.replace(
          '/protocol/openid-connect/auth?',
          '/protocol/openid-connect/registrations?',
        );
        window.location.assign(registrationUrl);
      },
    });
  }

  logout(): void {
    this.oidc.logoff().subscribe();
  }

  /**
   * Two-phase authentication check optimized for cross-tab session detection:
   *
   * Phase 1 — Local check (fast):
   *   Uses checkAuth() which reads tokens from localStorage. Since we use
   *   localStorage (shared across tabs), this instantly finds tokens written
   *   by any other tab. No network/iframe needed.
   *
   * Phase 2 — Server check (only if local fails):
   *   If no local tokens exist, falls back to checkAuthIncludingServer() which
   *   uses an iframe to ask Keycloak if an SSO session exists. This handles the
   *   case where the user logged in through a different client/app but this
   *   client has no tokens yet.
   *
   * This order ensures new tabs authenticate instantly via localStorage (phase 1)
   * without waiting for the slower iframe-based server check.
   */
  checkAuth(): Observable<boolean> {
    return this.oidc.checkAuth().pipe(
      switchMap((result) => {
        if (result.isAuthenticated) {
          // Phase 1 success: local tokens found (shared via localStorage)
          return this.loadCurrentUser().pipe(
            tap(() => this.navigateToReturnUrl()),
            tap(() => this.authReadySubject.next(true)),
            map(() => true),
          );
        }
        // Phase 1 failed: no local tokens. Try server SSO check.
        return this.checkAuthViaServer();
      }),
      catchError(() => {
        // Local check threw — try server check as fallback
        return this.checkAuthViaServer();
      }),
    );
  }

  /**
   * Phase 2: iframe-based SSO check against Keycloak.
   * Used when no local tokens exist but an SSO session might.
   */
  private checkAuthViaServer(): Observable<boolean> {
    return this.oidc.checkAuthIncludingServer().pipe(
      switchMap((result) => {
        if (result.isAuthenticated) {
          return this.loadCurrentUser().pipe(
            tap(() => this.navigateToReturnUrl()),
            tap(() => this.authReadySubject.next(true)),
            map(() => true),
          );
        }
        this.currentUserSubject.next(null);
        this.authReadySubject.next(true);
        return of(false);
      }),
      catchError(() => {
        // Server check failed (iframe blocked, timeout, network error).
        // Mark as ready with no user — the app remains functional.
        this.currentUserSubject.next(null);
        this.authReadySubject.next(true);
        return of(false);
      }),
    );
  }

  loadCurrentUser(): Observable<AccountMe | null> {
    return this.accountService.getMe().pipe(
      tap((user) => this.currentUserSubject.next(user)),
      catchError(() => {
        this.currentUserSubject.next(null);
        return of(null);
      }),
    );
  }

  getAccessToken(): Observable<string> {
    return this.oidc.getAccessToken();
  }

  hasRole(role: string): boolean {
    return hasRole(this.currentUserSubject.value, role);
  }

  canModerate(): boolean {
    return canModerate(this.currentUserSubject.value);
  }

  canPublish(): boolean {
    return canPublish(this.currentUserSubject.value);
  }

  canVote(): boolean {
    return canVote(this.currentUserSubject.value);
  }

  canComment(): boolean {
    return canComment(this.currentUserSubject.value);
  }

  private storeReturnUrl(returnUrl?: string): void {
    if (returnUrl && !['/login', '/cadastro'].includes(returnUrl)) {
      sessionStorage.setItem(RETURN_URL_KEY, returnUrl);
    }
  }

  private navigateToReturnUrl(): void {
    const returnUrl = sessionStorage.getItem(RETURN_URL_KEY);
    if (returnUrl) {
      sessionStorage.removeItem(RETURN_URL_KEY);
      this.router.navigateByUrl(returnUrl);
    }
  }
}

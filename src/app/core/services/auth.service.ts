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

  readonly currentUser$ = this.currentUserSubject.asObservable();
  readonly isAuthenticated$: Observable<boolean> = this.oidc.isAuthenticated$.pipe(
    map((result) => result.isAuthenticated),
  );

  login(returnUrl?: string): void {
    this.storeReturnUrl(returnUrl);
    this.oidc.authorize();
  }

  register(returnUrl?: string): void {
    this.storeReturnUrl(returnUrl);
    this.oidc.authorize(undefined, { customParams: { kc_action: 'register' } });
  }

  logout(): void {
    this.oidc.logoff().subscribe();
  }

  checkAuth(): Observable<boolean> {
    return this.oidc.checkAuth().pipe(
      switchMap((result) => {
        if (result.isAuthenticated) {
          return this.loadCurrentUser().pipe(
            tap(() => this.navigateToReturnUrl()),
            map(() => true),
          );
        }
        this.currentUserSubject.next(null);
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
    if (returnUrl) {
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

import { inject, Injectable } from '@angular/core';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { BehaviorSubject, catchError, map, Observable, of, switchMap, tap } from 'rxjs';
import { AccountMe } from '../models/account-me.model';
import { AccountService } from './account.service';
import { canComment, canModerate, canPublish, canVote, hasRole } from '../utils/permissions';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly oidc = inject(OidcSecurityService);
  private readonly accountService = inject(AccountService);

  private readonly currentUserSubject = new BehaviorSubject<AccountMe | null>(null);

  readonly currentUser$ = this.currentUserSubject.asObservable();
  readonly isAuthenticated$: Observable<boolean> = this.oidc.isAuthenticated$.pipe(
    map((result) => result.isAuthenticated),
  );

  login(): void {
    this.oidc.authorize();
  }

  logout(): void {
    this.oidc.logoff().subscribe();
  }

  checkAuth(): Observable<boolean> {
    return this.oidc.checkAuth().pipe(
      switchMap((result) => {
        if (result.isAuthenticated) {
          return this.loadCurrentUser().pipe(map(() => true));
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
}

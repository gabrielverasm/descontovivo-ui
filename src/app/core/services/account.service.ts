import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AccountMe } from '../models/account-me.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AccountService {
  private readonly http = inject(HttpClient);

  getMe(): Observable<AccountMe> {
    return this.http.get<AccountMe>(`${environment.apiBaseUrl}/account/me`);
  }
}

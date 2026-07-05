import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, shareReplay, catchError, map } from 'rxjs';
import { environment } from '../../../environments/environment';

interface VersionResponse {
  name: string;
  version: string;
}

@Injectable({ providedIn: 'root' })
export class VersionService {
  private readonly http = inject(HttpClient);

  private readonly apiVersion$: Observable<string | null> = this.http
    .get<VersionResponse>(`${environment.apiBaseUrl}/version`)
    .pipe(
      map((res) => res.version),
      catchError(() => of(null)),
      shareReplay(1),
    );

  getApiVersion(): Observable<string | null> {
    return this.apiVersion$;
  }
}

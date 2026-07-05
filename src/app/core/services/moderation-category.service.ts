import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ModerationCategory {
  name: string;
  promotionCount: number;
}

@Injectable({ providedIn: 'root' })
export class ModerationCategoryService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/moderation/categories`;

  list(): Observable<ModerationCategory[]> {
    return this.http.get<ModerationCategory[]>(this.baseUrl);
  }

  rename(oldName: string, newName: string): Observable<ModerationCategory> {
    return this.http.patch<ModerationCategory>(
      `${this.baseUrl}/${encodeURIComponent(oldName)}`,
      { name: newName }
    );
  }

  delete(name: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/${encodeURIComponent(name)}`
    );
  }
}

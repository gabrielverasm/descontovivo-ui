import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AdminImportRequest, AdminImportResponse } from '../models/admin-import.model';

@Injectable({ providedIn: 'root' })
export class AdminImportService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/admin/promotions/import`;

  import(body: AdminImportRequest, dryRun = false): Observable<AdminImportResponse> {
    let params = new HttpParams();
    if (dryRun) {
      params = params.set('dryRun', 'true');
    }
    return this.http.post<AdminImportResponse>(this.baseUrl, body, { params });
  }
}

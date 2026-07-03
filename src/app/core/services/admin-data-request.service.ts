import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AdminDataRequestFilters,
  AdminDataRequestSummary,
  AdminDataRequestUpdate,
} from '../models/admin-data-request.model';

@Injectable({ providedIn: 'root' })
export class AdminDataRequestService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/admin/account/data-requests`;

  list(filters?: AdminDataRequestFilters): Observable<AdminDataRequestSummary[]> {
    let params = new HttpParams();
    if (filters?.status) {
      params = params.set('status', filters.status);
    }
    if (filters?.type) {
      params = params.set('type', filters.type);
    }
    if (filters?.page != null) {
      params = params.set('page', filters.page.toString());
    }
    if (filters?.size != null) {
      params = params.set('size', filters.size.toString());
    }
    return this.http.get<AdminDataRequestSummary[]>(this.baseUrl, { params });
  }

  updateStatus(id: string, payload: AdminDataRequestUpdate): Observable<AdminDataRequestSummary> {
    return this.http.patch<AdminDataRequestSummary>(`${this.baseUrl}/${id}`, payload);
  }
}

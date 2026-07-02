import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type DataRequestType = 'ACCESS' | 'CORRECTION' | 'DELETION' | 'ANONYMIZATION' | 'CONSENT_REVOCATION' | 'OTHER';

export interface DataRequestResponse {
  id: string;
  type: string;
  status: string;
  createdAt: string;
  message: string;
}

export interface DataRequestSummary {
  id: string;
  type: string;
  status: string;
  createdAt: string;
  resolvedAt: string | null;
}

@Injectable({ providedIn: 'root' })
export class AccountDataService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/account`;

  createDataRequest(type: DataRequestType, details: string): Observable<DataRequestResponse> {
    return this.http.post<DataRequestResponse>(`${this.baseUrl}/data-requests`, { type, details });
  }

  getMyDataRequests(): Observable<DataRequestSummary[]> {
    return this.http.get<DataRequestSummary[]>(`${this.baseUrl}/data-requests/me`);
  }
}

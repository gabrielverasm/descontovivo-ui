import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type PriceVote = 'LIKE' | 'DISLIKE' | null;

export interface VoteResponse {
  likesCount: number;
  dislikesCount: number;
  userVote: PriceVote;
}

@Injectable({ providedIn: 'root' })
export class VoteService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  vote(slug: string, type: 'LIKE' | 'DISLIKE'): Observable<VoteResponse> {
    return this.http.put<VoteResponse>(
      `${this.baseUrl}/promotions/${encodeURIComponent(slug)}/vote`,
      { type },
    );
  }

  removeVote(slug: string): Observable<VoteResponse> {
    return this.http.delete<VoteResponse>(
      `${this.baseUrl}/promotions/${encodeURIComponent(slug)}/vote`,
    );
  }
}

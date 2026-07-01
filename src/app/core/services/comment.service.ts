import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CommentResponse } from '../models/comment.model';

@Injectable({ providedIn: 'root' })
export class CommentService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  listByPromotion(slug: string): Observable<CommentResponse[]> {
    return this.http.get<CommentResponse[]>(`${this.base}/promotions/${slug}/comments`);
  }

  createComment(slug: string, content: string): Observable<CommentResponse> {
    return this.http.post<CommentResponse>(`${this.base}/promotions/${slug}/comments`, { content });
  }
}

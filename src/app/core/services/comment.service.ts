import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Comment } from '../models/comment.model';

@Injectable({ providedIn: 'root' })
export class CommentService {
  getRootCommentsByPromotionId(_promotionId: string): Observable<Comment[]> {
    return of([]);
  }

  getCommentCountByPromotionId(_promotionId: string): Observable<number> {
    return of(0);
  }

  getAllComments(): Observable<Comment[]> {
    return of([]);
  }

  getRepliesByParentCommentId(_parentCommentId: string): Observable<Comment[]> {
    return of([]);
  }

  getLatestCommentByPromotionId(_promotionId: string): Observable<Comment | undefined> {
    return of(undefined);
  }
}

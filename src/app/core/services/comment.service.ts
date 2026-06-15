import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Comment } from '../models/comment.model';
import { COMMENTS_MOCK, getRootPromotionComments, getPromotionCommentCount } from '../mocks/comments.mock';

@Injectable({ providedIn: 'root' })
export class CommentService {
  getRootCommentsByPromotionId(promotionId: string): Observable<Comment[]> {
    return of([...getRootPromotionComments(promotionId)]);
  }

  getCommentCountByPromotionId(promotionId: string): Observable<number> {
    return of(getPromotionCommentCount(promotionId));
  }

  getAllComments(): Observable<Comment[]> {
    return of([...COMMENTS_MOCK]);
  }
}

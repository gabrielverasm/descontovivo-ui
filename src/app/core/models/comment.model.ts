import { User } from './user.model';

export interface Comment {
  id: string;
  promotionId: string;
  parentCommentId?: string;
  author: User;
  content: string;
  createdAt: string;
  likesCount: number;
  dislikesCount?: number;
}

export interface CommentResponse {
  id: string;
  parentId?: string | null;
  authorName: string;
  content: string;
  removed: boolean;
  createdAt: string;
}

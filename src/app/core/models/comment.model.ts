import { User } from './user.model';

export interface Comment {
  id: string;
  promotionId: string;
  author: User;
  content: string;
  createdAt: string;
  likesCount: number;
}

export type UserRole = 'user' | 'moderator' | 'admin';

export interface User {
  id: string;
  name: string;
  avatarUrl?: string;
  role: UserRole;
}

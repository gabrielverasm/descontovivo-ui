import { AccountMe } from '../models/account-me.model';

export function hasRole(user: AccountMe | null, role: string): boolean {
  return !!user && user.roles.includes(role);
}

export function canModerate(user: AccountMe | null): boolean {
  return hasRole(user, 'moderator') || hasRole(user, 'admin');
}

export function canPublish(user: AccountMe | null): boolean {
  return !!user && user.emailVerified;
}

export function canVote(user: AccountMe | null): boolean {
  return !!user && user.emailVerified;
}

export function canComment(user: AccountMe | null): boolean {
  return !!user && user.emailVerified;
}

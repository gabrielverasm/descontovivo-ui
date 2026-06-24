export interface AccountMe {
  subject: string;
  username: string | null;
  email: string | null;
  emailVerified: boolean;
  roles: string[];
}

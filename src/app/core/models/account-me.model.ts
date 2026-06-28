export interface AccountMe {
  subject: string;
  username: string | null;
  preferredUsername?: string | null;
  preferred_username?: string | null;
  name?: string | null;
  email: string | null;
  emailVerified: boolean;
  roles: string[];
}

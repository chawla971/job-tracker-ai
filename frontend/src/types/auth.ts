export interface AuthUser {
  id: string;
  email: string;
  name: string;
  picture: string | null;
  is_admin: boolean;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

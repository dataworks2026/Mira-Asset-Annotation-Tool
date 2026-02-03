export interface LoginCredentials {
  email: string;
  password: string;
}

export interface User {
  email: string;
  full_name: string;
  role: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface User {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  profile_picture_url?: string;
  instagram_handle?: string;
  twitter_handle?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
}

export interface UserResponse {
  id: string;
  username: string;
  email: string;
  profile_picture_url?: string;
  instagram_handle?: string;
  twitter_handle?: string;
  created_at: Date;
  updated_at: Date;
}

export interface AuthResponse {
  user: UserResponse;
  token: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}
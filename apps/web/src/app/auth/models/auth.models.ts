export interface SafeUser {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}
export interface TokenResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
}
export interface LoginInput {
  email: string;
  password: string;
}

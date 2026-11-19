export interface TokenResponse { accessToken:string; tokenType:'Bearer'; expiresIn:number; }
export interface AuthResult { response:TokenResponse; refreshToken:string; refreshExpiresAt:Date; }
export interface LoginInput { email: string; password: string; }

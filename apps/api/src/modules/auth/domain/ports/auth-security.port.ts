export const PASSWORD_HASHER_PORT=Symbol('PASSWORD_HASHER_PORT');
export const ACCESS_TOKEN_PORT=Symbol('ACCESS_TOKEN_PORT');
export const REFRESH_TOKEN_PORT=Symbol('REFRESH_TOKEN_PORT');
export const CLOCK_PORT=Symbol('CLOCK_PORT');
export const ID_GENERATOR_PORT=Symbol('ID_GENERATOR_PORT');
export interface PasswordHasherPort { hash(password:string):Promise<string>; verify(password:string,hash:string|null):Promise<boolean>; }
export interface AccessTokenPort { readonly expiresInSeconds:number; sign(userId:string):Promise<string>; verify(token:string):Promise<{userId:string}>; }
export interface RefreshTokenPort { generate():string; hash(token:string):string; }
export interface ClockPort { now():Date; }
export interface IdGeneratorPort { generate():string; }
export const AUTH_SESSION_TTL_SECONDS = Symbol('AUTH_SESSION_TTL_SECONDS');

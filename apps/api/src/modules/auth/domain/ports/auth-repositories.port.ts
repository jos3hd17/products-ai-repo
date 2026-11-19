export const USER_REPOSITORY_PORT=Symbol('USER_REPOSITORY_PORT');
export const SESSION_REPOSITORY_PORT=Symbol('SESSION_REPOSITORY_PORT');
import { AuthSession } from '../entities/auth-session';
import { User } from '../entities/user';
export interface UserRepositoryPort {
  findByEmail(email:string):Promise<User|null>;
  findById(id:string):Promise<User|null>;
  upsertDemo(input:{id:string;email:string;passwordHash:string;now:Date}):Promise<void>;
}
export interface SessionRepositoryPort {
  create(session:AuthSession):Promise<void>;
  findByTokenHash(hash:string):Promise<AuthSession|null>;
  rotate(input:{sessionId:string;oldHash:string;newHash:string;now:Date}):Promise<AuthSession|null>;
  revoke(sessionId:string,now:Date):Promise<void>;
}

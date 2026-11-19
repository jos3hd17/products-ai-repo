import { DomainError } from '../../../../shared/domain/domain-error';
export interface UserData { id:string; email:string; passwordHash:string; createdAt:Date; updatedAt:Date; }
export type SafeUser = Omit<UserData,'passwordHash'>;
export function normalizeEmail(email:string):string { return email.trim().toLowerCase(); }
export class User {
  readonly id:string; readonly email:string; readonly passwordHash:string;
  private readonly created:Date; private readonly updated:Date;
  constructor(data:UserData) {
    const email=normalizeEmail(data.email);
    if (!data.id || email.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !data.passwordHash || !Number.isFinite(data.createdAt.getTime()) || !Number.isFinite(data.updatedAt.getTime())) throw new DomainError('INVALID_INPUT','Invalid user');
    this.id=data.id;this.email=email;this.passwordHash=data.passwordHash;
    this.created=new Date(data.createdAt);this.updated=new Date(data.updatedAt);
  }
  toPersistence():UserData { return {...this.toSafe(),passwordHash:this.passwordHash}; }
  toSafe():SafeUser { return {id:this.id,email:this.email,createdAt:new Date(this.created),updatedAt:new Date(this.updated)}; }
}

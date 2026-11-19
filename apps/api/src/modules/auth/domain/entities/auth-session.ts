import { DomainError } from '../../../../shared/domain/domain-error';
export interface AuthSessionData {
  id:string; userId:string; refreshTokenHash:string; previousTokenHashes:string[];
  tokenFamilyId:string; createdAt:Date; updatedAt:Date; expiresAt:Date; revokedAt:Date|null; version:number;
}
export class AuthSession {
  private readonly data:AuthSessionData;
  constructor(data:AuthSessionData) {
    if (!data.id || !data.userId || !data.tokenFamilyId || !/^[a-f0-9]{64}$/.test(data.refreshTokenHash) || data.previousTokenHashes.some(h=>!/^[a-f0-9]{64}$/.test(h)) || !Number.isSafeInteger(data.version) || data.version<0 || data.version>1000 || data.previousTokenHashes.length !== data.version || !Number.isFinite(data.expiresAt.getTime())) throw new DomainError('INVALID_INPUT','Invalid authentication session');
    this.data={...data,previousTokenHashes:[...data.previousTokenHashes],createdAt:new Date(data.createdAt),updatedAt:new Date(data.updatedAt),expiresAt:new Date(data.expiresAt),revokedAt:data.revokedAt ? new Date(data.revokedAt):null};
  }
  get id():string { return this.data.id; }
  get userId():string { return this.data.userId; }
  get expiresAt():Date { return new Date(this.data.expiresAt); }
  get version():number { return this.data.version; }
  isUsable(now:Date):boolean { return this.data.revokedAt===null && this.data.expiresAt>now && this.data.version<1000; }
  matchesCurrent(hash:string):boolean { return this.data.refreshTokenHash===hash; }
  toPersistence():AuthSessionData { return {...this.data,previousTokenHashes:[...this.data.previousTokenHashes],createdAt:new Date(this.data.createdAt),updatedAt:new Date(this.data.updatedAt),expiresAt:new Date(this.data.expiresAt),revokedAt:this.data.revokedAt ? new Date(this.data.revokedAt):null}; }
}

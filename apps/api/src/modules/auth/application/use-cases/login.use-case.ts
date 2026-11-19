import { DomainError } from '../../../../shared/domain/domain-error';
import { AuthSession } from '../../domain/entities/auth-session';
import { normalizeEmail } from '../../domain/entities/user';
import { SessionRepositoryPort, UserRepositoryPort } from '../../domain/ports/auth-repositories.port';
import { AccessTokenPort, ClockPort, IdGeneratorPort, PasswordHasherPort, RefreshTokenPort } from '../../domain/ports/auth-security.port';
import { AuthResult } from '../dto/auth.contracts';
export class LoginUseCase {
  constructor(private readonly users:UserRepositoryPort,private readonly sessions:SessionRepositoryPort,private readonly passwords:PasswordHasherPort,private readonly access:AccessTokenPort,private readonly refresh:RefreshTokenPort,private readonly clock:ClockPort,private readonly ids:IdGeneratorPort,private readonly refreshTtlSeconds:number) {}
  async execute(input:{email:string;password:string}):Promise<AuthResult> {
    const user=await this.users.findByEmail(normalizeEmail(input.email));
    const valid=await this.passwords.verify(input.password,user?.passwordHash ?? null);
    if (!user || !valid) throw new DomainError('UNAUTHORIZED','Invalid credentials');
    const accessToken=await this.access.sign(user.id);
    const refreshToken=this.refresh.generate();const now=this.clock.now();const id=this.ids.generate();
    const expiresAt=new Date(now.getTime()+this.refreshTtlSeconds*1000);
    await this.sessions.create(new AuthSession({id,userId:user.id,tokenFamilyId:id,refreshTokenHash:this.refresh.hash(refreshToken),previousTokenHashes:[],version:0,createdAt:now,updatedAt:now,expiresAt,revokedAt:null}));
    return {response:{accessToken,tokenType:'Bearer',expiresIn:this.access.expiresInSeconds},refreshToken,refreshExpiresAt:expiresAt};
  }
}

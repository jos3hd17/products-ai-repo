import { SessionRepositoryPort } from '../../domain/ports/auth-repositories.port';
import { ClockPort, RefreshTokenPort } from '../../domain/ports/auth-security.port';
export class LogoutUseCase {
  constructor(private readonly sessions:SessionRepositoryPort,private readonly refresh:RefreshTokenPort,private readonly clock:ClockPort) {}
  async execute(token:string|undefined):Promise<void> {
    if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return;
    const session=await this.sessions.findByTokenHash(this.refresh.hash(token));
    if (session) await this.sessions.revoke(session.id,this.clock.now());
  }
}

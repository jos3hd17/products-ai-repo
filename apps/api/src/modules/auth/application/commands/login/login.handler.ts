import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { SESSION_REPOSITORY_PORT, SessionRepositoryPort, USER_REPOSITORY_PORT, UserRepositoryPort } from '../../../domain/ports/auth-repositories.port';
import { ACCESS_TOKEN_PORT, AUTH_SESSION_TTL_SECONDS, AccessTokenPort, CLOCK_PORT, ClockPort, ID_GENERATOR_PORT, IdGeneratorPort, PASSWORD_HASHER_PORT, PasswordHasherPort, REFRESH_TOKEN_PORT, RefreshTokenPort } from '../../../domain/ports/auth-security.port';
import { AuthResult } from '../../dto/auth.contracts';
import { LoginUseCase } from '../../use-cases/login.use-case';
import { LoginCommand } from './login.command';

@CommandHandler(LoginCommand)
export class LoginHandler implements ICommandHandler<LoginCommand, AuthResult> {
  private readonly workflow: LoginUseCase;
  constructor(
    @Inject(USER_REPOSITORY_PORT) users: UserRepositoryPort,
    @Inject(SESSION_REPOSITORY_PORT) sessions: SessionRepositoryPort,
    @Inject(PASSWORD_HASHER_PORT) passwords: PasswordHasherPort,
    @Inject(ACCESS_TOKEN_PORT) access: AccessTokenPort,
    @Inject(REFRESH_TOKEN_PORT) refresh: RefreshTokenPort,
    @Inject(CLOCK_PORT) clock: ClockPort,
    @Inject(ID_GENERATOR_PORT) ids: IdGeneratorPort,
    @Inject(AUTH_SESSION_TTL_SECONDS) ttl: number,
  ) {
    this.workflow = new LoginUseCase(users, sessions, passwords, access, refresh, clock, ids, ttl);
  }
  execute(command: LoginCommand): Promise<AuthResult> {
    return this.workflow.execute(command.input);
  }
}

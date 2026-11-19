import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { SESSION_REPOSITORY_PORT, SessionRepositoryPort, USER_REPOSITORY_PORT, UserRepositoryPort } from '../../../domain/ports/auth-repositories.port';
import { ACCESS_TOKEN_PORT, AccessTokenPort, CLOCK_PORT, ClockPort, REFRESH_TOKEN_PORT, RefreshTokenPort } from '../../../domain/ports/auth-security.port';
import { AuthResult } from '../../dto/auth.contracts';
import { RefreshTokenUseCase } from '../../use-cases/refresh-token.use-case';
import { RefreshTokenCommand } from './refresh-token.command';

@CommandHandler(RefreshTokenCommand)
export class RefreshTokenHandler implements ICommandHandler<RefreshTokenCommand, AuthResult> {
  private readonly workflow: RefreshTokenUseCase;
  constructor(
    @Inject(USER_REPOSITORY_PORT) users: UserRepositoryPort,
    @Inject(SESSION_REPOSITORY_PORT) sessions: SessionRepositoryPort,
    @Inject(ACCESS_TOKEN_PORT) access: AccessTokenPort,
    @Inject(REFRESH_TOKEN_PORT) refresh: RefreshTokenPort,
    @Inject(CLOCK_PORT) clock: ClockPort,
  ) {
    this.workflow = new RefreshTokenUseCase(users, sessions, access, refresh, clock);
  }
  execute(command: RefreshTokenCommand): Promise<AuthResult> {
    return this.workflow.execute(command.token);
  }
}

import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { SESSION_REPOSITORY_PORT, SessionRepositoryPort } from '../../../domain/ports/auth-repositories.port';
import { CLOCK_PORT, ClockPort, REFRESH_TOKEN_PORT, RefreshTokenPort } from '../../../domain/ports/auth-security.port';
import { LogoutUseCase } from '../../use-cases/logout.use-case';
import { LogoutCommand } from './logout.command';

@CommandHandler(LogoutCommand)
export class LogoutHandler implements ICommandHandler<LogoutCommand, void> {
  private readonly workflow: LogoutUseCase;
  constructor(
    @Inject(SESSION_REPOSITORY_PORT) sessions: SessionRepositoryPort,
    @Inject(REFRESH_TOKEN_PORT) refresh: RefreshTokenPort,
    @Inject(CLOCK_PORT) clock: ClockPort,
  ) {
    this.workflow = new LogoutUseCase(sessions, refresh, clock);
  }
  execute(command: LogoutCommand): Promise<void> {
    return this.workflow.execute(command.token);
  }
}

import { Inject } from '@nestjs/common';
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { USER_REPOSITORY_PORT, UserRepositoryPort } from '../../../domain/ports/auth-repositories.port';
import { SafeUser } from '../../../domain/entities/user';
import { GetCurrentUserUseCase } from '../../use-cases/get-current-user.use-case';
import { GetCurrentUserQuery } from './get-current-user.query';

@QueryHandler(GetCurrentUserQuery)
export class GetCurrentUserHandler implements IQueryHandler<GetCurrentUserQuery, SafeUser> {
  private readonly workflow: GetCurrentUserUseCase;
  constructor(
    @Inject(USER_REPOSITORY_PORT) users: UserRepositoryPort,
  ) {
    this.workflow = new GetCurrentUserUseCase(users);
  }
  execute(query: GetCurrentUserQuery): Promise<SafeUser> {
    return this.workflow.execute(query.userId);
  }
}

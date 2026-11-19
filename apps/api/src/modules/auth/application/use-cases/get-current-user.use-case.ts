import { DomainError } from '../../../../shared/domain/domain-error';
import { SafeUser } from '../../domain/entities/user';
import { UserRepositoryPort } from '../../domain/ports/auth-repositories.port';
export class GetCurrentUserUseCase {
  constructor(private readonly users:UserRepositoryPort) {}
  async execute(userId:string):Promise<SafeUser> {
    const user=await this.users.findById(userId);
    if (!user) throw new DomainError('UNAUTHORIZED','Invalid authentication');
    return user.toSafe();
  }
}

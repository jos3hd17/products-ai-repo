import { DomainError } from '../../domain/domain-error';
import { PersistenceFailure } from '../../domain/persistence-failure';
/** Keep domain failures intact; do not let provider-specific errors cross repository ports. */
export async function withPersistenceErrors<T>(operation: () => Promise<T>): Promise<T> {
  try { return await operation(); }
  catch (error) {
    if (error instanceof DomainError) throw error;
    throw new PersistenceFailure();
  }
}

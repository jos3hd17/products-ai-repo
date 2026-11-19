export type DomainErrorCode = 'INVALID_INPUT' | 'NOT_FOUND' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'CONFLICT';
export class DomainError extends Error {
  constructor(public readonly code: DomainErrorCode, message: string) { super(message); this.name = 'DomainError'; }
}

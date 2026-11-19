import { AuthSession } from '../../../../domain/entities/auth-session';
import { AuthSessionRecord } from '../schemas/auth-session.schema';
export class AuthSessionMapper {
  static toDomain(record: AuthSessionRecord): AuthSession {
    return new AuthSession({ id: record._id, userId: record.userId, refreshTokenHash: record.refreshTokenHash,
      previousTokenHashes: record.previousTokenHashes, tokenFamilyId: record.tokenFamilyId,
      createdAt: record.createdAt, updatedAt: record.updatedAt, expiresAt: record.expiresAt,
      revokedAt: record.revokedAt, version: record.version });
  }
  static toPersistence(session: AuthSession): AuthSessionRecord {
    const { id, ...record } = session.toPersistence();
    return { _id: id, ...record };
  }
}

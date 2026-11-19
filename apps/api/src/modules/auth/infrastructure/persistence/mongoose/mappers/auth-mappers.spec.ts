import { UserMapper } from './user.mapper';
import { AuthSessionMapper } from './auth-session.mapper';
import { AuthSessionRecord } from '../schemas/auth-session.schema';
const now = new Date('2026-11-18T00:00:00Z');
it('round-trips user UUID, normalized email, hash and defensive dates without exposing Mongo internals', () => {
  const input = { _id: 'user-uuid', email: 'DEMO@example.test', passwordHash: 'synthetic-hash', createdAt: now, updatedAt: now };
  const user = UserMapper.toDomain(input);
  expect(user.toSafe()).toEqual({ id: input._id, email: 'demo@example.test', createdAt: now, updatedAt: now });
  expect(UserMapper.toPersistence(user)).toEqual({ ...input, email: 'demo@example.test' });
  expect(user.toSafe()).not.toHaveProperty('_id'); expect(user.toSafe()).not.toHaveProperty('passwordHash');
  const persisted = UserMapper.toPersistence(user); persisted.createdAt.setUTCFullYear(2000);
  expect(user.toSafe().createdAt).toEqual(now);
});
it.each([null, new Date('2026-11-18T00:30:00Z')])('preserves the complete session replay/revocation state (%p)', revokedAt => {
  const input: AuthSessionRecord = { _id: 'session-uuid', userId: 'user-uuid', refreshTokenHash: 'b'.repeat(64),
    previousTokenHashes: ['a'.repeat(64)], tokenFamilyId: 'session-uuid', version: 1,
    createdAt: now, updatedAt: now, expiresAt: new Date('2026-11-19T00:00:00Z'), revokedAt };
  const session = AuthSessionMapper.toDomain(input);
  const persisted = AuthSessionMapper.toPersistence(session);
  expect(persisted).toEqual(input); expect(session.id).toBe(input._id);
  persisted.previousTokenHashes.push('c'.repeat(64)); persisted.expiresAt.setUTCFullYear(2000);
  expect(session.toPersistence().previousTokenHashes).toEqual(input.previousTokenHashes);
  expect(session.expiresAt).toEqual(input.expiresAt);
});

import { withPersistenceErrors } from '../../../../../../shared/infrastructure/persistence/with-persistence-errors';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuthSession } from '../../../../domain/entities/auth-session';
import { SessionRepositoryPort } from '../../../../domain/ports/auth-repositories.port';
import { AuthSessionMapper } from '../mappers/auth-session.mapper';
import { AuthSessionRecord } from '../schemas/auth-session.schema';
@Injectable()
export class MongooseSessionRepository implements SessionRepositoryPort {
    constructor(
    @InjectModel('AuthSession')
    private readonly model: Model<AuthSessionRecord>) { }
    async create(session: AuthSession): Promise<void> {
        return withPersistenceErrors(async () => {
            await this.model.create(AuthSessionMapper.toPersistence(session));
        });
    }
    async findByTokenHash(hash: string): Promise<AuthSession | null> {
        return withPersistenceErrors(async () => {
            const session = await this.model.findOne({ $or: [{ refreshTokenHash: hash }, { previousTokenHashes: hash }] }).lean().exec();
            return session ? AuthSessionMapper.toDomain(session) : null;
        });
    }
    async rotate(input: {
        sessionId: string;
        oldHash: string;
        newHash: string;
        now: Date;
    }): Promise<AuthSession | null> {
        return withPersistenceErrors(async () => {
            const session = await this.model.findOneAndUpdate({ _id: input.sessionId, refreshTokenHash: input.oldHash, revokedAt: null, expiresAt: { $gt: input.now }, version: { $lt: 1000 } }, { $set: { refreshTokenHash: input.newHash, updatedAt: input.now }, $push: { previousTokenHashes: input.oldHash }, $inc: { version: 1 } }, { new: true, runValidators: true }).lean().exec();
            return session ? AuthSessionMapper.toDomain(session) : null;
        });
    }
    async revoke(sessionId: string, now: Date): Promise<void> {
        return withPersistenceErrors(async () => {
            await this.model.updateOne({ _id: sessionId, revokedAt: null }, { $set: { revokedAt: now, updatedAt: now } }).exec();
        });
    }
}

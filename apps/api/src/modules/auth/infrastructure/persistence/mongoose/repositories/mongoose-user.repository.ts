import { withPersistenceErrors } from '../../../../../../shared/infrastructure/persistence/with-persistence-errors';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { normalizeEmail, User } from '../../../../domain/entities/user';
import { UserRepositoryPort } from '../../../../domain/ports/auth-repositories.port';
import { UserMapper } from '../mappers/user.mapper';
import { UserRecord } from '../schemas/user.schema';
@Injectable()
export class MongooseUserRepository implements UserRepositoryPort {
    constructor(
    @InjectModel('User')
    private readonly model: Model<UserRecord>) { }
    async findByEmail(email: string): Promise<User | null> {
        return withPersistenceErrors(async () => {
            const user = await this.model.findOne({ email: normalizeEmail(email) }).lean().exec();
            return user ? UserMapper.toDomain(user) : null;
        });
    }
    async findById(id: string): Promise<User | null> {
        return withPersistenceErrors(async () => {
            const user = await this.model.findById(id).lean().exec();
            return user ? UserMapper.toDomain(user) : null;
        });
    }
    async upsertDemo(input: {
        id: string;
        email: string;
        passwordHash: string;
        now: Date;
    }): Promise<void> {
        return withPersistenceErrors(async () => {
            const email = normalizeEmail(input.email);
            await this.model.updateOne({ email }, { $setOnInsert: UserMapper.toPersistence(new User({ id: input.id, email, passwordHash: input.passwordHash, createdAt: input.now, updatedAt: input.now })) }, { upsert: true, runValidators: true, timestamps: false }).exec();
        });
    }
}

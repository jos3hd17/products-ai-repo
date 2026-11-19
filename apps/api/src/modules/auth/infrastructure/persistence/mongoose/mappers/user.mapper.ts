import { User } from '../../../../domain/entities/user';
import { UserRecord } from '../schemas/user.schema';
export class UserMapper {
  static toDomain(record: UserRecord): User {
    return new User({ id: record._id, email: record.email, passwordHash: record.passwordHash,
      createdAt: record.createdAt, updatedAt: record.updatedAt });
  }
  static toPersistence(user: User): UserRecord {
    const { id, ...record } = user.toPersistence();
    return { _id: id, ...record };
  }
}

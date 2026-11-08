import type { User as UserRow } from '../../../generated/prisma/client.js';
import type { PrismaExecutor } from '../../../shared/infrastructure/database/prisma-client.js';
import { isUniqueConstraintViolation } from '../../../shared/infrastructure/database/prisma-errors.js';
import type { CreateUserData, UpdateUserData, UserRepository } from '../application/user.repository.js';
import type { User } from '../domain/user.js';
import { EmailAlreadyInUseError } from '../domain/user.errors.js';

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly db: PrismaExecutor) {}

  async findById(id: string): Promise<User | null> {
    const row = await this.db.user.findUnique({ where: { id } });
    return row && toDomain(row);
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.db.user.findUnique({ where: { email } });
    return row && toDomain(row);
  }

  async create(data: CreateUserData): Promise<User> {
    try {
      return toDomain(await this.db.user.create({ data }));
    } catch (error) {
      if (isUniqueConstraintViolation(error)) throw new EmailAlreadyInUseError();
      throw error;
    }
  }

  async update(id: string, data: UpdateUserData): Promise<User> {
    return toDomain(await this.db.user.update({ where: { id }, data }));
  }
}

function toDomain(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.passwordHash,
    role: row.role,
    bio: row.bio,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

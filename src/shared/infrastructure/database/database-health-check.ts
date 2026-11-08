import type { PrismaClient } from './prisma-client.js';

export class DatabaseHealthCheck {
  constructor(private readonly prisma: PrismaClient) {}

  async isHealthy(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}

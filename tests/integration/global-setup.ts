import { execSync } from 'node:child_process';
import { testDatabaseUrl } from '../helpers/test-env.js';

export default function setup(): void {
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: testDatabaseUrl() },
    stdio: 'pipe',
  });
}

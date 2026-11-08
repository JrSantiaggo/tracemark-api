import 'dotenv/config';
import { loadEnv } from '../config/env.js';
import { ExpireStaleUploadsUseCase } from '../modules/photos/application/use-cases/expire-stale-uploads.use-case.js';
import { PrismaPhotoRepository } from '../modules/photos/infrastructure/prisma-photo.repository.js';
import { createPrismaClient } from '../shared/infrastructure/database/prisma-client.js';

const env = loadEnv();
const prisma = createPrismaClient(env.DATABASE_URL);

try {
  const useCase = new ExpireStaleUploadsUseCase(new PrismaPhotoRepository(prisma), env.STALE_UPLOAD_GRACE_MINUTES);
  const { expired } = await useCase.execute();
  console.log(JSON.stringify({ job: 'expire-stale-uploads', expired }));
} finally {
  await prisma.$disconnect();
}

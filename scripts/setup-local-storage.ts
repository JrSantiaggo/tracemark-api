import 'dotenv/config';
import {
  BucketAlreadyOwnedByYou,
  CreateBucketCommand,
  PutBucketCorsCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { loadEnv } from '../src/config/env.js';

const env = loadEnv();
if (!env.S3_ENDPOINT) {
  throw new Error('S3_ENDPOINT não definido: este script só configura o emulador S3 local.');
}

const client = new S3Client({
  region: env.AWS_REGION,
  endpoint: env.S3_ENDPOINT,
  forcePathStyle: env.S3_FORCE_PATH_STYLE,
});

try {
  await client.send(new CreateBucketCommand({ Bucket: env.S3_BUCKET }));
  console.log(`bucket ${env.S3_BUCKET} criado`);
} catch (error) {
  if (!(error instanceof BucketAlreadyOwnedByYou) && (error as Error).name !== 'BucketAlreadyExists') throw error;
  console.log(`bucket ${env.S3_BUCKET} já existe`);
}

if (env.CORS_ORIGINS.length > 0) {
  await client.send(
    new PutBucketCorsCommand({
      Bucket: env.S3_BUCKET,
      CORSConfiguration: {
        CORSRules: [
          { AllowedOrigins: env.CORS_ORIGINS, AllowedMethods: ['POST', 'GET'], AllowedHeaders: ['*'], MaxAgeSeconds: 3000 },
        ],
      },
    }),
  ).catch((error: Error) => console.warn(`CORS não aplicado: ${error.message}`));
}

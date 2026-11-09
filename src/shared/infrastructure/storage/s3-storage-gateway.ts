import { GetObjectCommand, HeadObjectCommand, S3Client, S3ServiceException } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type {
  CreatePresignedUploadInput,
  DownloadUrlOptions,
  PresignedUpload,
  SignedDownloadUrl,
  StorageGateway,
  StoredObjectMetadata,
} from '../../application/ports/storage-gateway.js';

export interface S3StorageConfig {
  region: string;
  bucket: string;
  endpoint?: string | undefined;
  forcePathStyle: boolean;
}

/** Credentials come from the default AWS provider chain (EC2 IAM Role in production). */
export class S3StorageGateway implements StorageGateway {
  private readonly client: S3Client;

  constructor(private readonly config: S3StorageConfig) {
    this.client = new S3Client({
      region: config.region,
      forcePathStyle: config.forcePathStyle,
      ...(config.endpoint ? { endpoint: config.endpoint } : {}),
    });
  }

  async createPresignedUpload(input: CreatePresignedUploadInput): Promise<PresignedUpload> {
    const { url, fields } = await createPresignedPost(this.client, {
      Bucket: this.config.bucket,
      Key: input.key,
      Expires: input.expiresInSeconds,
      Fields: { 'Content-Type': input.contentType },
      Conditions: [
        ['content-length-range', input.sizeBytes, input.sizeBytes],
        ['eq', '$Content-Type', input.contentType],
      ],
    });
    return { url, fields, expiresAt: secondsFromNow(input.expiresInSeconds) };
  }

  async getObjectMetadata(key: string): Promise<StoredObjectMetadata | null> {
    try {
      const head = await this.client.send(new HeadObjectCommand({ Bucket: this.config.bucket, Key: key }));
      return { sizeBytes: head.ContentLength ?? 0, contentType: head.ContentType ?? null };
    } catch (error) {
      if (error instanceof S3ServiceException && error.$metadata.httpStatusCode === 404) return null;
      throw error;
    }
  }

  async createDownloadUrl(
    key: string,
    expiresInSeconds: number,
    options: DownloadUrlOptions = {},
  ): Promise<SignedDownloadUrl> {
    const command = new GetObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
      ...(options.attachmentFileName
        ? { ResponseContentDisposition: attachmentDisposition(options.attachmentFileName) }
        : {}),
    });
    const url = await getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
    return { url, expiresAt: secondsFromNow(expiresInSeconds) };
  }
}

function attachmentDisposition(fileName: string): string {
  const asciiFallback = fileName.normalize('NFKD').replace(/[^\x20-\x7e]/g, '').replace(/["\\]/g, '');
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

function secondsFromNow(seconds: number): Date {
  return new Date(Date.now() + seconds * 1000);
}

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PHOTOGRAPHER', 'USER');

-- CreateEnum
CREATE TYPE "PhotoStatus" AS ENUM ('UPLOADING', 'PROCESSING', 'PUBLISHABLE', 'ERROR');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('PHOTO_PUBLISHED', 'PHOTO_PROCESSING_FAILED', 'NEW_COMMENT');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "bio" VARCHAR(500),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photos" (
    "id" UUID NOT NULL,
    "photographer_id" UUID NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "description" VARCHAR(2000),
    "event_name" VARCHAR(160),
    "taken_at" TIMESTAMPTZ(3),
    "price" DECIMAL(10,2) NOT NULL,
    "original_key" VARCHAR(255) NOT NULL,
    "watermarked_key" VARCHAR(255),
    "status" "PhotoStatus" NOT NULL DEFAULT 'UPLOADING',
    "mime_type" VARCHAR(50) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "processing_error" VARCHAR(500),
    "upload_expires_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "published_at" TIMESTAMPTZ(3),

    CONSTRAINT "photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" UUID NOT NULL,
    "photo_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "content" VARCHAR(1000) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "photo_id" UUID,
    "type" "NotificationType" NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "message" VARCHAR(500) NOT NULL,
    "read_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "photos_original_key_key" ON "photos"("original_key");

-- CreateIndex
CREATE UNIQUE INDEX "photos_watermarked_key_key" ON "photos"("watermarked_key");

-- CreateIndex
CREATE INDEX "photos_status_published_at_id_idx" ON "photos"("status", "published_at" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "photos_photographer_id_created_at_idx" ON "photos"("photographer_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "photos_status_upload_expires_at_idx" ON "photos"("status", "upload_expires_at");

-- CreateIndex
CREATE INDEX "comments_photo_id_created_at_id_idx" ON "comments"("photo_id", "created_at", "id");

-- CreateIndex
CREATE INDEX "comments_user_id_idx" ON "comments"("user_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_id_idx" ON "notifications"("user_id", "created_at" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_idx" ON "notifications"("user_id", "read_at");

-- CreateIndex
CREATE INDEX "notifications_photo_id_idx" ON "notifications"("photo_id");

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_photographer_id_fkey" FOREIGN KEY ("photographer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "photos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "photos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Integrity constraints not expressible in the Prisma schema
ALTER TABLE "photos" ADD CONSTRAINT "photos_price_non_negative" CHECK ("price" >= 0);
ALTER TABLE "photos" ADD CONSTRAINT "photos_file_size_positive" CHECK ("file_size" > 0);
ALTER TABLE "photos" ADD CONSTRAINT "photos_publishable_consistency"
  CHECK ("status" <> 'PUBLISHABLE' OR ("watermarked_key" IS NOT NULL AND "published_at" IS NOT NULL));
ALTER TABLE "comments" ADD CONSTRAINT "comments_content_not_blank" CHECK (length(btrim("content")) > 0);

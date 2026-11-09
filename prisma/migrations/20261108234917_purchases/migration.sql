-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'PHOTO_SOLD';

-- CreateTable
CREATE TABLE "purchases" (
    "id" UUID NOT NULL,
    "photo_id" UUID NOT NULL,
    "buyer_id" UUID NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "purchases_buyer_id_created_at_id_idx" ON "purchases"("buyer_id", "created_at" DESC, "id" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "purchases_photo_id_buyer_id_key" ON "purchases"("photo_id", "buyer_id");

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "photos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Integrity constraints not expressible in the Prisma schema
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_price_non_negative" CHECK ("price" >= 0);

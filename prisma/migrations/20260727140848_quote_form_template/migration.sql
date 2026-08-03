-- AlterTable
ALTER TABLE "QuoteRequest" ADD COLUMN "customFields" JSONB;

-- CreateTable
CREATE TABLE "QuoteFormField" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'TEXT',
    "placeholder" TEXT,
    "helpText" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "options" JSONB,
    "width" TEXT NOT NULL DEFAULT 'HALF',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "QuoteFormField_key_key" ON "QuoteFormField"("key");

-- CreateIndex
CREATE INDEX "QuoteFormField_isActive_order_idx" ON "QuoteFormField"("isActive", "order");

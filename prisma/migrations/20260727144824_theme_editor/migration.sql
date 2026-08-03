-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN "themeAccent" TEXT;
ALTER TABLE "SiteSettings" ADD COLUMN "themeBrand" TEXT;
ALTER TABLE "SiteSettings" ADD COLUMN "themeFont" TEXT;
ALTER TABLE "SiteSettings" ADD COLUMN "themePrimary" TEXT;
ALTER TABLE "SiteSettings" ADD COLUMN "themeRadius" TEXT;

-- CreateTable
CREATE TABLE "HomeSection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "eyebrow" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "HomeSection_key_key" ON "HomeSection"("key");

-- CreateIndex
CREATE INDEX "HomeSection_isActive_order_idx" ON "HomeSection"("isActive", "order");

-- علامة "يحتاج مراجعة" (للإدارة فقط) على المعدات والأسئلة الشائعة، لمحتوى
-- تهيئة يتضمّن مواصفات أو التزامات مبدئية. الأعمدة بقيمة افتراضية false.

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Equipment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "model" TEXT,
    "description" TEXT,
    "imageUrl" TEXT,
    "imageAlt" TEXT,
    "specs" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "needsReview" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Equipment" ("createdAt", "description", "id", "imageAlt", "imageUrl", "isActive", "model", "name", "order", "specs", "updatedAt") SELECT "createdAt", "description", "id", "imageAlt", "imageUrl", "isActive", "model", "name", "order", "specs", "updatedAt" FROM "Equipment";
DROP TABLE "Equipment";
ALTER TABLE "new_Equipment" RENAME TO "Equipment";
CREATE TABLE "new_Faq" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "category" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "needsReview" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Faq" ("answer", "category", "createdAt", "id", "isActive", "order", "question", "updatedAt") SELECT "answer", "category", "createdAt", "id", "isActive", "order", "question", "updatedAt" FROM "Faq";
DROP TABLE "Faq";
ALTER TABLE "new_Faq" RENAME TO "Faq";
CREATE INDEX "Faq_isActive_order_idx" ON "Faq"("isActive", "order");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;


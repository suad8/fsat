-- المحور 3: البيانات والنظام
-- فهارس الاستعلامات الشائعة، قيود فريدة (sku، شرائح الكميات، مفتاح idempotency)،
-- سجلّ التدقيق، تاريخ حالات الطلب، محاولات الدخول، العدّادات التسلسلية،
-- وعلامات "يحتاج مراجعة" للمحتوى المبدئي.
--
-- الأعمدة الجديدة كلها بقيم افتراضية فتبقى البيانات الحالية سليمة.
-- القسم الأخير (Backfill) يملأ التاريخ والعدّادات من البيانات الموجودة.

-- DropIndex
DROP INDEX "QuantityTier_productId_minQty_idx";

-- CreateTable
CREATE TABLE "OrderStatusEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'STATUS',
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "note" TEXT,
    "actorType" TEXT NOT NULL DEFAULT 'SYSTEM',
    "actorId" TEXT,
    "actorName" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderStatusEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorId" TEXT,
    "actorEmail" TEXT,
    "actorName" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "summary" TEXT NOT NULL,
    "changes" JSONB,
    "ip" TEXT
);

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "ip" TEXT,
    "success" BOOLEAN NOT NULL,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Sequence" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderNumber" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerEmail" TEXT,
    "companyName" TEXT,
    "fulfillment" TEXT NOT NULL DEFAULT 'DELIVERY',
    "city" TEXT,
    "district" TEXT,
    "addressLine" TEXT,
    "postalCode" TEXT,
    "paymentMethod" TEXT NOT NULL,
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "statusChangedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subtotal" REAL NOT NULL,
    "discountAmount" REAL NOT NULL DEFAULT 0,
    "couponCode" TEXT,
    "shippingCost" REAL NOT NULL DEFAULT 0,
    "vatAmount" REAL NOT NULL DEFAULT 0,
    "total" REAL NOT NULL,
    "notes" TEXT,
    "adminNotes" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("addressLine", "adminNotes", "city", "companyName", "couponCode", "createdAt", "customerEmail", "customerId", "customerName", "customerPhone", "discountAmount", "district", "fulfillment", "id", "notes", "orderNumber", "paymentMethod", "paymentStatus", "postalCode", "shippingCost", "status", "subtotal", "total", "updatedAt", "vatAmount") SELECT "addressLine", "adminNotes", "city", "companyName", "couponCode", "createdAt", "customerEmail", "customerId", "customerName", "customerPhone", "discountAmount", "district", "fulfillment", "id", "notes", "orderNumber", "paymentMethod", "paymentStatus", "postalCode", "shippingCost", "status", "subtotal", "total", "updatedAt", "vatAmount" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");
CREATE UNIQUE INDEX "Order_idempotencyKey_key" ON "Order"("idempotencyKey");
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");
CREATE INDEX "Order_paymentStatus_createdAt_idx" ON "Order"("paymentStatus", "createdAt");
CREATE INDEX "Order_customerPhone_createdAt_idx" ON "Order"("customerPhone", "createdAt");
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");
CREATE TABLE "new_Page" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "needsReview" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Page" ("content", "createdAt", "id", "isActive", "seoDescription", "seoTitle", "slug", "title", "updatedAt") SELECT "content", "createdAt", "id", "isActive", "seoDescription", "seoTitle", "slug", "title", "updatedAt" FROM "Page";
DROP TABLE "Page";
ALTER TABLE "new_Page" RENAME TO "Page";
CREATE UNIQUE INDEX "Page_slug_key" ON "Page"("slug");
CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortDescription" TEXT,
    "description" TEXT,
    "categoryId" TEXT NOT NULL,
    "priceMode" TEXT NOT NULL DEFAULT 'FIXED',
    "basePrice" REAL NOT NULL DEFAULT 0,
    "compareAtPrice" REAL,
    "unit" TEXT NOT NULL DEFAULT 'قطعة',
    "minQuantity" INTEGER NOT NULL DEFAULT 1,
    "quantityStep" INTEGER NOT NULL DEFAULT 1,
    "sku" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "needsReview" BOOLEAN NOT NULL DEFAULT false,
    "leadTime" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Product" ("basePrice", "categoryId", "compareAtPrice", "createdAt", "description", "id", "isActive", "isFeatured", "leadTime", "minQuantity", "name", "order", "priceMode", "quantityStep", "seoDescription", "seoTitle", "shortDescription", "sku", "slug", "unit", "updatedAt") SELECT "basePrice", "categoryId", "compareAtPrice", "createdAt", "description", "id", "isActive", "isFeatured", "leadTime", "minQuantity", "name", "order", "priceMode", "quantityStep", "seoDescription", "seoTitle", "shortDescription", "sku", "slug", "unit", "updatedAt" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");
CREATE INDEX "Product_categoryId_isActive_idx" ON "Product"("categoryId", "isActive");
CREATE INDEX "Product_isFeatured_isActive_idx" ON "Product"("isFeatured", "isActive");
CREATE INDEX "Product_isActive_order_idx" ON "Product"("isActive", "order");
CREATE INDEX "Product_isActive_createdAt_idx" ON "Product"("isActive", "createdAt");
CREATE TABLE "new_ShippingZone" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "cities" JSONB NOT NULL,
    "cost" REAL NOT NULL,
    "freeOverAmount" REAL,
    "estimatedDays" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "needsReview" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ShippingZone" ("cities", "cost", "createdAt", "estimatedDays", "freeOverAmount", "id", "isActive", "name", "order", "updatedAt") SELECT "cities", "cost", "createdAt", "estimatedDays", "freeOverAmount", "id", "isActive", "name", "order", "updatedAt" FROM "ShippingZone";
DROP TABLE "ShippingZone";
ALTER TABLE "new_ShippingZone" RENAME TO "ShippingZone";
CREATE INDEX "ShippingZone_isActive_order_idx" ON "ShippingZone"("isActive", "order");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "OrderStatusEvent_orderId_createdAt_idx" ON "OrderStatusEvent"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_createdAt_idx" ON "AuditLog"("entity", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "LoginAttempt_email_createdAt_idx" ON "LoginAttempt"("email", "createdAt");

-- CreateIndex
CREATE INDEX "LoginAttempt_ip_createdAt_idx" ON "LoginAttempt"("ip", "createdAt");

-- CreateIndex
CREATE INDEX "LoginAttempt_createdAt_idx" ON "LoginAttempt"("createdAt");

-- CreateIndex
CREATE INDEX "Coupon_isActive_expiresAt_idx" ON "Coupon"("isActive", "expiresAt");

-- CreateIndex
CREATE INDEX "Customer_email_idx" ON "Customer"("email");

-- CreateIndex
CREATE INDEX "Customer_createdAt_idx" ON "Customer"("createdAt");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "QuantityTier_productId_minQty_key" ON "QuantityTier"("productId", "minQty");

-- CreateIndex
CREATE INDEX "QuoteRequest_phone_idx" ON "QuoteRequest"("phone");

-- CreateIndex
CREATE INDEX "QuoteRequest_createdAt_idx" ON "QuoteRequest"("createdAt");


-- ===========================================================================
-- Backfill
-- ===========================================================================

-- حدث "استلام الطلب" لكل طلب سابق ليظهر له خط زمني، وحدث للحالة الحالية إن
-- اختلفت عن NEW (تاريخ التغيير الفعلي غير معروف فنستعمل آخر تحديث).
INSERT INTO "OrderStatusEvent" ("id", "orderId", "kind", "fromStatus", "toStatus", "note", "actorType", "isPublic", "createdAt")
SELECT 'bf-c-' || "id", "id", 'STATUS', NULL, 'NEW', 'تم استلام الطلب', 'SYSTEM', 1, "createdAt"
FROM "Order";

INSERT INTO "OrderStatusEvent" ("id", "orderId", "kind", "fromStatus", "toStatus", "note", "actorType", "isPublic", "createdAt")
SELECT 'bf-s-' || "id", "id", 'STATUS', 'NEW', "status", NULL, 'SYSTEM', 1, "updatedAt"
FROM "Order" WHERE "status" <> 'NEW';

UPDATE "Order" SET "statusChangedAt" = "updatedAt" WHERE "status" <> 'NEW';

-- عدّادات الأرقام التسلسلية تبدأ من أعلى رقم موجود لكل سنة
INSERT INTO "Sequence" ("key", "value", "updatedAt")
SELECT 'ORD-' || substr("orderNumber", 5, 4), MAX(CAST(substr("orderNumber", 10) AS INTEGER)), CURRENT_TIMESTAMP
FROM "Order"
WHERE "orderNumber" GLOB 'ORD-[0-9][0-9][0-9][0-9]-[0-9]*'
GROUP BY substr("orderNumber", 5, 4);

INSERT INTO "Sequence" ("key", "value", "updatedAt")
SELECT 'QT-' || substr("reference", 4, 4), MAX(CAST(substr("reference", 9) AS INTEGER)), CURRENT_TIMESTAMP
FROM "QuoteRequest"
WHERE "reference" GLOB 'QT-[0-9][0-9][0-9][0-9]-[0-9]*'
GROUP BY substr("reference", 4, 4);

-- الصفحات التي تحمل علامة الاستبدال تُوسَم "تحتاج مراجعة" (إشارة للإدارة فقط)
UPDATE "Page" SET "needsReview" = 1 WHERE "content" LIKE '%[[يحتاج استبدال]]%';

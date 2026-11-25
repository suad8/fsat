import { reserveReference } from "@/lib/data/sequence";
import { prisma, type DbClient } from "@/lib/prisma";

/**
 * توليد الأرقام المرجعية للطلبات وعروض الأسعار.
 *
 * الصيغة: البادئة + السنة + تسلسل من ٤ خانات — مثال: ORD-2026-0043
 * أرقام مقروءة ينطقها العميل على الهاتف بسهولة، وتكشف سنة الطلب مباشرة.
 *
 * التسلسل يأتي من عدّاد ذرّي في القاعدة (src/lib/data/sequence.ts) لا من
 * count() + 1، فلا يتولّد الرقم نفسه لطلبين متزامنين.
 *
 * تمرير `db` (عميل المعاملة) يجعل حجز الرقم جزءًا من معاملة إنشاء الطلب:
 * إن فشل الحفظ يتراجع الحجز ولا تبقى فجوة في الأرقام.
 */

export async function generateOrderNumber(db: DbClient = prisma): Promise<string> {
  return reserveReference(db, "ORD");
}

export async function generateQuoteReference(db: DbClient = prisma): Promise<string> {
  return reserveReference(db, "QT");
}

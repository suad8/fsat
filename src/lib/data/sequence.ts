import { Prisma } from "@/generated/prisma/client";
import { prisma, type DbClient } from "@/lib/prisma";

/**
 * عدّادات تسلسلية آمنة من التزامن.
 *
 * المشكلة في الطريقة القديمة (count + 1 ثم فحص): طلبان في اللحظة نفسها يقرآن
 * العدد نفسه فيولّدان الرقم نفسه ويفشل أحدهما، أو يسقط كلاهما إلى رقم احتياطي.
 *
 * الحل: صف في جدول Sequence لكل (بادئة + سنة) يُزاد بتحديث ذرّي واحد
 * `value = value + 1` — قاعدة البيانات تُسلسل التحديثات المتزامنة وكل مستدعٍ
 * يستلم قيمة فريدة. الأرقام الناتجة متصلة بلا فجوات إن أُجري الطلب داخل
 * معاملة وتراجعت (rollback) — فالفشل بعد الحجز يُرجع العدّاد أيضًا.
 */

type SequenceSeed = () => Promise<number>;

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

/**
 * يحجز القيمة التالية للمفتاح.
 *
 * @param seed  تُستدعى مرة واحدة فقط عند إنشاء العدّاد لأول مرة، وتعيد أعلى
 *              رقم مستعمل فعلاً (لقواعد بيانات فيها طلبات سابقة للجدول).
 */
export async function nextSequenceValue(
  db: DbClient,
  key: string,
  seed?: SequenceSeed,
): Promise<number> {
  // ١. المسار الشائع: العدّاد موجود — زيادة ذرّية.
  const bumped = await tryIncrement(db, key);
  if (bumped !== null) return bumped;

  // ٢. أول استعمال: ننشئ العدّاد من أعلى رقم موجود. إن سبقنا طلب آخر إلى
  //    الإنشاء (P2002) فنعود للزيادة الذرّية.
  const start = (seed ? await seed() : 0) + 1;

  try {
    await db.sequence.create({ data: { key, value: start } });
    return start;
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    const retried = await tryIncrement(db, key);
    if (retried === null) throw error;
    return retried;
  }
}

async function tryIncrement(db: DbClient, key: string): Promise<number | null> {
  try {
    const row = await db.sequence.update({
      where: { key },
      data: { value: { increment: 1 } },
      select: { value: true },
    });
    return row.value;
  } catch (error) {
    // P2025 = السجل غير موجود
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return null;
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// الأرقام المرجعية
// ---------------------------------------------------------------------------

/** السنة بتوقيت الرياض — لا تنقلب أرقام الطلبات عند منتصف ليل UTC. */
export function referenceYear(now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
  }).formatToParts(now);
  return Number(parts.find((part) => part.type === "year")?.value ?? now.getUTCFullYear());
}

export function formatReference(prefix: string, year: number, value: number): string {
  return `${prefix}-${year}-${String(value).padStart(4, "0")}`;
}

/** أعلى تسلسل مستعمل في جدول لسنة معيّنة — بذرة العدّاد الجديد. */
export async function highestReferenceSequence(
  prefix: string,
  year: number,
  db: DbClient = prisma,
): Promise<number> {
  const pattern = `${prefix}-${year}-`;

  const latest =
    prefix === "ORD"
      ? await db.order.findFirst({
          where: { orderNumber: { startsWith: pattern } },
          orderBy: { orderNumber: "desc" },
          select: { orderNumber: true },
        })
      : await db.quoteRequest.findFirst({
          where: { reference: { startsWith: pattern } },
          orderBy: { reference: "desc" },
          select: { reference: true },
        });

  const text = latest ? ("orderNumber" in latest ? latest.orderNumber : latest.reference) : "";
  const parsed = Number.parseInt(text.slice(pattern.length), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * يحجز الرقم المرجعي التالي. داخل معاملة: يُلغى الحجز إن فشلت المعاملة.
 * خارجها: قد تبقى فجوة في الأرقام عند فشل لاحق — مقبول، فالتفرّد هو الأهم.
 */
export async function reserveReference(
  db: DbClient,
  prefix: "ORD" | "QT",
  now: Date = new Date(),
): Promise<string> {
  const year = referenceYear(now);
  const key = `${prefix}-${year}`;

  const value = await nextSequenceValue(db, key, () =>
    highestReferenceSequence(prefix, year, db),
  );

  return formatReference(prefix, year, value);
}

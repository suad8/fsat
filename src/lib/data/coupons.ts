import { computeDiscount } from "@/lib/data/totals";
import { toMinor } from "@/lib/data/money";
import { prisma, type DbClient } from "@/lib/prisma";

/**
 * التحقق من الكوبونات واستهلاكها.
 *
 * الفصل بين التقييم (evaluateCoupon — خالص، يختبره الجميع) والاستهلاك
 * (redeemCoupon — يكتب في القاعدة بشكل ذرّي) مقصود: التقييم يُستدعى عند عرض
 * الخصم للعميل، والاستهلاك داخل معاملة إنشاء الطلب فقط.
 */

export type CouponErrorCode =
  | "NOT_FOUND"
  | "NOT_STARTED"
  | "EXPIRED"
  | "EXHAUSTED"
  | "MIN_ORDER"
  | "INVALID_CONFIG"
  | "BUSY";

export type CouponRecord = {
  id: string;
  code: string;
  type: string;
  value: number;
  minOrderAmount: number | null;
  maxUses: number | null;
  usedCount: number;
  startsAt: Date | null;
  expiresAt: Date | null;
  isActive: boolean;
};

export type CouponCheck =
  | { ok: true; couponId: string; code: string; discount: number }
  | { ok: false; code: CouponErrorCode; error: string };

/** توحيد ما يكتبه العميل: بلا مسافات وبحروف كبيرة، مطابقًا لما تحفظه الإدارة. */
export function normalizeCouponCode(raw: string): string {
  return raw.replace(/\s+/g, "").toUpperCase();
}

/** تقييم كوبون مقابل قيمة الطلب — بلا أي وصول لقاعدة البيانات. */
export function evaluateCoupon(
  coupon: CouponRecord | null,
  subtotal: number,
  now: Date = new Date(),
): CouponCheck {
  // الكوبون المعطّل يُعامل كغير موجود حتى لا نكشف أن الرمز كان صالحًا يومًا
  if (!coupon || !coupon.isActive) {
    return { ok: false, code: "NOT_FOUND", error: "رمز الخصم غير صحيح." };
  }

  if (coupon.type !== "PERCENT" && coupon.type !== "FIXED") {
    return { ok: false, code: "INVALID_CONFIG", error: "رمز الخصم غير صالح حاليًا." };
  }
  if (!Number.isFinite(coupon.value) || coupon.value <= 0) {
    return { ok: false, code: "INVALID_CONFIG", error: "رمز الخصم غير صالح حاليًا." };
  }
  if (coupon.type === "PERCENT" && coupon.value > 100) {
    return { ok: false, code: "INVALID_CONFIG", error: "رمز الخصم غير صالح حاليًا." };
  }

  if (coupon.startsAt && coupon.startsAt > now) {
    return { ok: false, code: "NOT_STARTED", error: "رمز الخصم لم يبدأ سريانه بعد." };
  }
  if (coupon.expiresAt && coupon.expiresAt < now) {
    return { ok: false, code: "EXPIRED", error: "انتهت صلاحية رمز الخصم." };
  }
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    return { ok: false, code: "EXHAUSTED", error: "تم استنفاد عدد مرات استخدام هذا الرمز." };
  }
  if (coupon.minOrderAmount !== null && toMinor(subtotal) < toMinor(coupon.minOrderAmount)) {
    return {
      ok: false,
      code: "MIN_ORDER",
      error: `الحد الأدنى لاستخدام هذا الرمز ${coupon.minOrderAmount} ريال.`,
    };
  }

  const discount = computeDiscount(
    { type: coupon.type, value: coupon.value },
    subtotal,
  );

  return { ok: true, couponId: coupon.id, code: coupon.code, discount };
}

/** البحث عن كوبون بالرمز ثم تقييمه. للعرض والمعاينة — لا يستهلك شيئًا. */
export async function validateCoupon(
  rawCode: string,
  subtotal: number,
  db: DbClient = prisma,
  now: Date = new Date(),
): Promise<CouponCheck> {
  const code = normalizeCouponCode(rawCode);
  const coupon = code ? await db.coupon.findUnique({ where: { code } }) : null;
  return evaluateCoupon(coupon, subtotal, now);
}

/**
 * استهلاك استخدام واحد من الكوبون — ذرّي.
 *
 * "اقرأ ثم زد" يسمح لطلبين متزامنين بتجاوز maxUses. هنا الزيادة مشروطة بأن
 * usedCount ما زال القيمة التي قرأناها (compare-and-set): إن غيّره طلب آخر
 * بيننا يعود count = 0 فنعيد القراءة والتقييم. يصلح في SQLite وPostgreSQL.
 */
export async function redeemCoupon(
  db: DbClient,
  couponId: string,
  subtotal: number,
  now: Date = new Date(),
): Promise<CouponCheck> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const coupon = await db.coupon.findUnique({ where: { id: couponId } });
    const check = evaluateCoupon(coupon, subtotal, now);
    if (!check.ok || !coupon) return check;

    const updated = await db.coupon.updateMany({
      where: { id: couponId, usedCount: coupon.usedCount },
      data: { usedCount: { increment: 1 } },
    });

    if (updated.count === 1) return check;
  }

  return {
    ok: false,
    code: "BUSY",
    error: "تعذّر تطبيق رمز الخصم الآن بسبب ازدحام الطلبات. أعد المحاولة.",
  };
}

/** إرجاع استخدام عند إلغاء الطلب (لا ينزل العدّاد تحت الصفر). */
export async function releaseCoupon(db: DbClient, code: string | null): Promise<void> {
  if (!code) return;
  await db.coupon.updateMany({
    where: { code, usedCount: { gt: 0 } },
    data: { usedCount: { decrement: 1 } },
  });
}

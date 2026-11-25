/**
 * ============================================================================
 *  المال بالهللات
 * ============================================================================
 *  وحدة خالصة (pure) تعمل في المتصفّح والخادم معًا.
 *
 *  القاعدة: كل حساب مالي يجري بأعداد صحيحة بالهللات (١ ريال = ١٠٠ هللة) ثم
 *  يُحوَّل لريالات عند الكتابة أو العرض. هكذا لا تتراكم أخطاء الفاصلة العائمة
 *  (0.1 + 0.2 !== 0.3) ولا يختلف مجموع البنود عن إجمالي الطلب بهللة.
 *
 *  لماذا تبقى أعمدة القاعدة Float لا Int؟ كل الواجهات (السلة، النماذج، العرض)
 *  تتعامل مع الريالات كأعداد عشرية، وتحويل الأعمدة إلى هللات يكسرها جميعًا.
 *  بدلاً من ذلك نضمن أن كل قيمة تُكتب هي مضاعف دقيق للهللة (roundMoney)،
 *  ويتحقق scripts/check-integrity.ts من ذلك. مسار التحويل إلى Int موثّق في
 *  docs/DATA.md.
 * ============================================================================
 */

/** عدد الهللات في الريال. */
export const MINOR_PER_UNIT = 100;

/** أكبر مبلغ مقبول (بالريال) — حماية من تجاوز الأعداد الصحيحة الآمنة. */
export const MAX_MONEY = 100_000_000;

/** تقريب نصف للأعلى بعيدًا عن الصفر (٢٫٥ ← ٣ و -٢٫٥ ← -٣). */
function roundHalfAwayFromZero(value: number): number {
  const rounded = Math.round(Math.abs(value));
  return value < 0 ? -rounded : rounded;
}

/**
 * ريالات ← هللات (عدد صحيح).
 *
 * `toPrecision(12)` يزيل ضجيج الفاصلة العائمة قبل التقريب:
 * 1.005 * 100 = 100.49999999999999 لكنه يُقرأ 100.5 فيُقرَّب إلى 101.
 */
export function toMinor(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return roundHalfAwayFromZero(Number((amount * MINOR_PER_UNIT).toPrecision(12)));
}

/** هللات ← ريالات. */
export function fromMinor(minor: number): number {
  return minor / MINOR_PER_UNIT;
}

/** تقريب مبلغ بالريال إلى أقرب هللة. */
export function roundMoney(amount: number): number {
  return fromMinor(toMinor(amount));
}

/** هل القيمة مضاعف دقيق للهللة؟ (للتحقق من سلامة ما هو مخزَّن). */
export function isExactMoney(amount: number): boolean {
  if (!Number.isFinite(amount)) return false;
  return Math.abs(amount * MINOR_PER_UNIT - Math.round(amount * MINOR_PER_UNIT)) < 1e-6;
}

/**
 * ضرب مبلغ بالهللات في معامل عشري مع تقريب نصف للأعلى.
 * المعامل يُحوَّل لعدد صحيح بدقة ست منازل حتى لا يتسرّب خطأ الفاصلة العائمة.
 */
export function multiplyMinor(minor: number, factor: number): number {
  const scaled = Math.round(factor * 1_000_000);
  return roundHalfAwayFromZero((minor * scaled) / 1_000_000);
}

/** نسبة مئوية من مبلغ بالهللات: percentOfMinor(1000, 15) = 150. */
export function percentOfMinor(minor: number, percent: number): number {
  return roundHalfAwayFromZero((minor * Math.round(percent * 10_000)) / 1_000_000);
}

/** مجموع قائمة مبالغ بالريال بدقة الهللة. */
export function sumMoney(amounts: readonly number[]): number {
  return fromMinor(amounts.reduce((total, amount) => total + toMinor(amount), 0));
}

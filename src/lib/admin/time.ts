/**
 * أدوات الوقت للوحة التحكم.
 *
 * حدود «اليوم» و«الأسبوع» و«الشهر» تُحسب بتوقيت الرياض (UTC+3 بلا توقيت
 * صيفي) لا بتوقيت الخادم — وإلا انزاح إيراد «اليوم» ساعات عن يوم المطبعة
 * الفعلي عندما يعمل الخادم بتوقيت UTC. أسبوع العمل يبدأ السبت.
 */

const RIYADH_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** بداية يوم الرياض (00:00) الذي يقع فيه التاريخ، كلحظة UTC. */
export function startOfRiyadhDay(date: Date): Date {
  const shifted = date.getTime() + RIYADH_OFFSET_MS;
  const dayStart = Math.floor(shifted / DAY_MS) * DAY_MS;
  return new Date(dayStart - RIYADH_OFFSET_MS);
}

/** بداية أسبوع العمل (السبت) بتوقيت الرياض. */
export function startOfRiyadhWeek(date: Date): Date {
  const dayStart = startOfRiyadhDay(date);
  // getUTCDay على الإزاحة: 0 أحد … 6 سبت
  const weekday = new Date(dayStart.getTime() + RIYADH_OFFSET_MS).getUTCDay();
  const sinceSaturday = (weekday + 1) % 7;
  return new Date(dayStart.getTime() - sinceSaturday * DAY_MS);
}

/** بداية الشهر الميلادي بتوقيت الرياض. */
export function startOfRiyadhMonth(date: Date): Date {
  const shifted = new Date(date.getTime() + RIYADH_OFFSET_MS);
  const start = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), 1);
  return new Date(start - RIYADH_OFFSET_MS);
}

/** مفتاح اليوم YYYY-MM-DD بتوقيت الرياض — لتجميع الرسم البياني. */
export function riyadhDayKey(date: Date): string {
  return new Date(date.getTime() + RIYADH_OFFSET_MS).toISOString().slice(0, 10);
}

export { DAY_MS };

/** عمر مختصر بالعربية: «منذ ٣ ساعات». للأرقام اللاتينية نفس سياسة المشروع. */
export function formatAge(from: Date | string, now: Date = new Date()): string {
  const then = typeof from === "string" ? new Date(from) : from;
  const diff = Math.max(0, now.getTime() - then.getTime());

  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "الآن";
  if (minutes < 60) return minutes === 1 ? "منذ دقيقة" : minutes === 2 ? "منذ دقيقتين" : `منذ ${minutes} دقيقة`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? "منذ ساعة" : hours === 2 ? "منذ ساعتين" : `منذ ${hours} ساعة`;

  const days = Math.floor(hours / 24);
  if (days < 30) return days === 1 ? "منذ يوم" : days === 2 ? "منذ يومين" : `منذ ${days} يومًا`;

  const months = Math.floor(days / 30);
  return months === 1 ? "منذ شهر" : months === 2 ? "منذ شهرين" : `منذ ${months} أشهر`;
}

/** عمر بالساعات — لفرز الأولوية ولتحديد لون الشارة. */
export function ageHours(from: Date | string, now: Date = new Date()): number {
  const then = typeof from === "string" ? new Date(from) : from;
  return Math.max(0, (now.getTime() - then.getTime()) / 3_600_000);
}

/**
 * درجة إلحاح عرض سعر/طلب لم يُردّ عليه: ok < 4 ساعات، warn حتى 24، late بعدها.
 * العميل الذي ينتظر ردًا يقارن مع مطابع أخرى في الدقائق، فالحد الأول قصير.
 */
export function urgencyForAge(hours: number): "ok" | "warn" | "late" {
  if (hours < 4) return "ok";
  if (hours < 24) return "warn";
  return "late";
}

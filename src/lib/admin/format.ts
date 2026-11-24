/**
 * تنسيق التواريخ للوحة التحكم.
 *
 * تاريخ ميلادي صريح وبتوقيت الرياض: `formatDateTime` العام يعتمد توقيت الخادم
 * (UTC غالبًا في الاستضافة) فيظهر وقت الطلب متأخرًا ثلاث ساعات عمّا رآه
 * صاحب المطبعة على جواله.
 */

const LOCALE = "ar-SA-u-ca-gregory-nu-latn";
const ZONE = "Asia/Riyadh";

const dateTime = new Intl.DateTimeFormat(LOCALE, {
  timeZone: ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const dateOnly = new Intl.DateTimeFormat(LOCALE, {
  timeZone: ZONE,
  day: "numeric",
  month: "long",
  year: "numeric",
});

const shortDate = new Intl.DateTimeFormat(LOCALE, {
  timeZone: ZONE,
  day: "numeric",
  month: "short",
});

const longDay = new Intl.DateTimeFormat(LOCALE, {
  timeZone: ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
});

const toDate = (value: Date | string) => (typeof value === "string" ? new Date(value) : value);

export const adminDateTime = (value: Date | string) => dateTime.format(toDate(value));
export const adminDate = (value: Date | string) => dateOnly.format(toDate(value));
export const adminShortDate = (value: Date | string) => shortDate.format(toDate(value));
export const adminLongDay = (value: Date | string) => longDay.format(toDate(value));

/** رقم جوال سعودي مخزَّن (9665XXXXXXXX) بصيغة مقروءة 05X XXX XXXX. */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const local = digits.startsWith("966") ? `0${digits.slice(3)}` : digits;
  if (/^05\d{8}$/.test(local)) return `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
  return phone;
}

/** رابط واتساب مباشر لرقم (يقبل 05… أو 966…) مع رسالة جاهزة اختيارية. */
export function waLink(phone: string, message?: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = `966${digits.slice(1)}`;
  else if (digits.length === 9 && digits.startsWith("5")) digits = `966${digits}`;

  return message
    ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
    : `https://wa.me/${digits}`;
}

/** رابط اتصال tel: صحيح لرقم مخزَّن بالصيغة الدولية. */
export function telLink(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `tel:+${digits}`;
}

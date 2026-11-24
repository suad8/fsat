import { contact } from "@/config/brand";
import type { Settings } from "@/lib/settings";

/**
 * يكشف بيانات التواصل المؤقتة (أرقام وبريد هيكلي) كي لا تُعرض للعميل كأنها حقيقية.
 *
 * getSettings() يزيل وسم «يحتاج استبدال» من القيم قبل تسليمها، فلا نستطيع
 * الاعتماد على الوسم. نقارن بدلاً من ذلك بقيم الهيكل الافتراضية في
 * config/brand.ts: ما دام الرقم/البريد مطابقًا للافتراضي والإعدادات تقول إنه
 * يحتاج استبدالاً، فهو مؤقت. بمجرد أن تُدخل الإدارة بيانات حقيقية يظهر كل شيء.
 */
export function getContactState(settings: Settings) {
  const digits = (value: string) => value.replace(/\D/g, "");

  const phoneIsPlaceholder =
    contact.needsReplacement && digits(settings.phone) === digits(contact.phone);
  const whatsappIsPlaceholder =
    contact.needsReplacement && digits(settings.whatsapp) === digits(contact.whatsapp);
  const emailIsPlaceholder =
    contact.needsReplacement &&
    (settings.email === contact.email || /@example\.(com|org|net)$/i.test(settings.email));

  /** العنوان الاحتياطي («المملكة العربية السعودية») ليس عنوانًا حقيقيًا. */
  const hasStreetAddress =
    settings.addressLine.trim().length > 0 &&
    settings.addressLine !== contact.addressLine &&
    settings.addressLine !== settings.city;

  return {
    phoneIsPlaceholder,
    whatsappIsPlaceholder,
    emailIsPlaceholder,
    hasStreetAddress,
    showPhone: !phoneIsPlaceholder,
    showEmail: !emailIsPlaceholder && settings.email.length > 0,
    showWhatsappNumber: !whatsappIsPlaceholder,
    mapUrl: settings.mapUrl.trim(),
  };
}

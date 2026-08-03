/**
 * أنواع قالب نموذج عرض السعر — آمنة للاستيراد في مكوّنات العميل.
 *
 * منفصلة عن src/lib/quote-form.ts عمدًا: ذلك الملف يستورد Prisma، واستيراده
 * من مكوّن عميل يسحب مشغّل قاعدة البيانات كاملاً إلى حزمة المتصفّح ويكسر
 * البناء. هذا الملف لا يحتوي إلا أنواعًا وثوابت.
 */

export type QuoteFieldType =
  | "TEXT"
  | "TEXTAREA"
  | "NUMBER"
  | "EMAIL"
  | "PHONE"
  | "DATE"
  | "SELECT"
  | "RADIO"
  | "CHECKBOX";

export type QuoteField = {
  id: string;
  key: string;
  label: string;
  type: QuoteFieldType;
  placeholder: string | null;
  helpText: string | null;
  isRequired: boolean;
  isSystem: boolean;
  width: "HALF" | "FULL";
  options: string[];
};

/** أنواع الحقول التي تحتاج قائمة خيارات معرّفة. */
export const CHOICE_FIELD_TYPES: readonly QuoteFieldType[] = [
  "SELECT",
  "RADIO",
  "CHECKBOX",
];

/** إجابة حقل واحد كما تُرسل وتُخزَّن. */
export type QuoteAnswer = {
  key: string;
  /** التسمية وقت الإرسال — تُحفظ حتى تبقى الطلبات القديمة مقروءة بعد أي تعديل. */
  label: string;
  value: string;
};

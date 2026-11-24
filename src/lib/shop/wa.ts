import { contact } from "@/config/brand";
import { formatNumber, formatPrice } from "@/lib/utils";

/**
 * رسائل واتساب لرحلة الشراء (السلة، الطلب، التتبّع).
 *
 * ملاحظة: الرقم يأتي من config/brand كبقية روابط الموقع (src/lib/whatsapp.ts).
 * توحيده مع «بيانات المنشأة» في لوحة التحكم يحتاج تعديل ذلك الملف.
 */

function build(message: string): string {
  const number = contact.whatsapp.replace(/\D/g, "");
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

type CartLine = {
  name: string;
  quantity: number;
  unit: string;
  total: number;
  options: { label: string; valueLabel: string }[];
};

/** يرسل محتوى السلة كاملًا — بديل لمن يفضّل إنهاء الطلب بمحادثة. */
export function whatsappCartUrl(lines: CartLine[], total: number): string {
  const out = ["السلام عليكم،", "أرغب في إتمام الطلب التالي:", ""];

  lines.forEach((line, index) => {
    out.push(`${index + 1}. ${line.name} — ${formatNumber(line.quantity)} ${line.unit}`);
    for (const option of line.options) out.push(`   • ${option.label}: ${option.valueLabel}`);
    out.push(`   السعر: ${formatPrice(line.total)} ر.س`);
  });

  out.push("", `الإجمالي التقديري: ${formatPrice(total)} ر.س`);
  return build(out.join("\n"));
}

/** سؤال/متابعة عن طلب برقمه. */
export function whatsappOrderUrl(
  orderNumber: string,
  kind: "confirm" | "receipt" | "follow" = "follow",
): string {
  const lines: Record<typeof kind, string> = {
    confirm: `السلام عليكم، أرسلت الطلب رقم ${orderNumber} وأرغب في تأكيده.`,
    receipt: `السلام عليكم، هذا إيصال تحويل الطلب رقم ${orderNumber}.`,
    follow: `السلام عليكم، أرغب في متابعة الطلب رقم ${orderNumber}.`,
  };
  return build(lines[kind]);
}

/** مساعدة عامة من صفحة الدفع. */
export function whatsappHelpUrl(context: string): string {
  return build(`السلام عليكم، أحتاج مساعدة في ${context}.`);
}

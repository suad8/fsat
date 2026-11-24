import { contact } from "@/config/brand";

/**
 * رابط واتساب برسالة مخصّصة — يستعمل نفس رقم src/lib/whatsapp.ts (config/brand)
 * حتى لا يختلف رقم الصفحات التعريفية عن بقية الموقع. آمن للمكوّنات العميلة.
 */
export function whatsappMessageUrl(lines: string[]): string {
  const number = contact.whatsapp.replace(/\D/g, "");
  return `https://wa.me/${number}?text=${encodeURIComponent(lines.join("\n"))}`;
}

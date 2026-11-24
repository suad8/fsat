import { Icon, type IconName } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

/**
 * شارات الثقة — عبارات حقيقية فقط (لا أرقام ولا ادعاءات مختلقة):
 * فاتورة ضريبية، مراجعة فنية للتصميم، ومتابعة الطلب على واتساب.
 */

export const TRUST_POINTS: { icon: IconName; title: string; text: string }[] = [
  { icon: "check", title: "مراجعة فنية للتصميم", text: "نفحص الملف قبل الطباعة" },
  { icon: "shield", title: "فاتورة ضريبية", text: "نظامية مع كل طلب" },
  { icon: "headset", title: "متابعة حتى التسليم", text: "تحديثات الحالة على واتساب" },
];

export function TrustStrip({
  className,
  tone = "light",
}: {
  className?: string;
  tone?: "light" | "dark";
}) {
  const dark = tone === "dark";
  return (
    <ul className={cn("grid gap-3 sm:grid-cols-3", className)}>
      {TRUST_POINTS.map((item) => (
        <li
          key={item.title}
          className={cn(
            "flex items-center gap-3 rounded-2xl border p-3.5",
            dark ? "border-white/10 bg-white/[0.04]" : "border-border bg-surface",
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              "grid size-10 shrink-0 place-items-center rounded-xl",
              dark ? "bg-accent-500 text-accent-contrast" : "bg-ink text-accent-400",
            )}
          >
            <Icon name={item.icon} className="size-[1.1rem]" strokeWidth={1.7} />
          </span>
          <span className="min-w-0 text-xs leading-relaxed">
            <b className={cn("block text-sm", dark ? "text-white" : "text-primary-950")}>
              {item.title}
            </b>
            <span className={dark ? "text-primary-300" : "text-primary-600"}>{item.text}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

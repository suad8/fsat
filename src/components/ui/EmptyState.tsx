import type { ReactNode } from "react";

import { Icon, type IconName } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

/**
 * حالة فارغة مصمَّمة.
 *
 * تظهر عند غياب المنتجات أو الأعمال أو نتائج البحث. الهدف ألا يرى الزائر
 * صفحة فارغة بلا تفسير، وأن يجد دائمًا خطوة تالية واضحة.
 */
export function EmptyState({
  icon = "package",
  title,
  description,
  action,
  className,
  compact = false,
}: {
  icon?: IconName;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "border-border bg-surface-muted flex flex-col items-center justify-center rounded-xl border border-dashed text-center",
        compact ? "px-6 py-10" : "px-6 py-16 md:py-20",
        className,
      )}
    >
      <span className="bg-surface ring-border mb-5 grid size-14 place-items-center rounded-full shadow-sm ring-1">
        <Icon name={icon} className="text-primary-400 size-7" strokeWidth={1.4} />
      </span>

      <h3 className="text-lg font-bold md:text-xl">{title}</h3>

      {description ? (
        <p className="text-primary-600 mt-2.5 max-w-md text-sm leading-relaxed">
          {description}
        </p>
      ) : null}

      {action ? <div className="mt-6 flex flex-wrap justify-center gap-3">{action}</div> : null}
    </div>
  );
}

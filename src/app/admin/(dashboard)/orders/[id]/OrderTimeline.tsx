import { AdminIcon } from "@/components/admin/AdminIcon";
import { adminDateTime } from "@/lib/admin/format";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * خط زمني لمراحل الطلب.
 *
 * المخطط الحالي لا يحفظ سجل تواريخ الحالات، فنعرض ما هو معروف فعلاً: وقت
 * الإنشاء، ووقت آخر تحديث للحالة الحالية. عند إضافة جدول تاريخ الحالات
 * (محور البيانات) يكفي تمرير `history` ليظهر لكل مرحلة تاريخها.
 */
export function OrderTimeline({
  status,
  fulfillment,
  createdAt,
  updatedAt,
  history,
}: {
  status: string;
  fulfillment: string;
  createdAt: Date;
  updatedAt: Date;
  history?: Partial<Record<OrderStatus, Date>>;
}) {
  const steps: OrderStatus[] =
    fulfillment === "PICKUP"
      ? ["NEW", "CONFIRMED", "IN_PRODUCTION", "READY", "DELIVERED"]
      : ["NEW", "CONFIRMED", "IN_PRODUCTION", "READY", "SHIPPED", "DELIVERED"];

  const cancelled = status === "CANCELLED";
  const currentIndex = cancelled ? -1 : steps.indexOf(status as OrderStatus);

  function stamp(step: OrderStatus, index: number): Date | null {
    if (history?.[step]) return history[step] ?? null;
    if (index === 0) return createdAt;
    if (index === currentIndex) return updatedAt;
    return null;
  }

  return (
    <div>
      <ol className="grid auto-cols-fr grid-flow-col gap-0 overflow-x-auto pb-1 max-md:grid-flow-row max-md:gap-1">
        {steps.map((step, index) => {
          const done = !cancelled && index < currentIndex;
          const current = !cancelled && index === currentIndex;
          const when = stamp(step, index);

          return (
            <li
              key={step}
              aria-current={current ? "step" : undefined}
              className="relative flex min-w-24 items-start gap-3 md:flex-col md:items-center md:gap-2 md:text-center"
            >
              {/* الوصلة بين الخطوات */}
              {index < steps.length - 1 ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute md:top-3.5 md:h-0.5 md:w-full md:start-1/2",
                    "max-md:top-8 max-md:bottom-[-0.25rem] max-md:w-0.5 max-md:start-[0.875rem]",
                    done ? "bg-success-600" : "bg-border-strong/70",
                  )}
                  style={{ zIndex: 0 }}
                />
              ) : null}

              <span
                aria-hidden="true"
                className={cn(
                  "relative z-10 grid size-7 shrink-0 place-items-center rounded-full border-2 text-[0.7rem] font-bold",
                  done && "border-success-600 bg-success-600 text-white",
                  current && "border-(--adm-gold) bg-(--adm-gold) text-[#261747]",
                  !done && !current && "border-border-strong bg-surface text-primary-400",
                  cancelled && "opacity-50",
                )}
              >
                {done ? <AdminIcon name="check" className="size-3.5" strokeWidth={3} /> : index + 1}
              </span>

              <span className="min-w-0 pb-3 md:pb-0">
                <span
                  className={cn(
                    "block text-sm",
                    current ? "text-primary-950 font-extrabold" : done ? "text-primary-800 font-bold" : "text-primary-500",
                  )}
                >
                  {ORDER_STATUS_LABELS[step]}
                  {current ? <span className="sr-only"> (المرحلة الحالية)</span> : null}
                </span>
                {when && (done || current) ? (
                  <span className="text-primary-500 block text-[0.7rem]">{adminDateTime(when)}</span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ol>

      {cancelled ? (
        <p className="bg-danger-50 text-danger-700 mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold">
          <AdminIcon name="alert" className="size-4" />
          الطلب ملغى منذ {adminDateTime(updatedAt)}
        </p>
      ) : null}
    </div>
  );
}

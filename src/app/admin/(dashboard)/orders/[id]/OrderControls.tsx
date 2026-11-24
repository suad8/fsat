"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { updateOrderAction } from "@/app/admin/(dashboard)/actions/workflow";
import { AdminIcon } from "@/components/admin/AdminIcon";
import { useConfirm, useToast } from "@/components/admin/Feedback";
import { useSaveShortcut } from "@/components/admin/FormKit";
import { Select, TextArea } from "@/components/ui/Field";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUSES,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUSES,
  type OrderStatus,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

/** الخطوة التالية في دورة الطلب — تتفرّع عند «جاهز» حسب الاستلام أو الشحن. */
export function nextOrderStep(
  status: string,
  fulfillment: string,
): { status: OrderStatus; label: string } | null {
  switch (status) {
    case "NEW":
      return { status: "CONFIRMED", label: "أكّد الطلب" };
    case "CONFIRMED":
      return { status: "IN_PRODUCTION", label: "ابدأ التنفيذ" };
    case "IN_PRODUCTION":
      return { status: "READY", label: "الطلب جاهز" };
    case "READY":
      return fulfillment === "PICKUP"
        ? { status: "DELIVERED", label: "سُلِّم للعميل" }
        : { status: "SHIPPED", label: "تم الشحن" };
    case "SHIPPED":
      return { status: "DELIVERED", label: "تم التسليم" };
    default:
      return null;
  }
}

/** أزرار الإجراء التالي: زر واحد بارز، وبقية الإجراءات ثانوية. */
export function OrderNextAction({
  orderId,
  status,
  fulfillment,
  paymentStatus,
  orderNumber,
}: {
  orderId: string;
  status: string;
  fulfillment: string;
  paymentStatus: string;
  orderNumber: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [pending, startTransition] = useTransition();

  const next = nextOrderStep(status, fulfillment);

  function apply(changes: { status?: string; paymentStatus?: string }, success: string) {
    startTransition(async () => {
      const result = await updateOrderAction(orderId, changes);
      if (!result.ok) {
        toast.error("تعذّر تحديث الطلب", result.error);
        return;
      }
      toast.success(success);
      router.refresh();
    });
  }

  async function cancel() {
    const ok = await confirm({
      title: `إلغاء الطلب ${orderNumber}؟`,
      description: "سيُعلَّم الطلب كملغى ولن يُحتسب في الإيراد. يمكنك إعادة فتحه لاحقًا.",
      confirmLabel: "نعم، ألغِ الطلب",
      cancelLabel: "تراجع",
      tone: "danger",
    });
    if (ok) apply({ status: "CANCELLED" }, "تم إلغاء الطلب");
  }

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {next ? (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            apply({ status: next.status }, `الحالة الآن: ${ORDER_STATUS_LABELS[next.status]}`)
          }
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-(--adm-gold) px-5 text-sm font-extrabold text-[#261747] shadow-sm transition-[filter,transform] hover:brightness-95 active:scale-[0.985] disabled:pointer-events-none disabled:opacity-60"
        >
          {pending ? (
            <span
              aria-hidden="true"
              className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            />
          ) : (
            <AdminIcon name="check" className="size-[1.1rem]" strokeWidth={2.4} />
          )}
          {next.label}
        </button>
      ) : null}

      {paymentStatus === "PENDING" && status !== "CANCELLED" ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => apply({ paymentStatus: "PAID" }, "سُجّل الدفع")}
          className="border-success-600/50 text-success-700 hover:bg-success-50 inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 text-sm font-bold transition-colors disabled:opacity-60"
        >
          <AdminIcon name="check" className="size-4" strokeWidth={2.2} />
          تسجيل الدفع
        </button>
      ) : null}

      {status === "CANCELLED" ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => apply({ status: "NEW" }, "أُعيد فتح الطلب")}
          className="border-border-strong text-primary-800 hover:bg-surface-muted inline-flex min-h-11 items-center rounded-lg border px-4 text-sm font-bold transition-colors disabled:opacity-60"
        >
          إعادة فتح الطلب
        </button>
      ) : status !== "DELIVERED" ? (
        <button
          type="button"
          disabled={pending}
          onClick={cancel}
          className="text-danger-700 hover:bg-danger-50 inline-flex min-h-11 items-center rounded-lg px-4 text-sm font-bold transition-colors disabled:opacity-60"
        >
          إلغاء الطلب
        </button>
      ) : null}
    </div>
  );
}

/** تغيير يدوي للحالات (لتصحيح خطأ) + الملاحظات الداخلية. */
export function OrderControls({
  orderId,
  status,
  paymentStatus,
  adminNotes,
}: {
  orderId: string;
  status: string;
  paymentStatus: string;
  adminNotes: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState({ status, paymentStatus, adminNotes });

  // الحالة المحفوظة تتبع الخادم بعد router.refresh — نقارن بما وصل من الخصائص
  const dirty =
    draft.status !== status ||
    draft.paymentStatus !== paymentStatus ||
    draft.adminNotes !== adminNotes;

  function save() {
    if (!dirty || pending) return;

    startTransition(async () => {
      const result = await updateOrderAction(orderId, draft);

      if (!result.ok) {
        toast.error("تعذّر الحفظ", result.error);
        return;
      }

      toast.success("تم حفظ التحديث");
      router.refresh();
    });
  }

  useSaveShortcut(save, dirty);

  return (
    <div className="space-y-4">
      <Select
        id="order-status"
        label="حالة الطلب"
        value={draft.status}
        onChange={(event) => setDraft({ ...draft, status: event.target.value })}
      >
        {ORDER_STATUSES.map((value) => (
          <option key={value} value={value}>
            {ORDER_STATUS_LABELS[value]}
          </option>
        ))}
      </Select>

      <Select
        id="payment-status"
        label="حالة الدفع"
        value={draft.paymentStatus}
        onChange={(event) => setDraft({ ...draft, paymentStatus: event.target.value })}
      >
        {PAYMENT_STATUSES.map((value) => (
          <option key={value} value={value}>
            {PAYMENT_STATUS_LABELS[value]}
          </option>
        ))}
      </Select>

      <TextArea
        id="admin-notes"
        label="ملاحظات داخلية"
        optional
        rows={4}
        maxLength={2000}
        value={draft.adminNotes}
        onChange={(event) => setDraft({ ...draft, adminNotes: event.target.value })}
        help="لا تظهر للعميل — للتنسيق الداخلي بين الفريق (مقاسات نهائية، اتفاق على موعد…)."
      />

      <button
        type="button"
        onClick={save}
        disabled={pending || !dirty}
        className={cn(
          "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold transition-colors disabled:opacity-50",
          "bg-primary-950 hover:bg-primary-900 text-white",
        )}
      >
        {pending ? "جارٍ الحفظ…" : dirty ? "حفظ التحديث" : "لا تغييرات"}
      </button>
    </div>
  );
}

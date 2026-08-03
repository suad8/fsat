"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { updateOrderAction } from "@/app/admin/(dashboard)/actions/workflow";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Select, TextArea } from "@/components/ui/Field";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUSES,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUSES,
} from "@/lib/constants";

/** تحديث حالة الطلب وحالة الدفع والملاحظات الداخلية. */
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
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState({ status, paymentStatus, adminNotes });
  const [feedback, setFeedback] = useState<{ tone: "success" | "danger"; text: string } | null>(
    null,
  );

  const dirty =
    draft.status !== status ||
    draft.paymentStatus !== paymentStatus ||
    draft.adminNotes !== adminNotes;

  function save() {
    startTransition(async () => {
      const result = await updateOrderAction(orderId, draft);

      if (!result.ok) {
        setFeedback({ tone: "danger", text: result.error ?? "تعذّر الحفظ." });
        return;
      }

      setFeedback({ tone: "success", text: "تم حفظ التحديث." });
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {feedback ? (
        <Alert tone={feedback.tone} live>
          {feedback.text}
        </Alert>
      ) : null}

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
        value={draft.adminNotes}
        onChange={(event) => setDraft({ ...draft, adminNotes: event.target.value })}
        help="لا تظهر للعميل — للتنسيق الداخلي بين الفريق."
      />

      <Button fullWidth onClick={save} disabled={pending || !dirty} icon="check">
        {pending ? "جارٍ الحفظ…" : "حفظ التحديث"}
      </Button>
    </div>
  );
}

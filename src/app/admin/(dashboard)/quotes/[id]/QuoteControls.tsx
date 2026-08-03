"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { updateQuoteAction } from "@/app/admin/(dashboard)/actions/workflow";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Select, TextArea, TextInput } from "@/components/ui/Field";
import { QUOTE_STATUS_LABELS, QUOTE_STATUSES } from "@/lib/constants";

/** تحديث حالة طلب عرض السعر وقيمته والملاحظات الداخلية. */
export function QuoteControls({
  quoteId,
  status,
  quotedAmount,
  adminNotes,
}: {
  quoteId: string;
  status: string;
  quotedAmount: number | null;
  adminNotes: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState({
    status,
    quotedAmount: quotedAmount === null ? "" : String(quotedAmount),
    adminNotes,
  });
  const [feedback, setFeedback] = useState<{ tone: "success" | "danger"; text: string } | null>(
    null,
  );

  const dirty =
    draft.status !== status ||
    draft.quotedAmount !== (quotedAmount === null ? "" : String(quotedAmount)) ||
    draft.adminNotes !== adminNotes;

  function save() {
    startTransition(async () => {
      const amount = draft.quotedAmount.trim();

      const result = await updateQuoteAction(quoteId, {
        status: draft.status,
        quotedAmount: amount === "" ? null : Number(amount),
        adminNotes: draft.adminNotes,
      });

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
        id="quote-status"
        label="حالة الطلب"
        value={draft.status}
        onChange={(event) => setDraft({ ...draft, status: event.target.value })}
      >
        {QUOTE_STATUSES.map((value) => (
          <option key={value} value={value}>
            {QUOTE_STATUS_LABELS[value]}
          </option>
        ))}
      </Select>

      <TextInput
        id="quoted-amount"
        label="قيمة العرض المرسل (ريال)"
        type="number"
        step="0.01"
        optional
        value={draft.quotedAmount}
        onChange={(event) => setDraft({ ...draft, quotedAmount: event.target.value })}
        help="سجّل المبلغ الذي أرسلته للعميل لتتبّع نسبة التحويل."
      />

      <TextArea
        id="quote-notes"
        label="ملاحظات داخلية"
        optional
        rows={4}
        value={draft.adminNotes}
        onChange={(event) => setDraft({ ...draft, adminNotes: event.target.value })}
        help="لا تظهر للعميل."
      />

      <Button fullWidth onClick={save} disabled={pending || !dirty} icon="check">
        {pending ? "جارٍ الحفظ…" : "حفظ التحديث"}
      </Button>
    </div>
  );
}

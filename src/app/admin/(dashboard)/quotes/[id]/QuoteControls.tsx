"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { updateQuoteAction } from "@/app/admin/(dashboard)/actions/workflow";
import { AdminIcon } from "@/components/admin/AdminIcon";
import { useConfirm, useToast } from "@/components/admin/Feedback";
import { useSaveShortcut } from "@/components/admin/FormKit";
import { Select, TextArea, TextInput } from "@/components/ui/Field";
import { QUOTE_STATUS_LABELS, QUOTE_STATUSES } from "@/lib/constants";

const PRIMARY =
  "inline-flex min-h-11 items-center gap-2 rounded-lg bg-(--adm-gold) px-5 text-sm font-extrabold text-[#261747] shadow-sm transition-[filter,transform] hover:brightness-95 active:scale-[0.985] disabled:pointer-events-none disabled:opacity-60";
const SECONDARY =
  "border-border-strong text-primary-800 hover:bg-surface-muted inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 text-sm font-bold transition-colors disabled:pointer-events-none disabled:opacity-60";

/** الإجراء التالي لطلب عرض السعر: مراجعة ← إرسال العرض بمبلغ ← حسم. */
export function QuoteNextAction({
  quoteId,
  reference,
  status,
  quotedAmount,
}: {
  quoteId: string;
  reference: string;
  status: string;
  quotedAmount: number | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [pending, startTransition] = useTransition();
  const [amount, setAmount] = useState(quotedAmount === null ? "" : String(quotedAmount));
  const [amountError, setAmountError] = useState<string | null>(null);

  function apply(changes: { status?: string; quotedAmount?: number | null }, success: string) {
    startTransition(async () => {
      const result = await updateQuoteAction(quoteId, changes);
      if (!result.ok) {
        toast.error("تعذّر تحديث الطلب", result.error);
        return;
      }
      toast.success(success);
      router.refresh();
    });
  }

  function sendQuote() {
    const value = Number(amount.replace(",", "."));
    if (!amount.trim() || !Number.isFinite(value) || value <= 0) {
      setAmountError("أدخل قيمة العرض المرسل بالريال (رقم أكبر من صفر).");
      document.getElementById("quote-next-amount")?.focus();
      return;
    }
    setAmountError(null);
    apply({ status: "QUOTED", quotedAmount: value }, "سُجّل إرسال العرض");
  }

  async function markLost() {
    const ok = await confirm({
      title: `إغلاق ${reference} كـ«لم يكتمل»؟`,
      description: "يمكنك إعادة فتح الطلب لاحقًا إن تغيّر قرار العميل.",
      confirmLabel: "نعم، أغلقه",
      cancelLabel: "تراجع",
      tone: "danger",
    });
    if (ok) apply({ status: "LOST" }, "أُغلق الطلب");
  }

  if (status === "NEW") {
    return (
      <div className="flex flex-wrap items-center gap-2.5">
        <button type="button" disabled={pending} onClick={() => apply({ status: "IN_REVIEW" }, "بدأت المراجعة")} className={PRIMARY}>
          <AdminIcon name="check" className="size-[1.1rem]" strokeWidth={2.4} />
          ابدأ مراجعة الملفات
        </button>
        <button type="button" disabled={pending} onClick={markLost} className={SECONDARY}>
          لم يكتمل
        </button>
      </div>
    );
  }

  if (status === "IN_REVIEW") {
    return (
      <div className="flex flex-wrap items-end gap-2.5">
        <div className="w-44">
          <TextInput
            id="quote-next-amount"
            label="قيمة العرض (ريال)"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={amount}
            onChange={(event) => {
              setAmount(event.target.value);
              if (amountError) setAmountError(null);
            }}
            error={amountError}
            required
          />
        </div>
        <button type="button" disabled={pending} onClick={sendQuote} className={PRIMARY}>
          <AdminIcon name="check" className="size-[1.1rem]" strokeWidth={2.4} />
          سجّل إرسال العرض
        </button>
        <button type="button" disabled={pending} onClick={markLost} className={SECONDARY}>
          لم يكتمل
        </button>
      </div>
    );
  }

  if (status === "QUOTED") {
    return (
      <div className="flex flex-wrap items-center gap-2.5">
        <button type="button" disabled={pending} onClick={() => apply({ status: "WON" }, "تحوّل الطلب إلى طلب مؤكد")} className={PRIMARY}>
          <AdminIcon name="check" className="size-[1.1rem]" strokeWidth={2.4} />
          العميل وافق
        </button>
        <button type="button" disabled={pending} onClick={markLost} className={SECONDARY}>
          لم يكتمل
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => apply({ status: "IN_REVIEW" }, "أُعيد إلى المراجعة")}
          className="text-primary-700 hover:bg-surface-sunken min-h-11 rounded-lg px-3 text-sm font-bold"
        >
          تعديل العرض
        </button>
      </div>
    );
  }

  return (
    <button type="button" disabled={pending} onClick={() => apply({ status: "IN_REVIEW" }, "أُعيد فتح الطلب")} className={SECONDARY}>
      إعادة فتح الطلب
    </button>
  );
}

/** تغيير يدوي للحالة والمبلغ + ملاحظات داخلية. */
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
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const initialAmount = quotedAmount === null ? "" : String(quotedAmount);
  const [draft, setDraft] = useState({ status, quotedAmount: initialAmount, adminNotes });

  const dirty =
    draft.status !== status || draft.quotedAmount !== initialAmount || draft.adminNotes !== adminNotes;

  function save() {
    if (!dirty || pending) return;

    startTransition(async () => {
      const amount = draft.quotedAmount.trim();

      const result = await updateQuoteAction(quoteId, {
        status: draft.status,
        quotedAmount: amount === "" ? null : Number(amount),
        adminNotes: draft.adminNotes,
      });

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
        maxLength={2000}
        value={draft.adminNotes}
        onChange={(event) => setDraft({ ...draft, adminNotes: event.target.value })}
        help="لا تظهر للعميل."
      />

      <button
        type="button"
        onClick={save}
        disabled={pending || !dirty}
        className="bg-primary-950 hover:bg-primary-900 inline-flex min-h-11 w-full items-center justify-center rounded-lg px-4 text-sm font-bold text-white transition-colors disabled:opacity-50"
      >
        {pending ? "جارٍ الحفظ…" : dirty ? "حفظ التحديث" : "لا تغييرات"}
      </button>
    </div>
  );
}

import {
  MESSAGE_STATUS_LABELS,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  QUOTE_STATUS_LABELS,
  type MessageStatus,
  type OrderStatus,
  type PaymentStatus,
  type QuoteStatus,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * شارات الحالة بألوان متمايزة لكل مرحلة.
 *
 * ألوان `ORDER_STATUS_TONE` في الثوابت تضع «جديد» و«مؤكّد» بنفس الأزرق و«جاهز»
 * و«تم الشحن» بنفس الذهبي، فلا تُميَّز الحالات بنظرة سريعة على قائمة طويلة.
 * هنا لكل حالة لون ونقطة خاصة، والنص دائمًا مكتوب (اللون وحده ليس رسالة).
 */

type Tone = { chip: string; dot: string };

const NEUTRAL: Tone = {
  chip: "bg-primary-100 text-primary-700 ring-primary-500/20",
  dot: "bg-primary-400",
};

const ORDER_TONES: Record<OrderStatus, Tone> = {
  NEW: { chip: "bg-brand-50 text-brand-700 ring-brand-500/25", dot: "bg-brand-600" },
  CONFIRMED: { chip: "bg-info-50 text-info-700 ring-info-500/25", dot: "bg-info-600" },
  IN_PRODUCTION: { chip: "bg-warning-50 text-warning-700 ring-warning-500/25", dot: "bg-warning-500" },
  READY: { chip: "bg-teal-50 text-teal-800 ring-teal-600/25", dot: "bg-teal-600" },
  SHIPPED: { chip: "bg-cyan-50 text-cyan-800 ring-cyan-600/25", dot: "bg-cyan-600" },
  DELIVERED: { chip: "bg-success-50 text-success-700 ring-success-500/25", dot: "bg-success-600" },
  CANCELLED: { chip: "bg-danger-50 text-danger-700 ring-danger-500/25", dot: "bg-danger-600" },
};

const QUOTE_TONES: Record<QuoteStatus, Tone> = {
  NEW: { chip: "bg-brand-50 text-brand-700 ring-brand-500/25", dot: "bg-brand-600" },
  IN_REVIEW: { chip: "bg-warning-50 text-warning-700 ring-warning-500/25", dot: "bg-warning-500" },
  QUOTED: { chip: "bg-info-50 text-info-700 ring-info-500/25", dot: "bg-info-600" },
  WON: { chip: "bg-success-50 text-success-700 ring-success-500/25", dot: "bg-success-600" },
  LOST: NEUTRAL,
};

const PAYMENT_TONES: Record<PaymentStatus, Tone> = {
  PENDING: { chip: "bg-warning-50 text-warning-700 ring-warning-500/25", dot: "bg-warning-500" },
  PAID: { chip: "bg-success-50 text-success-700 ring-success-500/25", dot: "bg-success-600" },
  REFUNDED: NEUTRAL,
  FAILED: { chip: "bg-danger-50 text-danger-700 ring-danger-500/25", dot: "bg-danger-600" },
};

const MESSAGE_TONES: Record<MessageStatus, Tone> = {
  NEW: { chip: "bg-brand-50 text-brand-700 ring-brand-500/25", dot: "bg-brand-600" },
  READ: NEUTRAL,
  REPLIED: { chip: "bg-success-50 text-success-700 ring-success-500/25", dot: "bg-success-600" },
  ARCHIVED: { chip: "bg-primary-50 text-primary-500 ring-primary-300/40", dot: "bg-primary-300" },
};

export function Pill({
  label,
  tone,
  className,
}: {
  label: string;
  tone: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap ring-1 ring-inset",
        tone.chip,
        className,
      )}
    >
      <span aria-hidden="true" className={cn("size-1.5 rounded-full", tone.dot)} />
      {label}
    </span>
  );
}

export function OrderStatusBadge({ status }: { status: string }) {
  return (
    <Pill
      label={ORDER_STATUS_LABELS[status as OrderStatus] ?? status}
      tone={ORDER_TONES[status as OrderStatus] ?? NEUTRAL}
    />
  );
}

export function QuoteStatusBadge({ status }: { status: string }) {
  return (
    <Pill
      label={QUOTE_STATUS_LABELS[status as QuoteStatus] ?? status}
      tone={QUOTE_TONES[status as QuoteStatus] ?? NEUTRAL}
    />
  );
}

export function PaymentStatusBadge({ status }: { status: string }) {
  return (
    <Pill
      label={PAYMENT_STATUS_LABELS[status as PaymentStatus] ?? status}
      tone={PAYMENT_TONES[status as PaymentStatus] ?? NEUTRAL}
    />
  );
}

export function MessageStatusBadge({ status }: { status: string }) {
  return (
    <Pill
      label={MESSAGE_STATUS_LABELS[status as MessageStatus] ?? status}
      tone={MESSAGE_TONES[status as MessageStatus] ?? NEUTRAL}
    />
  );
}

/** شارة عمر مع لون الإلحاح: كلما طال الانتظار ازداد اللون حدّة. */
export function AgePill({
  label,
  urgency,
}: {
  label: string;
  urgency: "ok" | "warn" | "late";
}) {
  const tone: Tone =
    urgency === "late"
      ? { chip: "bg-danger-50 text-danger-700 ring-danger-500/25", dot: "bg-danger-600" }
      : urgency === "warn"
        ? { chip: "bg-warning-50 text-warning-700 ring-warning-500/25", dot: "bg-warning-500" }
        : { chip: "bg-primary-100 text-primary-700 ring-primary-500/20", dot: "bg-primary-400" };

  return <Pill label={label} tone={tone} />;
}

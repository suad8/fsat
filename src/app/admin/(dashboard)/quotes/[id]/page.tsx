import Link from "next/link";
import { notFound } from "next/navigation";

import { QuoteControls, QuoteNextAction } from "@/app/admin/(dashboard)/quotes/[id]/QuoteControls";
import { CopyButton } from "@/components/admin/ActionButtons";
import { AdminIcon } from "@/components/admin/AdminIcon";
import { AdminCard, AdminHeading, Detail } from "@/components/admin/AdminUi";
import { AgePill, QuoteStatusBadge } from "@/components/admin/StatusBadges";
import { ButtonLink } from "@/components/ui/Button";
import { adminDate, adminDateTime, formatPhone, telLink } from "@/lib/admin/format";
import { quoteWhatsAppUrl } from "@/lib/admin/messages";
import { ageHours, formatAge, startOfRiyadhDay, urgencyForAge } from "@/lib/admin/time";
import { CONTACT_PREFERENCE_LABELS, type ContactPreference } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { cn, formatFileSize, formatPriceWithCurrency } from "@/lib/utils";

type Params = Promise<{ id: string }>;

export const metadata = { title: "تفاصيل طلب عرض السعر" };

type Attachment = {
  kind: string;
  name: string;
  url: string;
  size: number;
  mimeType: string;
};

const ATTACHMENT_LABELS: Record<string, string> = {
  DESIGN: "ملف التصميم",
  LOGO: "الشعار",
  REFERENCE: "صورة توضيحية",
};

const STEPS = [
  { key: "NEW", label: "طلب جديد" },
  { key: "IN_REVIEW", label: "مراجعة الملفات" },
  { key: "QUOTED", label: "إرسال العرض" },
  { key: "DONE", label: "الحسم" },
] as const;

export default async function QuoteDetailPage({ params }: { params: Params }) {
  const { id } = await params;

  const quote = await prisma.quoteRequest.findUnique({ where: { id } });
  if (!quote) notFound();

  const attachments = (Array.isArray(quote.attachments) ? quote.attachments : []) as Attachment[];

  // الحقول التي لها عمود مخصّص تُعرض في مكانها أعلاه — نستبعدها من هنا
  const SYSTEM_KEYS = new Set([
    "companyName",
    "email",
    "productType",
    "size",
    "quantity",
    "dueDate",
    "preferredContact",
  ]);

  // تُخزَّن كمصفوفة [{ key, label, value }] — التسمية محفوظة وقت الإرسال
  const stored = (Array.isArray(quote.customFields) ? quote.customFields : []) as {
    key: string;
    label: string;
    value: string;
  }[];
  const customAnswers = stored.filter((answer) => !SYSTEM_KEYS.has(answer.key) && answer.value);

  const now = new Date();
  const waiting = quote.status === "NEW" || quote.status === "IN_REVIEW";
  const overdue =
    quote.dueDate &&
    quote.dueDate < startOfRiyadhDay(now) &&
    quote.status !== "WON" &&
    quote.status !== "LOST";

  const stepIndex =
    quote.status === "NEW"
      ? 0
      : quote.status === "IN_REVIEW"
        ? 1
        : quote.status === "QUOTED"
          ? 2
          : 3;

  const whatsapp = quoteWhatsAppUrl(quote.phone, {
    reference: quote.reference,
    customerName: quote.customerName,
    productType: quote.productType,
    status: quote.status,
    quotedAmount: quote.quotedAmount,
  });

  return (
    <>
      <AdminHeading
        title={`عرض سعر ${quote.reference}`}
        description={`${quote.customerName} — وصل ${formatAge(quote.createdAt, now)} (${adminDateTime(quote.createdAt)})`}
        backHref="/admin/quotes"
        backLabel="رجوع إلى عروض الأسعار"
        meta={
          <span className="flex flex-wrap items-center gap-2">
            <QuoteStatusBadge status={quote.status} />
            {waiting ? (
              <AgePill
                label={`ينتظر ${formatAge(quote.createdAt, now).replace("منذ ", "")}`}
                urgency={urgencyForAge(ageHours(quote.createdAt, now))}
              />
            ) : null}
            <CopyButton text={quote.reference} label="نسخ الرقم المرجعي" toastText="تم نسخ الرقم المرجعي">
              نسخ الرقم
            </CopyButton>
          </span>
        }
        action={
          <ButtonLink href={whatsapp} external variant="whatsapp" icon="whatsapp" size="sm">
            مراسلة العميل
          </ButtonLink>
        }
      />

      <AdminCard className="mb-6">
        <div data-adm-in className="space-y-5">
          <ol className="grid grid-cols-4 gap-2" aria-label="مراحل عرض السعر">
            {STEPS.map((step, index) => {
              const done = index < stepIndex || (index === 3 && stepIndex === 3);
              const current = index === stepIndex && stepIndex < 3;
              const label =
                index === 3 && stepIndex === 3
                  ? quote.status === "WON"
                    ? "تحوّل إلى طلب"
                    : "لم يكتمل"
                  : step.label;

              return (
                <li key={step.key} aria-current={current ? "step" : undefined} className="min-w-0">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "block h-1.5 rounded-full",
                      done
                        ? quote.status === "LOST" && index === 3
                          ? "bg-primary-400"
                          : "bg-success-600"
                        : current
                          ? "bg-(--adm-gold)"
                          : "bg-border-strong/60",
                    )}
                  />
                  <span
                    className={cn(
                      "mt-1.5 block truncate text-xs",
                      current ? "text-primary-950 font-extrabold" : done ? "text-primary-800 font-bold" : "text-primary-500",
                    )}
                  >
                    {label}
                    {current ? <span className="sr-only"> (المرحلة الحالية)</span> : null}
                  </span>
                </li>
              );
            })}
          </ol>

          <div className="border-border flex flex-wrap items-end justify-between gap-3 border-t pt-4">
            <QuoteNextAction
              key={`${quote.status}|${quote.quotedAmount ?? ""}`}
              quoteId={quote.id}
              reference={quote.reference}
              status={quote.status}
              quotedAmount={quote.quotedAmount}
            />

            {quote.quotedAmount !== null ? (
              <p className="text-primary-600 text-sm">
                العرض المسجَّل: <strong className="text-primary-950 tabular-nums">{formatPriceWithCurrency(quote.quotedAmount)}</strong>
              </p>
            ) : null}
          </div>
        </div>
      </AdminCard>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <AdminCard title="تفاصيل الطلب">
            <dl className="grid gap-4 sm:grid-cols-2">
              <Detail label="نوع المنتج أو الخدمة">{quote.productType}</Detail>
              {quote.productSlug ? (
                <Detail label="المنتج المرتبط">
                  <Link href="/admin/products" className="text-accent-700 font-bold hover:underline">
                    {quote.productSlug}
                  </Link>
                </Detail>
              ) : null}
              {quote.size ? <Detail label="المقاس">{quote.size}</Detail> : null}
              {quote.quantity ? <Detail label="الكمية">{quote.quantity}</Detail> : null}
              {quote.dueDate ? (
                <Detail label="موعد التسليم المطلوب">
                  <span className={overdue ? "text-danger-700 font-bold" : undefined}>
                    {adminDate(quote.dueDate)}
                    {overdue ? " — تجاوز الموعد" : ""}
                  </span>
                </Detail>
              ) : null}
              <Detail label="طريقة التواصل المفضّلة">
                {CONTACT_PREFERENCE_LABELS[quote.preferredContact as ContactPreference] ?? quote.preferredContact}
              </Detail>
            </dl>

            {customAnswers.length > 0 ? (
              <dl className="border-border mt-5 grid gap-4 border-t pt-5 sm:grid-cols-2">
                {customAnswers.map((answer) => (
                  <Detail key={answer.key} label={answer.label}>
                    {answer.value}
                  </Detail>
                ))}
              </dl>
            ) : null}

            <div className="border-border mt-5 border-t pt-5">
              <h3 className="text-primary-500 mb-2 text-xs">وصف الطلب</h3>
              <p className="text-primary-900 text-sm leading-[1.9] whitespace-pre-line">{quote.description}</p>
            </div>
          </AdminCard>

          <AdminCard
            title="ملفات العميل"
            description={
              attachments.length > 0
                ? "راجع التصميم قبل التسعير. الملفات تُحفظ خارج المجلد العام ولا تُنزَّل إلا من داخل لوحة التحكم."
                : undefined
            }
          >
            {attachments.length === 0 ? (
              <p className="bg-warning-50 text-warning-700 flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold">
                <AdminIcon name="alert" className="size-4 shrink-0" />
                لم يرفق العميل أي ملفات — اطلب التصميم أو صورة توضيحية عبر واتساب قبل التسعير.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {attachments.map((file) => (
                  <li
                    key={file.url}
                    className="border-border bg-surface-muted flex items-center gap-3 rounded-lg border p-3"
                  >
                    <AdminIcon name="file" className="text-primary-500 size-5 shrink-0" />

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{file.name}</span>
                      <span className="text-primary-500 block text-xs">
                        {ATTACHMENT_LABELS[file.kind] ?? file.kind} · {formatFileSize(file.size)}
                      </span>
                    </span>

                    <a
                      href={file.url}
                      className="border-border-strong text-primary-800 hover:bg-surface inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-md border px-3 text-xs font-bold transition-colors"
                    >
                      <AdminIcon name="upload" className="size-3.5 rotate-180" />
                      تنزيل
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </AdminCard>
        </div>

        <div className="space-y-6">
          <AdminCard title="بيانات العميل">
            <dl className="space-y-3">
              <Detail label="الاسم">{quote.customerName}</Detail>
              {quote.companyName ? <Detail label="المنشأة">{quote.companyName}</Detail> : null}
              <Detail label="الجوال" ltr>
                {formatPhone(quote.phone)}
              </Detail>
              {quote.email ? (
                <Detail label="البريد" ltr>
                  {quote.email}
                </Detail>
              ) : null}
              <Detail label="المدينة">{quote.city}</Detail>
            </dl>

            <div className="border-border mt-4 grid gap-2 border-t pt-4">
              <ButtonLink href={whatsapp} external variant="whatsapp" size="sm" icon="whatsapp">
                واتساب برسالة جاهزة
              </ButtonLink>
              <ButtonLink href={telLink(quote.phone)} variant="outline" size="sm" icon="phone">
                اتصال
              </ButtonLink>
              {quote.email ? (
                <ButtonLink
                  href={`mailto:${quote.email}?subject=${encodeURIComponent(`عرض سعر ${quote.reference}`)}`}
                  variant="outline"
                  size="sm"
                  icon="mail"
                >
                  إرسال بريد
                </ButtonLink>
              ) : null}
            </div>
          </AdminCard>

          <AdminCard title="تعديل يدوي وملاحظات داخلية" description="لتصحيح حالة أو مبلغ أو تدوين ملاحظة للفريق.">
            <QuoteControls
              key={`${quote.status}|${quote.quotedAmount ?? ""}|${quote.adminNotes ?? ""}`}
              quoteId={quote.id}
              status={quote.status}
              quotedAmount={quote.quotedAmount}
              adminNotes={quote.adminNotes ?? ""}
            />
          </AdminCard>
        </div>
      </div>
    </>
  );
}

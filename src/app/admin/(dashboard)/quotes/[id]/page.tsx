import Link from "next/link";
import { notFound } from "next/navigation";

import { QuoteControls } from "@/app/admin/(dashboard)/quotes/[id]/QuoteControls";
import { AdminCard, AdminHeading, StatusBadge } from "@/components/admin/AdminUi";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import {
  CONTACT_PREFERENCE_LABELS,
  QUOTE_STATUS_LABELS,
  QUOTE_STATUS_TONE,
  type ContactPreference,
  type QuoteStatus,
} from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { formatDate, formatDateTime, formatFileSize } from "@/lib/utils";
import { whatsappReferenceUrl } from "@/lib/whatsapp";

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

export default async function QuoteDetailPage({ params }: { params: Params }) {
  const { id } = await params;

  const quote = await prisma.quoteRequest.findUnique({ where: { id } });
  if (!quote) notFound();

  const attachments = (
    Array.isArray(quote.attachments) ? quote.attachments : []
  ) as Attachment[];

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
  // فتبقى الطلبات القديمة مقروءة حتى لو أعادت الإدارة تسمية الحقل لاحقًا
  const stored = (
    Array.isArray(quote.customFields) ? quote.customFields : []
  ) as { key: string; label: string; value: string }[];

  const customAnswers = stored.filter(
    (answer) => !SYSTEM_KEYS.has(answer.key) && answer.value,
  );

  return (
    <>
      <AdminHeading
        title={`طلب عرض سعر ${quote.reference}`}
        description={`${quote.customerName} — ${formatDateTime(quote.createdAt)}`}
        backHref="/admin/quotes"
        backLabel="رجوع إلى عروض الأسعار"
        action={
          <ButtonLink
            href={whatsappReferenceUrl(quote.reference, "quote")}
            external
            variant="whatsapp"
            icon="whatsapp"
            size="sm"
          >
            مراسلة العميل
          </ButtonLink>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <AdminCard title="تفاصيل الطلب">
            <dl className="grid gap-4 sm:grid-cols-2">
              <Field label="نوع المنتج أو الخدمة" value={quote.productType} />
              {quote.productSlug ? (
                <div>
                  <dt className="text-primary-500 text-xs">المنتج المرتبط</dt>
                  <dd className="mt-0.5">
                    <Link
                      href={`/admin/products`}
                      className="text-accent-700 text-sm font-bold"
                    >
                      {quote.productSlug}
                    </Link>
                  </dd>
                </div>
              ) : null}
              {quote.size ? <Field label="المقاس" value={quote.size} /> : null}
              {quote.quantity ? <Field label="الكمية" value={quote.quantity} /> : null}
              {quote.dueDate ? (
                <Field label="موعد التسليم المطلوب" value={formatDate(quote.dueDate)} />
              ) : null}
              <Field
                label="طريقة التواصل المفضّلة"
                value={
                  CONTACT_PREFERENCE_LABELS[quote.preferredContact as ContactPreference] ??
                  quote.preferredContact
                }
              />
            </dl>

            {/*
              إجابات الحقول المخصّصة التي عرّفتها الإدارة في قالب النموذج.
              نعرض ما لا يوجد له عمود مخصّص فقط، حتى لا تتكرر البيانات أعلاه.
            */}
            {customAnswers.length > 0 ? (
              <dl className="border-border mt-5 grid gap-4 border-t pt-5 sm:grid-cols-2">
                {customAnswers.map((answer) => (
                  <Field key={answer.key} label={answer.label} value={answer.value} />
                ))}
              </dl>
            ) : null}

            <div className="border-border mt-5 border-t pt-5">
              <h3 className="text-primary-500 mb-2 text-xs">وصف الطلب</h3>
              <p className="text-primary-800 text-sm leading-[1.9] whitespace-pre-line">
                {quote.description}
              </p>
            </div>
          </AdminCard>

          <AdminCard
            title="المرفقات"
            description={
              attachments.length > 0
                ? "ملفات العملاء تُحفظ خارج المجلد العام ولا تُنزَّل إلا من داخل لوحة التحكم."
                : undefined
            }
          >
            {attachments.length === 0 ? (
              <p className="text-primary-500 text-sm">لم يرفق العميل أي ملفات.</p>
            ) : (
              <ul className="space-y-2.5">
                {attachments.map((file) => (
                  <li
                    key={file.url}
                    className="border-border bg-surface-muted flex items-center gap-3 rounded-lg border p-3"
                  >
                    <Icon name="file" className="text-primary-400 size-5 shrink-0" />

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{file.name}</span>
                      <span className="text-primary-500 block text-xs">
                        {ATTACHMENT_LABELS[file.kind] ?? file.kind} ·{" "}
                        {formatFileSize(file.size)}
                      </span>
                    </span>

                    <a
                      href={file.url}
                      className="border-border-strong text-primary-700 hover:bg-surface inline-flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-bold transition-colors"
                    >
                      <Icon name="upload" className="size-3.5 rotate-180" />
                      تنزيل
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </AdminCard>
        </div>

        <div className="space-y-6">
          <AdminCard title="حالة الطلب">
            <div className="mb-4">
              <StatusBadge
                label={QUOTE_STATUS_LABELS[quote.status as QuoteStatus] ?? quote.status}
                tone={QUOTE_STATUS_TONE[quote.status as QuoteStatus] ?? ""}
              />
            </div>

            <QuoteControls
              quoteId={quote.id}
              status={quote.status}
              quotedAmount={quote.quotedAmount}
              adminNotes={quote.adminNotes ?? ""}
            />
          </AdminCard>

          <AdminCard title="بيانات العميل">
            <dl className="space-y-3 text-sm">
              <Field label="الاسم" value={quote.customerName} />
              {quote.companyName ? (
                <Field label="المنشأة" value={quote.companyName} />
              ) : null}
              <Field label="الجوال" value={quote.phone} ltr />
              {quote.email ? <Field label="البريد" value={quote.email} ltr /> : null}
              <Field label="المدينة" value={quote.city} />
            </dl>

            <div className="border-border mt-4 grid gap-2 border-t pt-4">
              <a
                href={`tel:+${quote.phone}`}
                className="border-border-strong text-primary-700 hover:bg-surface-muted inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold transition-colors"
              >
                <Icon name="phone" className="size-4" />
                اتصال
              </a>
              {quote.email ? (
                <a
                  href={`mailto:${quote.email}?subject=${encodeURIComponent(`عرض سعر ${quote.reference}`)}`}
                  className="border-border-strong text-primary-700 hover:bg-surface-muted inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold transition-colors"
                >
                  <Icon name="mail" className="size-4" />
                  إرسال بريد
                </a>
              ) : null}
            </div>
          </AdminCard>
        </div>
      </div>
    </>
  );
}

function Field({ label, value, ltr }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div>
      <dt className="text-primary-500 text-xs">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium" dir={ltr ? "ltr" : undefined}>
        {value}
      </dd>
    </div>
  );
}

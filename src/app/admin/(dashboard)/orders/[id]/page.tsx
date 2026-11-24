import Image from "next/image";
import { notFound } from "next/navigation";

import { OrderControls, OrderNextAction } from "@/app/admin/(dashboard)/orders/[id]/OrderControls";
import { OrderTimeline } from "@/app/admin/(dashboard)/orders/[id]/OrderTimeline";
import { CopyButton } from "@/components/admin/ActionButtons";
import { AdminIcon } from "@/components/admin/AdminIcon";
import { AdminCard, AdminHeading, Detail } from "@/components/admin/AdminUi";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/admin/StatusBadges";
import { ButtonLink } from "@/components/ui/Button";
import { adminDateTime, formatPhone, telLink } from "@/lib/admin/format";
import { orderWhatsAppUrl } from "@/lib/admin/messages";
import { formatAge } from "@/lib/admin/time";
import {
  FULFILLMENT_LABELS,
  PAYMENT_METHOD_LABELS,
  type FulfillmentMethod,
  type PaymentMethod,
} from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { formatNumber, formatPriceWithCurrency } from "@/lib/utils";

type Params = Promise<{ id: string }>;

export const metadata = { title: "تفاصيل الطلب" };

type SelectedOption = { key: string; label: string; valueLabel: string };
type UploadedFile = { name: string; url: string };

export default async function OrderDetailPage({ params }: { params: Params }) {
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!order) notFound();

  const filesOf = (item: (typeof order.items)[number]) =>
    (Array.isArray(item.uploadedFiles) ? item.uploadedFiles : []) as UploadedFile[];

  const hasDesignFile = order.items.some((item) => filesOf(item).length > 0);
  const now = new Date();

  const whatsapp = orderWhatsAppUrl(order.customerPhone, {
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    status: order.status,
    total: order.total,
    fulfillment: order.fulfillment,
    hasDesignFile,
  });

  return (
    <>
      <AdminHeading
        title={`الطلب ${order.orderNumber}`}
        description={`${order.customerName} — وصل ${formatAge(order.createdAt, now)} (${adminDateTime(order.createdAt)})`}
        backHref="/admin/orders"
        backLabel="رجوع إلى الطلبات"
        meta={
          <span className="flex flex-wrap items-center gap-2">
            <OrderStatusBadge status={order.status} />
            <PaymentStatusBadge status={order.paymentStatus} />
            <CopyButton text={order.orderNumber} label="نسخ رقم الطلب" toastText="تم نسخ رقم الطلب">
              نسخ الرقم
            </CopyButton>
          </span>
        }
        action={
          <>
            <ButtonLink
              href={`/admin/orders/${order.id}/print?doc=production`}
              external
              variant="outline"
              size="sm"
              icon="factory"
            >
              أمر إنتاج
            </ButtonLink>
            <ButtonLink
              href={`/admin/orders/${order.id}/print?doc=invoice`}
              external
              variant="outline"
              size="sm"
              icon="document"
            >
              فاتورة
            </ButtonLink>
            <ButtonLink href={whatsapp} external variant="whatsapp" icon="whatsapp" size="sm">
              مراسلة العميل
            </ButtonLink>
          </>
        }
      />

      {/* ---------- المرحلة والإجراء التالي ---------- */}
      <AdminCard className="mb-6" id="stage">
        <div data-adm-in className="space-y-5">
          <OrderTimeline
            status={order.status}
            fulfillment={order.fulfillment}
            createdAt={order.createdAt}
            updatedAt={order.updatedAt}
          />

          <div className="border-border flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <OrderNextAction
              orderId={order.id}
              orderNumber={order.orderNumber}
              status={order.status}
              fulfillment={order.fulfillment}
              paymentStatus={order.paymentStatus}
            />

            {!hasDesignFile && order.status !== "CANCELLED" && order.status !== "DELIVERED" ? (
              <p className="bg-warning-50 text-warning-700 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold">
                <AdminIcon name="alert" className="size-4" />
                لم يُرفق ملف تصميم — اطلبه من العميل عبر واتساب قبل الإنتاج.
              </p>
            ) : null}
          </div>
        </div>
      </AdminCard>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ---------- البنود ---------- */}
        <div className="space-y-6 lg:col-span-2">
          <AdminCard title="بنود الطلب" padded={false}>
            <ul className="divide-border divide-y">
              {order.items.map((item) => {
                const options = (Array.isArray(item.selectedOptions) ? item.selectedOptions : []) as SelectedOption[];
                const files = filesOf(item);

                return (
                  <li key={item.id} className="flex gap-3 p-4 sm:gap-4 sm:p-5">
                    <span className="border-border bg-surface-sunken relative size-16 shrink-0 overflow-hidden rounded-lg border">
                      {item.imageUrl ? (
                        <Image src={item.imageUrl} alt="" fill sizes="64px" className="object-cover" />
                      ) : (
                        <span className="text-primary-300 grid h-full place-items-center">
                          <AdminIcon name="package" className="size-6" strokeWidth={1.4} />
                        </span>
                      )}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-bold">{item.productName}</p>
                        <span className="shrink-0 font-extrabold tabular-nums">
                          {formatPriceWithCurrency(item.lineTotal)}
                        </span>
                      </div>

                      <p className="text-primary-600 mt-1 text-xs">
                        {formatNumber(item.quantity)} × {formatPriceWithCurrency(item.unitPrice)}
                      </p>

                      {options.length > 0 ? (
                        <dl className="mt-2.5 flex flex-wrap gap-1.5 text-xs">
                          {options.map((option) => (
                            <div
                              key={option.key}
                              className="bg-surface-sunken flex gap-1 rounded-md px-2 py-1"
                            >
                              <dt className="text-primary-500">{option.label}:</dt>
                              <dd className="text-primary-900 font-bold">{option.valueLabel}</dd>
                            </div>
                          ))}
                        </dl>
                      ) : null}

                      {item.notes ? (
                        <p className="text-primary-700 mt-2 text-xs">
                          <span className="font-bold">ملاحظات:</span> {item.notes}
                        </p>
                      ) : null}

                      <div className="mt-2.5">
                        {files.length > 0 ? (
                          <ul className="flex flex-wrap gap-2">
                            {files.map((file) => (
                              <li key={file.url}>
                                <a
                                  href={file.url}
                                  className="border-border text-accent-700 hover:bg-accent-50 inline-flex min-h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-bold transition-colors"
                                >
                                  <AdminIcon name="file" className="size-3.5" />
                                  {file.name}
                                </a>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-primary-500 inline-flex items-center gap-1.5 text-xs">
                            <AdminIcon name="file" className="size-3.5" />
                            بلا ملف تصميم
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            <dl className="border-border bg-surface-muted space-y-2 border-t p-4 text-sm sm:p-5">
              <Row label="المجموع الفرعي" value={formatPriceWithCurrency(order.subtotal)} />
              {order.discountAmount > 0 ? (
                <Row
                  label={`الخصم${order.couponCode ? ` (${order.couponCode})` : ""}`}
                  value={`− ${formatPriceWithCurrency(order.discountAmount)}`}
                />
              ) : null}
              <Row label="الشحن" value={formatPriceWithCurrency(order.shippingCost)} />
              <Row label="ضريبة القيمة المضافة" value={formatPriceWithCurrency(order.vatAmount)} />
              <div className="border-border flex justify-between border-t pt-2 text-base font-extrabold">
                <dt>الإجمالي</dt>
                <dd className="tabular-nums">{formatPriceWithCurrency(order.total)}</dd>
              </div>
            </dl>
          </AdminCard>

          {order.notes ? (
            <AdminCard title="ملاحظات العميل">
              <p className="text-primary-800 text-sm leading-relaxed whitespace-pre-line">{order.notes}</p>
            </AdminCard>
          ) : null}
        </div>

        {/* ---------- الجانب ---------- */}
        <div className="space-y-6">
          <AdminCard title="بيانات العميل">
            <dl className="space-y-3">
              <Detail label="الاسم">{order.customerName}</Detail>
              <Detail label="الجوال" ltr>
                {formatPhone(order.customerPhone)}
              </Detail>
              {order.customerEmail ? (
                <Detail label="البريد" ltr>
                  {order.customerEmail}
                </Detail>
              ) : null}
              {order.companyName ? <Detail label="المنشأة">{order.companyName}</Detail> : null}
            </dl>

            <div className="border-border mt-4 grid grid-cols-2 gap-2 border-t pt-4">
              <ButtonLink href={whatsapp} external variant="whatsapp" size="sm" icon="whatsapp">
                واتساب
              </ButtonLink>
              <ButtonLink href={telLink(order.customerPhone)} variant="outline" size="sm" icon="phone">
                اتصال
              </ButtonLink>
            </div>
          </AdminCard>

          <AdminCard title="التسليم والدفع">
            <dl className="space-y-3">
              <Detail label="طريقة الاستلام">
                {FULFILLMENT_LABELS[order.fulfillment as FulfillmentMethod] ?? order.fulfillment}
              </Detail>
              {order.city ? <Detail label="المدينة">{order.city}</Detail> : null}
              {order.district ? <Detail label="الحي">{order.district}</Detail> : null}
              {order.addressLine ? <Detail label="العنوان">{order.addressLine}</Detail> : null}
              {order.postalCode ? (
                <Detail label="الرمز البريدي" ltr>
                  {order.postalCode}
                </Detail>
              ) : null}
              <Detail label="طريقة الدفع">
                {PAYMENT_METHOD_LABELS[order.paymentMethod as PaymentMethod] ?? order.paymentMethod}
              </Detail>
            </dl>
          </AdminCard>

          <AdminCard
            title="تعديل يدوي وملاحظات داخلية"
            description="لتصحيح حالة أو تدوين ملاحظة للفريق."
          >
            <OrderControls
              key={`${order.status}|${order.paymentStatus}|${order.adminNotes ?? ""}`}
              orderId={order.id}
              status={order.status}
              paymentStatus={order.paymentStatus}
              adminNotes={order.adminNotes ?? ""}
            />
          </AdminCard>
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-primary-600 flex justify-between gap-4">
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

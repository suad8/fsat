import Image from "next/image";
import { notFound } from "next/navigation";

import { OrderControls } from "@/app/admin/(dashboard)/orders/[id]/OrderControls";
import { AdminCard, AdminHeading, StatusBadge } from "@/components/admin/AdminUi";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import {
  FULFILLMENT_LABELS,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TONE,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  type FulfillmentMethod,
  type OrderStatus,
  type PaymentMethod,
  type PaymentStatus,
} from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { formatDateTime, formatNumber, formatPriceWithCurrency } from "@/lib/utils";
import { whatsappReferenceUrl } from "@/lib/whatsapp";

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

  return (
    <>
      <AdminHeading
        title={`الطلب ${order.orderNumber}`}
        description={`${order.customerName} — ${formatDateTime(order.createdAt)}`}
        backHref="/admin/orders"
        backLabel="رجوع إلى الطلبات"
        action={
          <ButtonLink
            href={whatsappReferenceUrl(order.orderNumber, "order")}
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
        {/* --- البنود --- */}
        <div className="space-y-6 lg:col-span-2">
          <AdminCard title="بنود الطلب" padded={false}>
            <ul className="divide-border divide-y">
              {order.items.map((item) => {
                const options = (item.selectedOptions ?? []) as SelectedOption[];
                const files = (item.uploadedFiles ?? []) as UploadedFile[];

                return (
                  <li key={item.id} className="flex gap-4 p-5">
                    <span className="border-border bg-surface-sunken relative size-16 shrink-0 overflow-hidden rounded-lg border">
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt=""
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      ) : (
                        <span className="text-primary-300 grid h-full place-items-center">
                          <Icon name="package" className="size-6" strokeWidth={1.4} />
                        </span>
                      )}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="font-bold">{item.productName}</p>

                      {Array.isArray(options) && options.length > 0 ? (
                        <dl className="text-primary-600 mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                          {options.map((option) => (
                            <div key={option.key} className="flex gap-1">
                              <dt className="text-primary-500">{option.label}:</dt>
                              <dd className="font-medium">{option.valueLabel}</dd>
                            </div>
                          ))}
                        </dl>
                      ) : null}

                      {item.notes ? (
                        <p className="text-primary-600 mt-2 text-xs">
                          <span className="font-bold">ملاحظات:</span> {item.notes}
                        </p>
                      ) : null}

                      {Array.isArray(files) && files.length > 0 ? (
                        <ul className="mt-2 flex flex-wrap gap-2">
                          {files.map((file) => (
                            <li key={file.url}>
                              <a
                                href={file.url}
                                className="border-border text-accent-700 hover:bg-accent-50 inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-bold transition-colors"
                              >
                                <Icon name="file" className="size-3.5" />
                                {file.name}
                              </a>
                            </li>
                          ))}
                        </ul>
                      ) : null}

                      <p className="text-primary-500 mt-2 text-xs">
                        {formatNumber(item.quantity)} ×{" "}
                        {formatPriceWithCurrency(item.unitPrice)}
                      </p>
                    </div>

                    <span className="shrink-0 font-bold tabular-nums">
                      {formatPriceWithCurrency(item.lineTotal)}
                    </span>
                  </li>
                );
              })}
            </ul>

            <dl className="border-border bg-surface-muted space-y-2 border-t p-5 text-sm">
              <Row label="المجموع الفرعي" value={formatPriceWithCurrency(order.subtotal)} />
              {order.discountAmount > 0 ? (
                <Row
                  label={`الخصم${order.couponCode ? ` (${order.couponCode})` : ""}`}
                  value={`− ${formatPriceWithCurrency(order.discountAmount)}`}
                />
              ) : null}
              <Row label="الشحن" value={formatPriceWithCurrency(order.shippingCost)} />
              <Row
                label="ضريبة القيمة المضافة"
                value={formatPriceWithCurrency(order.vatAmount)}
              />
              <div className="border-border flex justify-between border-t pt-2 text-base font-bold">
                <dt>الإجمالي</dt>
                <dd className="tabular-nums">{formatPriceWithCurrency(order.total)}</dd>
              </div>
            </dl>
          </AdminCard>

          {order.notes ? (
            <AdminCard title="ملاحظات العميل">
              <p className="text-primary-700 text-sm leading-relaxed whitespace-pre-line">
                {order.notes}
              </p>
            </AdminCard>
          ) : null}
        </div>

        {/* --- الجانب --- */}
        <div className="space-y-6">
          <AdminCard title="حالة الطلب">
            <div className="mb-4 flex flex-wrap gap-2">
              <StatusBadge
                label={ORDER_STATUS_LABELS[order.status as OrderStatus] ?? order.status}
                tone={ORDER_STATUS_TONE[order.status as OrderStatus] ?? ""}
              />
            </div>

            <OrderControls
              orderId={order.id}
              status={order.status}
              paymentStatus={order.paymentStatus}
              adminNotes={order.adminNotes ?? ""}
            />
          </AdminCard>

          <AdminCard title="بيانات العميل">
            <dl className="space-y-3 text-sm">
              <Field label="الاسم" value={order.customerName} />
              <Field label="الجوال" value={order.customerPhone} ltr />
              {order.customerEmail ? (
                <Field label="البريد" value={order.customerEmail} ltr />
              ) : null}
              {order.companyName ? (
                <Field label="المنشأة" value={order.companyName} />
              ) : null}
            </dl>
          </AdminCard>

          <AdminCard title="التسليم والدفع">
            <dl className="space-y-3 text-sm">
              <Field
                label="طريقة الاستلام"
                value={
                  FULFILLMENT_LABELS[order.fulfillment as FulfillmentMethod] ??
                  order.fulfillment
                }
              />
              {order.city ? <Field label="المدينة" value={order.city} /> : null}
              {order.district ? <Field label="الحي" value={order.district} /> : null}
              {order.addressLine ? (
                <Field label="العنوان" value={order.addressLine} />
              ) : null}
              {order.postalCode ? (
                <Field label="الرمز البريدي" value={order.postalCode} ltr />
              ) : null}
              <Field
                label="طريقة الدفع"
                value={
                  PAYMENT_METHOD_LABELS[order.paymentMethod as PaymentMethod] ??
                  order.paymentMethod
                }
              />
              <Field
                label="حالة الدفع"
                value={
                  PAYMENT_STATUS_LABELS[order.paymentStatus as PaymentStatus] ??
                  order.paymentStatus
                }
              />
            </dl>
          </AdminCard>
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-primary-600 flex justify-between">
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

function Field({ label, value, ltr }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div>
      <dt className="text-primary-500 text-xs">{label}</dt>
      <dd className="mt-0.5 font-medium" dir={ltr ? "ltr" : undefined}>
        {value}
      </dd>
    </div>
  );
}

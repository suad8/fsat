import Link from "next/link";
import { notFound } from "next/navigation";

import { PrintButton } from "@/components/admin/ActionButtons";
import { AdminIcon } from "@/components/admin/AdminIcon";
import { adminDate, adminDateTime, formatPhone } from "@/lib/admin/format";
import { firstParam } from "@/lib/admin/url";
import {
  FULFILLMENT_LABELS,
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  type FulfillmentMethod,
  type OrderStatus,
  type PaymentMethod,
  type PaymentStatus,
} from "@/lib/constants";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { cn, formatNumber, formatPriceWithCurrency } from "@/lib/utils";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const metadata = { title: "طباعة الطلب" };

type SelectedOption = { key: string; label: string; valueLabel: string };
type UploadedFile = { name: string; url: string };

const clean = (value: string | null | undefined) =>
  (value ?? "").replace(/\[\[يحتاج استبدال\]\]/g, "").trim();

/**
 * مستند مطبوع: فاتورة للعميل أو أمر إنتاج لقسم التصنيع.
 *
 * الورقة بيضاء بنص أسود دائمًا حتى في الوضع الداكن للوحة (يُطبع على ورق)،
 * وكل ما حول الورقة (الشريط الجانبي والأزرار) يختفي عند الطباعة عبر @media print.
 */
export default async function OrderPrintPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const doc = firstParam((await searchParams).doc) === "production" ? "production" : "invoice";

  const [order, settings] = await Promise.all([
    prisma.order.findUnique({ where: { id }, include: { items: true } }),
    prisma.siteSettings.findUnique({ where: { id: "singleton" } }),
  ]);

  if (!order) notFound();

  const company = {
    name: clean(settings?.companyName) || "المنشأة",
    vat: settings?.vatNumber?.trim() ?? "",
    cr: settings?.crNumber?.trim() ?? "",
    address: [clean(settings?.addressLine), clean(settings?.city)].filter(Boolean).join("، "),
    phone: clean(settings?.phone),
    email: clean(settings?.email),
    vatRate: settings?.vatRate ?? 0.15,
    logo: settings?.logoUrl ?? "",
  };

  const filesOf = (item: (typeof order.items)[number]) =>
    (Array.isArray(item.uploadedFiles) ? item.uploadedFiles : []) as UploadedFile[];
  const optionsOf = (item: (typeof order.items)[number]) =>
    (Array.isArray(item.selectedOptions) ? item.selectedOptions : []) as SelectedOption[];

  return (
    <>
      {/* شريط الشاشة فقط */}
      <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/admin/orders/${order.id}`}
            className="text-primary-600 hover:text-primary-950 inline-flex min-h-9 items-center gap-1 text-sm"
          >
            <AdminIcon name="chevronRight" className="size-4" strokeWidth={2} />
            رجوع إلى الطلب
          </Link>

          <nav aria-label="نوع المستند" className="flex gap-1.5">
            {(
              [
                ["invoice", "الفاتورة"],
                ["production", "أمر الإنتاج"],
              ] as const
            ).map(([key, label]) => (
              <Link
                key={key}
                href={`/admin/orders/${order.id}/print?doc=${key}`}
                aria-current={doc === key ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-9 items-center rounded-full px-4 text-xs font-bold",
                  doc === key
                    ? "bg-primary-950 text-white"
                    : "border-border bg-surface text-primary-700 hover:bg-surface-sunken border",
                )}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        <PrintButton>طباعة {doc === "invoice" ? "الفاتورة" : "أمر الإنتاج"}</PrintButton>
      </div>

      {doc === "invoice" && !company.vat ? (
        <p className="no-print bg-warning-50 text-warning-700 mb-4 flex items-start gap-2 rounded-lg px-4 py-3 text-sm font-bold">
          <AdminIcon name="alert" className="mt-0.5 size-4 shrink-0" />
          <span>
            الرقم الضريبي للمنشأة غير مسجّل، فستُطبع الفاتورة بدونه.{" "}
            <Link href="/admin/settings#sec-legal" className="underline">
              أضفه من بيانات المنشأة
            </Link>
            .
          </span>
        </p>
      ) : null}

      {doc === "invoice" ? (
        <p className="no-print text-primary-500 mb-4 text-xs leading-relaxed">
          نسخة للعميل مبنية على بيانات الطلب. لا تتضمن رمز QR الخاص بالفوترة الإلكترونية
          (هيئة الزكاة والضريبة والجمارك) — استخدم نظام الفوترة المعتمد إن كان مطلوبًا نظامًا.
        </p>
      ) : null}

      <article
        className="adm-doc mx-auto max-w-[210mm] rounded-lg border border-neutral-300 bg-white p-6 text-neutral-900 shadow-sm sm:p-10"
        style={{ colorScheme: "light" }}
      >
        {doc === "invoice" ? (
          <Invoice order={order} company={company} optionsOf={optionsOf} />
        ) : (
          <Production order={order} company={company} optionsOf={optionsOf} filesOf={filesOf} />
        )}
      </article>
    </>
  );
}

type Company = {
  name: string;
  vat: string;
  cr: string;
  address: string;
  phone: string;
  email: string;
  vatRate: number;
  logo: string;
};

type OrderWithItems = Prisma.OrderGetPayload<{ include: { items: true } }>;

function Invoice({
  order,
  company,
  optionsOf,
}: {
  order: OrderWithItems;
  company: Company;
  optionsOf: (item: OrderWithItems["items"][number]) => SelectedOption[];
}) {
  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-6 border-b-2 border-neutral-900 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-neutral-950">{company.name}</h1>
          <dl className="mt-2 space-y-0.5 text-xs text-neutral-700">
            {company.address ? <div>{company.address}</div> : null}
            {company.phone ? (
              <div dir="ltr" className="text-right">
                {company.phone}
              </div>
            ) : null}
            {company.email ? (
              <div dir="ltr" className="text-right">
                {company.email}
              </div>
            ) : null}
            {company.vat ? <div>الرقم الضريبي: <span dir="ltr">{company.vat}</span></div> : null}
            {company.cr ? <div>السجل التجاري: <span dir="ltr">{company.cr}</span></div> : null}
          </dl>
        </div>

        <div className="text-end">
          <p className="text-xl font-extrabold">{company.vat ? "فاتورة ضريبية" : "فاتورة"}</p>
          <dl className="mt-2 space-y-0.5 text-xs text-neutral-700">
            <div>
              رقم الفاتورة: <span className="font-mono font-bold" dir="ltr">{order.orderNumber}</span>
            </div>
            <div>التاريخ: {adminDate(order.createdAt)}</div>
            <div>حالة الدفع: {PAYMENT_STATUS_LABELS[order.paymentStatus as PaymentStatus] ?? order.paymentStatus}</div>
            <div>
              طريقة الدفع: {PAYMENT_METHOD_LABELS[order.paymentMethod as PaymentMethod] ?? order.paymentMethod}
            </div>
          </dl>
        </div>
      </header>

      <section className="mt-5 grid gap-6 text-sm sm:grid-cols-2">
        <div>
          <h2 className="mb-1 text-xs font-bold text-neutral-500">فاتورة إلى</h2>
          <p className="font-bold">{order.customerName}</p>
          {order.companyName ? <p>{order.companyName}</p> : null}
          <p dir="ltr" className="text-right">{formatPhone(order.customerPhone)}</p>
          {order.customerEmail ? <p dir="ltr" className="text-right">{order.customerEmail}</p> : null}
        </div>
        <div>
          <h2 className="mb-1 text-xs font-bold text-neutral-500">التسليم</h2>
          <p>{FULFILLMENT_LABELS[order.fulfillment as FulfillmentMethod] ?? order.fulfillment}</p>
          {order.fulfillment === "DELIVERY" ? (
            <p>
              {[order.city, order.district, order.addressLine].filter(Boolean).join("، ") || "—"}
            </p>
          ) : null}
        </div>
      </section>

      <table className="mt-6 w-full border-collapse text-sm">
        <thead>
          <tr className="bg-neutral-100 text-xs text-neutral-700">
            <th scope="col" className="w-8 border border-neutral-300 px-2 py-2 text-start">#</th>
            <th scope="col" className="border border-neutral-300 px-3 py-2 text-start">الوصف</th>
            <th scope="col" className="w-20 border border-neutral-300 px-2 py-2 text-center">الكمية</th>
            <th scope="col" className="w-28 border border-neutral-300 px-2 py-2 text-start">سعر الوحدة</th>
            <th scope="col" className="w-28 border border-neutral-300 px-2 py-2 text-start">الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item, index) => {
            const options = optionsOf(item);
            return (
              <tr key={item.id} className="align-top">
                <td className="border border-neutral-300 px-2 py-2 tabular-nums">{formatNumber(index + 1)}</td>
                <td className="border border-neutral-300 px-3 py-2">
                  <span className="font-bold">{item.productName}</span>
                  {options.length > 0 ? (
                    <span className="mt-0.5 block text-xs text-neutral-600">
                      {options.map((option) => `${option.label}: ${option.valueLabel}`).join(" · ")}
                    </span>
                  ) : null}
                </td>
                <td className="border border-neutral-300 px-2 py-2 text-center tabular-nums">{formatNumber(item.quantity)}</td>
                <td className="border border-neutral-300 px-2 py-2 tabular-nums">{formatPriceWithCurrency(item.unitPrice)}</td>
                <td className="border border-neutral-300 px-2 py-2 font-bold tabular-nums">{formatPriceWithCurrency(item.lineTotal)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="mt-4 flex justify-end">
        <dl className="w-full max-w-xs space-y-1.5 text-sm">
          <TotalRow label="المجموع الفرعي" value={formatPriceWithCurrency(order.subtotal)} />
          {order.discountAmount > 0 ? (
            <TotalRow
              label={`الخصم${order.couponCode ? ` (${order.couponCode})` : ""}`}
              value={`− ${formatPriceWithCurrency(order.discountAmount)}`}
            />
          ) : null}
          <TotalRow label="الشحن" value={formatPriceWithCurrency(order.shippingCost)} />
          <TotalRow
            label={`ضريبة القيمة المضافة (${formatNumber(Math.round(company.vatRate * 100))}%)`}
            value={formatPriceWithCurrency(order.vatAmount)}
          />
          <div className="flex justify-between border-t-2 border-neutral-900 pt-2 text-base font-extrabold">
            <dt>الإجمالي</dt>
            <dd className="tabular-nums">{formatPriceWithCurrency(order.total)}</dd>
          </div>
        </dl>
      </div>

      {order.notes ? (
        <p className="mt-6 text-xs text-neutral-700">
          <span className="font-bold">ملاحظات العميل:</span> {order.notes}
        </p>
      ) : null}

      <footer className="mt-10 border-t border-neutral-300 pt-3 text-center text-xs text-neutral-500">
        شكرًا لثقتكم — {company.name}
      </footer>
    </>
  );
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-neutral-700">
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

function Production({
  order,
  company,
  optionsOf,
  filesOf,
}: {
  order: OrderWithItems;
  company: Company;
  optionsOf: (item: OrderWithItems["items"][number]) => SelectedOption[];
  filesOf: (item: OrderWithItems["items"][number]) => UploadedFile[];
}) {
  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-neutral-900 pb-4">
        <div>
          <p className="text-xs font-bold text-neutral-500">أمر إنتاج — {company.name}</p>
          <h1 className="mt-1 font-mono text-3xl font-black text-neutral-950" dir="ltr">
            {order.orderNumber}
          </h1>
        </div>
        <dl className="text-end text-xs text-neutral-700">
          <div>تاريخ الطلب: {adminDateTime(order.createdAt)}</div>
          <div>الحالة: {ORDER_STATUS_LABELS[order.status as OrderStatus] ?? order.status}</div>
          <div>
            الاستلام: <span className="font-bold">{FULFILLMENT_LABELS[order.fulfillment as FulfillmentMethod] ?? order.fulfillment}</span>
            {order.city ? ` — ${order.city}` : ""}
          </div>
        </dl>
      </header>

      <section className="mt-4 text-sm">
        <p>
          <span className="text-neutral-500">العميل: </span>
          <span className="font-bold">{order.customerName}</span>
          {order.companyName ? ` — ${order.companyName}` : ""}
          {" · "}
          <span dir="ltr">{formatPhone(order.customerPhone)}</span>
        </p>
      </section>

      <ol className="mt-5 space-y-4">
        {order.items.map((item, index) => {
          const options = optionsOf(item);
          const files = filesOf(item);

          return (
            <li key={item.id} className="break-inside-avoid rounded-md border-2 border-neutral-800 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs text-neutral-500">بند {formatNumber(index + 1)}</p>
                  <p className="text-lg font-extrabold">{item.productName}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-neutral-500">الكمية</p>
                  <p className="text-3xl leading-none font-black tabular-nums">{formatNumber(item.quantity)}</p>
                </div>
              </div>

              {options.length > 0 ? (
                <table className="mt-3 w-full border-collapse text-sm">
                  <tbody>
                    {options.map((option) => (
                      <tr key={option.key}>
                        <th scope="row" className="w-1/3 border border-neutral-300 bg-neutral-100 px-3 py-1.5 text-start text-xs font-bold text-neutral-700">
                          {option.label}
                        </th>
                        <td className="border border-neutral-300 px-3 py-1.5 font-bold">{option.valueLabel}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}

              {item.notes ? (
                <p className="mt-3 text-sm">
                  <span className="font-bold">ملاحظات البند:</span> {item.notes}
                </p>
              ) : null}

              <p className="mt-3 text-sm">
                <span className="font-bold">ملف التصميم: </span>
                {files.length > 0 ? files.map((file) => file.name).join("، ") : "لم يُرفق — تأكّد من العميل قبل الطباعة"}
              </p>
            </li>
          );
        })}
      </ol>

      {order.notes ? (
        <p className="mt-4 text-sm">
          <span className="font-bold">ملاحظات العميل:</span> {order.notes}
        </p>
      ) : null}
      {order.adminNotes ? (
        <p className="mt-2 text-sm">
          <span className="font-bold">ملاحظات داخلية:</span> {order.adminNotes}
        </p>
      ) : null}

      <section className="mt-6 grid gap-3 text-xs sm:grid-cols-4">
        {["تم التجهيز", "الطباعة", "مراقبة الجودة", "التسليم"].map((step) => (
          <div key={step} className="rounded-md border border-neutral-400 px-3 pt-2 pb-8">
            <p className="font-bold">☐ {step}</p>
            <p className="mt-1 text-neutral-500">الاسم / التاريخ:</p>
          </div>
        ))}
      </section>
    </>
  );
}

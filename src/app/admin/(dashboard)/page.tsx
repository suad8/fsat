import Link from "next/link";

import {
  AdminCard,
  AdminEmpty,
  AdminHeading,
  AdminTable,
  StatCard,
  StatusBadge,
  Td,
  Th,
} from "@/components/admin/AdminUi";
import { ButtonLink } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TONE,
  QUOTE_STATUS_LABELS,
  QUOTE_STATUS_TONE,
  type OrderStatus,
  type QuoteStatus,
} from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { formatDateTime, formatPriceWithCurrency } from "@/lib/utils";

export const metadata = { title: "نظرة عامة" };

export default async function AdminDashboard() {
  const [
    orderCount,
    newOrderCount,
    quoteCount,
    newQuoteCount,
    productCount,
    projectCount,
    messageCount,
    pendingTestimonials,
    recentOrders,
    recentQuotes,
    revenue,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { status: "NEW" } }),
    prisma.quoteRequest.count(),
    prisma.quoteRequest.count({ where: { status: "NEW" } }),
    prisma.product.count({ where: { isActive: true } }),
    prisma.project.count({ where: { isActive: true } }),
    prisma.contactMessage.count({ where: { status: "NEW" } }),
    prisma.testimonial.count({ where: { isApproved: false } }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        total: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.quoteRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        reference: true,
        customerName: true,
        productType: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.order.aggregate({
      _sum: { total: true },
      where: { status: { notIn: ["CANCELLED"] } },
    }),
  ]);

  // مهام تحتاج انتباه الإدارة — تُعرض فقط عند وجودها فعلاً
  const attention: { label: string; href: string }[] = [];
  if (newOrderCount > 0)
    attention.push({ label: `${newOrderCount} طلب جديد بانتظار المراجعة`, href: "/admin/orders" });
  if (newQuoteCount > 0)
    attention.push({ label: `${newQuoteCount} طلب عرض سعر جديد`, href: "/admin/quotes" });
  if (messageCount > 0)
    attention.push({ label: `${messageCount} رسالة غير مقروءة`, href: "/admin/messages" });
  if (pendingTestimonials > 0)
    attention.push({
      label: `${pendingTestimonials} تقييم بانتظار الاعتماد`,
      href: "/admin/testimonials",
    });

  return (
    <>
      <AdminHeading
        title="نظرة عامة"
        description="ملخّص نشاط المتجر وأحدث الطلبات وعروض الأسعار."
        action={
          <ButtonLink href="/admin/products/new" size="sm" icon="plus">
            منتج جديد
          </ButtonLink>
        }
      />

      {attention.length > 0 ? (
        <Alert tone="warning" title="يحتاج انتباهك" className="mb-6">
          <ul className="mt-1 space-y-1">
            {attention.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="font-bold underline underline-offset-2">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </Alert>
      ) : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="إجمالي الطلبات"
          value={orderCount}
          icon="cart"
          href="/admin/orders"
          tone="accent"
          hint={newOrderCount > 0 ? `${newOrderCount} جديد` : undefined}
        />
        <StatCard
          label="طلبات عروض الأسعار"
          value={quoteCount}
          icon="document"
          href="/admin/quotes"
          tone="warning"
          hint={newQuoteCount > 0 ? `${newQuoteCount} جديد` : undefined}
        />
        <StatCard
          label="قيمة الطلبات"
          value={formatPriceWithCurrency(revenue._sum.total ?? 0)}
          icon="chart"
          tone="success"
          hint="لا تشمل الطلبات الملغاة"
        />
        <StatCard
          label="المنتجات المنشورة"
          value={productCount}
          icon="package"
          href="/admin/products"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* --- أحدث الطلبات --- */}
        <AdminCard
          title="أحدث الطلبات"
          padded={false}
          action={
            <ButtonLink href="/admin/orders" size="sm" variant="ghost">
              عرض الكل
            </ButtonLink>
          }
        >
          {recentOrders.length === 0 ? (
            <AdminEmpty
              icon="cart"
              title="لا توجد طلبات بعد"
              description="ستظهر هنا الطلبات فور وصولها من الموقع."
            />
          ) : (
            <AdminTable
              caption="أحدث الطلبات"
              head={
                <>
                  <Th>رقم الطلب</Th>
                  <Th>العميل</Th>
                  <Th>الإجمالي</Th>
                  <Th>الحالة</Th>
                  <Th>التاريخ</Th>
                </>
              }
            >
              {recentOrders.map((order) => (
                <tr key={order.id} className="hover:bg-surface-muted transition-colors">
                  <Td>
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="text-accent-700 font-mono text-xs font-bold"
                      dir="ltr"
                    >
                      {order.orderNumber}
                    </Link>
                  </Td>
                  <Td className="font-medium">{order.customerName}</Td>
                  <Td className="tabular-nums">{formatPriceWithCurrency(order.total)}</Td>
                  <Td>
                    <StatusBadge
                      label={ORDER_STATUS_LABELS[order.status as OrderStatus] ?? order.status}
                      tone={ORDER_STATUS_TONE[order.status as OrderStatus] ?? ""}
                    />
                  </Td>
                  <Td className="text-primary-500 text-xs whitespace-nowrap">
                    {formatDateTime(order.createdAt)}
                  </Td>
                </tr>
              ))}
            </AdminTable>
          )}
        </AdminCard>

        {/* --- أحدث عروض الأسعار --- */}
        <AdminCard
          title="أحدث طلبات عروض الأسعار"
          padded={false}
          action={
            <ButtonLink href="/admin/quotes" size="sm" variant="ghost">
              عرض الكل
            </ButtonLink>
          }
        >
          {recentQuotes.length === 0 ? (
            <AdminEmpty
              icon="document"
              title="لا توجد طلبات عروض أسعار"
              description="ستظهر هنا الطلبات الواردة من نموذج عرض السعر."
            />
          ) : (
            <AdminTable
              caption="أحدث طلبات عروض الأسعار"
              head={
                <>
                  <Th>الرقم المرجعي</Th>
                  <Th>العميل</Th>
                  <Th>النوع</Th>
                  <Th>الحالة</Th>
                  <Th>التاريخ</Th>
                </>
              }
            >
              {recentQuotes.map((quote) => (
                <tr key={quote.id} className="hover:bg-surface-muted transition-colors">
                  <Td>
                    <Link
                      href={`/admin/quotes/${quote.id}`}
                      className="text-accent-700 font-mono text-xs font-bold"
                      dir="ltr"
                    >
                      {quote.reference}
                    </Link>
                  </Td>
                  <Td className="font-medium">{quote.customerName}</Td>
                  <Td className="text-primary-600 text-xs">{quote.productType}</Td>
                  <Td>
                    <StatusBadge
                      label={QUOTE_STATUS_LABELS[quote.status as QuoteStatus] ?? quote.status}
                      tone={QUOTE_STATUS_TONE[quote.status as QuoteStatus] ?? ""}
                    />
                  </Td>
                  <Td className="text-primary-500 text-xs whitespace-nowrap">
                    {formatDateTime(quote.createdAt)}
                  </Td>
                </tr>
              ))}
            </AdminTable>
          )}
        </AdminCard>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="أعمال المعرض" value={projectCount} icon="image" href="/admin/portfolio" />
        <StatCard label="رسائل جديدة" value={messageCount} icon="mail" href="/admin/messages" />
        <StatCard
          label="تقييمات بانتظار الاعتماد"
          value={pendingTestimonials}
          icon="star"
          href="/admin/testimonials"
        />
        <StatCard label="بيانات المنشأة" value="إعدادات" icon="settings" href="/admin/settings" />
      </div>
    </>
  );
}

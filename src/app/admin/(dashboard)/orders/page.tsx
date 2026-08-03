import Link from "next/link";

import { AdminCard, AdminEmpty, AdminHeading, AdminTable, StatusBadge, Td, Th } from "@/components/admin/AdminUi";
import { Icon } from "@/components/ui/Icon";
import {
  FULFILLMENT_LABELS,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TONE,
  ORDER_STATUSES,
  PAYMENT_STATUS_LABELS,
  type FulfillmentMethod,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { cn, formatDateTime, formatPriceWithCurrency } from "@/lib/utils";

export const metadata = { title: "الطلبات" };

type SearchParams = Promise<{ status?: string }>;

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { status } = await searchParams;
  const activeStatus =
    status && (ORDER_STATUSES as readonly string[]).includes(status) ? status : undefined;

  const [orders, counts] = await Promise.all([
    prisma.order.findMany({
      where: activeStatus ? { status: activeStatus } : undefined,
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        customerPhone: true,
        city: true,
        fulfillment: true,
        total: true,
        status: true,
        paymentStatus: true,
        createdAt: true,
        _count: { select: { items: true } },
      },
    }),
    prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const countFor = (value: string) =>
    counts.find((entry) => entry.status === value)?._count._all ?? 0;
  const totalCount = counts.reduce((sum, entry) => sum + entry._count._all, 0);

  return (
    <>
      <AdminHeading
        title="الطلبات"
        description="الطلبات الواردة من المتجر — راجعها وحدّث حالتها حتى التسليم."
      />

      {/* فلاتر الحالة */}
      <nav aria-label="تصفية حسب الحالة" className="mb-5">
        <ul className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <li>
            <FilterChip href="/admin/orders" active={!activeStatus}>
              الكل <span className="opacity-70">({totalCount})</span>
            </FilterChip>
          </li>
          {ORDER_STATUSES.map((value) => (
            <li key={value}>
              <FilterChip
                href={`/admin/orders?status=${value}`}
                active={activeStatus === value}
              >
                {ORDER_STATUS_LABELS[value]}{" "}
                <span className="opacity-70">({countFor(value)})</span>
              </FilterChip>
            </li>
          ))}
        </ul>
      </nav>

      <AdminCard padded={false}>
        {orders.length === 0 ? (
          <AdminEmpty
            icon="cart"
            title={activeStatus ? "لا توجد طلبات بهذه الحالة" : "لا توجد طلبات بعد"}
            description={
              activeStatus
                ? "جرّب اختيار حالة أخرى أو اعرض كل الطلبات."
                : "ستظهر هنا الطلبات فور وصولها من الموقع، مع كل تفاصيل المواصفات المختارة."
            }
          />
        ) : (
          <AdminTable
            caption="قائمة الطلبات"
            head={
              <>
                <Th>رقم الطلب</Th>
                <Th>العميل</Th>
                <Th>الاستلام</Th>
                <Th>البنود</Th>
                <Th>الإجمالي</Th>
                <Th>الدفع</Th>
                <Th>الحالة</Th>
                <Th>التاريخ</Th>
              </>
            }
          >
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-surface-muted transition-colors">
                <Td>
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="text-accent-700 hover:text-accent-800 font-mono text-xs font-bold transition-colors"
                    dir="ltr"
                  >
                    {order.orderNumber}
                  </Link>
                </Td>

                <Td>
                  <span className="block font-medium">{order.customerName}</span>
                  <span className="text-primary-400 block font-mono text-[0.7rem]" dir="ltr">
                    {order.customerPhone}
                  </span>
                </Td>

                <Td className="text-primary-600 text-xs whitespace-nowrap">
                  <span className="inline-flex items-center gap-1">
                    <Icon
                      name={order.fulfillment === "PICKUP" ? "location" : "truck"}
                      className="size-3.5"
                      strokeWidth={1.8}
                    />
                    {FULFILLMENT_LABELS[order.fulfillment as FulfillmentMethod] ??
                      order.fulfillment}
                  </span>
                  {order.city ? (
                    <span className="text-primary-400 block">{order.city}</span>
                  ) : null}
                </Td>

                <Td className="text-primary-600 text-center text-sm tabular-nums">
                  {order._count.items}
                </Td>

                <Td className="font-bold tabular-nums whitespace-nowrap">
                  {formatPriceWithCurrency(order.total)}
                </Td>

                <Td className="text-primary-600 text-xs whitespace-nowrap">
                  {PAYMENT_STATUS_LABELS[order.paymentStatus as PaymentStatus] ??
                    order.paymentStatus}
                </Td>

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
    </>
  );
}

function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex rounded-full px-3.5 py-1.5 text-xs font-bold whitespace-nowrap transition-colors",
        "focus-visible:outline-accent-600 focus-visible:outline-2 focus-visible:outline-offset-2",
        active
          ? "bg-primary-950 text-white"
          : "bg-surface text-primary-700 border-border hover:bg-surface-sunken border",
      )}
    >
      {children}
    </Link>
  );
}

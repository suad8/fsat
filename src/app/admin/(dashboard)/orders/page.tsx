import Link from "next/link";

import { AdminIcon } from "@/components/admin/AdminIcon";
import { AdminCard, AdminEmpty, AdminHeading, AdminTable, Td, Th } from "@/components/admin/AdminUi";
import { FilterChip, FilterChips, Pagination } from "@/components/admin/ListParts";
import { ListToolbar } from "@/components/admin/ListToolbar";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/admin/StatusBadges";
import { getOrderFilterIds } from "@/lib/admin/dashboard";
import { adminDateTime, formatPhone, waLink } from "@/lib/admin/format";
import { formatAge } from "@/lib/admin/time";
import { firstParam, hrefWith, normalizeDigits, pageParam, type ParamBag } from "@/lib/admin/url";
import {
  FULFILLMENT_LABELS,
  ORDER_STATUS_LABELS,
  ORDER_STATUSES,
  type FulfillmentMethod,
} from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { formatNumber, formatPriceWithCurrency } from "@/lib/utils";

export const metadata = { title: "الطلبات" };

const PAGE_SIZE = 25;

const SORTS = {
  new: { label: "الأحدث أولاً", orderBy: { createdAt: "desc" } },
  old: { label: "الأقدم أولاً", orderBy: { createdAt: "asc" } },
  total_desc: { label: "الأعلى قيمة", orderBy: { total: "desc" } },
  total_asc: { label: "الأقل قيمة", orderBy: { total: "asc" } },
} as const;

type SortKey = keyof typeof SORTS;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminOrdersPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const statusParam = firstParam(raw.status);
  const status =
    statusParam && (ORDER_STATUSES as readonly string[]).includes(statusParam)
      ? statusParam
      : undefined;
  const filterParam = firstParam(raw.filter);
  const filter = filterParam === "stalled" || filterParam === "nodesign" ? filterParam : undefined;
  const q = firstParam(raw.q);
  const sortParam = firstParam(raw.sort);
  const sort: SortKey = sortParam && sortParam in SORTS ? (sortParam as SortKey) : "new";
  const page = pageParam(raw.page);

  const current: ParamBag = { status, filter, q, sort: sort === "new" ? undefined : sort };

  const [filterIds, counts] = await Promise.all([
    getOrderFilterIds(),
    prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const search = q ? normalizeDigits(q) : undefined;

  const where = {
    ...(status ? { status } : {}),
    ...(filter ? { id: { in: filterIds[filter] } } : {}),
    ...(search
      ? {
          OR: [
            { orderNumber: { contains: search } },
            { customerName: { contains: search } },
            { customerPhone: { contains: search.replace(/^0/, "") } },
            { companyName: { contains: search } },
          ],
        }
      : {}),
  };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: SORTS[sort].orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        customerPhone: true,
        companyName: true,
        city: true,
        fulfillment: true,
        total: true,
        status: true,
        paymentStatus: true,
        createdAt: true,
        _count: { select: { items: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  const countFor = (value: string) => counts.find((entry) => entry.status === value)?._count._all ?? 0;
  const totalCount = counts.reduce((sum, entry) => sum + entry._count._all, 0);
  const filtered = Boolean(status || filter || q);
  const now = new Date();

  return (
    <>
      <AdminHeading
        title="الطلبات"
        description="الطلبات الواردة من المتجر — راجع الملفات، أكّد، أنتج، سلّم."
      />

      <div className="mb-4 space-y-3" data-adm-in>
        <FilterChips label="تصفية حسب الحالة">
          <FilterChip href={hrefWith("/admin/orders", current, { status: undefined, filter: undefined })} active={!status && !filter} count={totalCount}>
            الكل
          </FilterChip>
          {ORDER_STATUSES.map((value) => (
            <FilterChip
              key={value}
              href={hrefWith("/admin/orders", current, { status: value, filter: undefined })}
              active={status === value}
              count={countFor(value)}
              tone={value === "NEW" && countFor(value) > 0 ? "attention" : undefined}
            >
              {ORDER_STATUS_LABELS[value]}
            </FilterChip>
          ))}
          <FilterChip
            href={hrefWith("/admin/orders", current, { filter: "stalled", status: undefined })}
            active={filter === "stalled"}
            count={filterIds.stalled.length}
            tone={filterIds.stalled.length > 0 ? "attention" : undefined}
          >
            راكدة
          </FilterChip>
          <FilterChip
            href={hrefWith("/admin/orders", current, { filter: "nodesign", status: undefined })}
            active={filter === "nodesign"}
            count={filterIds.nodesign.length}
          >
            بلا ملف تصميم
          </FilterChip>
        </FilterChips>

        <ListToolbar
          placeholder="ابحث برقم الطلب أو اسم العميل أو الجوال…"
          defaultSort="new"
          sortOptions={Object.entries(SORTS).map(([value, entry]) => ({ value, label: entry.label }))}
        />
      </div>

      <AdminCard padded={false}>
        {orders.length === 0 ? (
          <AdminEmpty
            icon="cart"
            title={filtered ? "لا طلبات مطابقة" : "لا توجد طلبات بعد"}
            description={
              filtered
                ? "جرّب تعديل البحث أو اختيار حالة أخرى."
                : "ستظهر هنا الطلبات فور وصولها من الموقع، مع كل تفاصيل المواصفات المختارة."
            }
            action={
              filtered ? (
                <Link
                  href="/admin/orders"
                  className="border-border-strong text-primary-800 hover:bg-surface-muted inline-flex min-h-10 items-center rounded-lg border px-4 text-sm font-bold"
                >
                  مسح الفلاتر
                </Link>
              ) : undefined
            }
          />
        ) : (
          <>
            {/* جوال: بطاقات */}
            <ul className="divide-border divide-y md:hidden">
              {orders.map((order) => (
                <li key={order.id} className="relative">
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="hover:bg-surface-muted block px-4 py-3.5 transition-colors"
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span className="min-w-0">
                        <span className="text-accent-700 block font-mono text-xs font-bold" dir="ltr">
                          {order.orderNumber}
                        </span>
                        <span className="mt-0.5 block truncate font-bold">{order.customerName}</span>
                      </span>
                      <OrderStatusBadge status={order.status} />
                    </span>
                    <span className="text-primary-600 mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                      <span className="text-primary-950 text-sm font-extrabold tabular-nums">
                        {formatPriceWithCurrency(order.total)}
                      </span>
                      <span>{formatNumber(order._count.items)} بند</span>
                      <span>{FULFILLMENT_LABELS[order.fulfillment as FulfillmentMethod] ?? order.fulfillment}</span>
                      <span className="text-primary-400 ms-auto">{formatAge(order.createdAt, now)}</span>
                    </span>
                    <span className="mt-2 block">
                      <PaymentStatusBadge status={order.paymentStatus} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>

            {/* سطح المكتب: جدول */}
            <div className="hidden md:block">
              <AdminTable
                caption="قائمة الطلبات"
                head={
                  <>
                    <Th>رقم الطلب</Th>
                    <Th>العميل</Th>
                    <Th>الاستلام</Th>
                    <Th className="text-center">البنود</Th>
                    <Th>الإجمالي</Th>
                    <Th>الدفع</Th>
                    <Th>الحالة</Th>
                    <Th>الوصول</Th>
                    <Th>
                      <span className="sr-only">إجراءات</span>
                    </Th>
                  </>
                }
              >
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-surface-muted transition-colors">
                    <Td>
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="text-accent-700 hover:text-accent-800 font-mono text-xs font-bold whitespace-nowrap hover:underline"
                        dir="ltr"
                      >
                        {order.orderNumber}
                      </Link>
                    </Td>

                    <Td>
                      <span className="block font-bold">{order.customerName}</span>
                      {order.companyName ? (
                        <span className="text-primary-500 block text-[0.7rem]">{order.companyName}</span>
                      ) : null}
                      <span className="text-primary-500 block font-mono text-[0.7rem]" dir="ltr">
                        {formatPhone(order.customerPhone)}
                      </span>
                    </Td>

                    <Td className="text-primary-600 text-xs whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        <AdminIcon
                          name={order.fulfillment === "PICKUP" ? "location" : "truck"}
                          className="size-3.5"
                          strokeWidth={1.8}
                        />
                        {FULFILLMENT_LABELS[order.fulfillment as FulfillmentMethod] ?? order.fulfillment}
                      </span>
                      {order.city ? <span className="text-primary-500 block">{order.city}</span> : null}
                    </Td>

                    <Td className="text-primary-600 text-center tabular-nums">{formatNumber(order._count.items)}</Td>

                    <Td className="font-bold whitespace-nowrap tabular-nums">
                      {formatPriceWithCurrency(order.total)}
                    </Td>

                    <Td>
                      <PaymentStatusBadge status={order.paymentStatus} />
                    </Td>

                    <Td>
                      <OrderStatusBadge status={order.status} />
                    </Td>

                    <Td className="text-xs whitespace-nowrap">
                      <span className="text-primary-800 block font-medium">{formatAge(order.createdAt, now)}</span>
                      <span className="text-primary-500 block">{adminDateTime(order.createdAt)}</span>
                    </Td>

                    <Td>
                      <a
                        href={waLink(order.customerPhone)}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`واتساب ${order.customerName}`}
                        title="واتساب"
                        className="text-primary-500 hover:bg-success-50 hover:text-success-700 grid size-9 place-items-center rounded-lg transition-colors"
                      >
                        <AdminIcon name="whatsapp" className="size-[1.1rem]" />
                      </a>
                    </Td>
                  </tr>
                ))}
              </AdminTable>
            </div>

            <Pagination base="/admin/orders" params={current} page={page} pageSize={PAGE_SIZE} total={total} />
          </>
        )}
      </AdminCard>
    </>
  );
}

import Link from "next/link";

import { AdminIcon } from "@/components/admin/AdminIcon";
import { AdminCard, AdminEmpty, AdminHeading, AdminTable, Td, Th } from "@/components/admin/AdminUi";
import { Pagination } from "@/components/admin/ListParts";
import { ListToolbar } from "@/components/admin/ListToolbar";
import { adminDate, formatPhone, telLink, waLink } from "@/lib/admin/format";
import { formatAge } from "@/lib/admin/time";
import { firstParam, normalizeDigits, pageParam, type ParamBag } from "@/lib/admin/url";
import { prisma } from "@/lib/prisma";
import { formatNumber, formatPriceWithCurrency } from "@/lib/utils";

export const metadata = { title: "العملاء" };

const PAGE_SIZE = 25;
/** سقف الجلب: الترتيب بالإنفاق يتم في الذاكرة لأن Prisma لا يرتّب بمجموع علاقة. */
const FETCH_LIMIT = 1000;

const SORTS = {
  recent: "آخر طلب",
  spend: "الأعلى إنفاقًا",
  orders: "الأكثر طلبات",
  newest: "الأحدث تسجيلاً",
} as const;

type SortKey = keyof typeof SORTS;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminCustomersPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const q = firstParam(raw.q);
  const sortParam = firstParam(raw.sort);
  const sort: SortKey = sortParam && sortParam in SORTS ? (sortParam as SortKey) : "recent";
  const page = pageParam(raw.page);
  const search = q ? normalizeDigits(q) : undefined;

  const customers = await prisma.customer.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search } },
            { phone: { contains: search.replace(/^0/, "") } },
            { companyName: { contains: search } },
            { email: { contains: search } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: FETCH_LIMIT,
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      companyName: true,
      city: true,
      createdAt: true,
      orders: { select: { total: true, status: true, createdAt: true } },
    },
  });

  const rows = customers.map((customer) => {
    // الطلبات الملغاة لا تُحتسب في إجمالي مشتريات العميل
    const active = customer.orders.filter((order) => order.status !== "CANCELLED");
    const lastOrder = active.reduce<Date | null>(
      (latest, order) => (!latest || order.createdAt > latest ? order.createdAt : latest),
      null,
    );

    return {
      ...customer,
      orderCount: active.length,
      lifetime: active.reduce((sum, order) => sum + order.total, 0),
      lastOrder,
    };
  });

  rows.sort((a, b) => {
    switch (sort) {
      case "spend":
        return b.lifetime - a.lifetime;
      case "orders":
        return b.orderCount - a.orderCount;
      case "newest":
        return b.createdAt.getTime() - a.createdAt.getTime();
      default:
        return (b.lastOrder?.getTime() ?? 0) - (a.lastOrder?.getTime() ?? 0);
    }
  });

  const total = rows.length;
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const current: ParamBag = { q, sort: sort === "recent" ? undefined : sort };
  const now = new Date();

  const repeatBadge = (count: number) =>
    count >= 2 ? (
      <span className="bg-success-50 text-success-700 ring-success-500/25 rounded-full px-2 py-0.5 text-[0.68rem] font-bold ring-1 ring-inset">
        عميل متكرر
      </span>
    ) : null;

  return (
    <>
      <AdminHeading
        title="العملاء"
        description="يُنشأ سجل العميل تلقائيًا عند أول طلب، ويُربط برقم الجوال. العملاء المتكررون أهم من الجدد — تواصل معهم."
      />

      <div className="mb-4" data-adm-in>
        <ListToolbar
          placeholder="ابحث بالاسم أو الجوال أو المنشأة…"
          defaultSort="recent"
          sortOptions={Object.entries(SORTS).map(([value, label]) => ({ value, label }))}
        />
      </div>

      <AdminCard padded={false}>
        {pageRows.length === 0 ? (
          <AdminEmpty
            icon="users"
            title={q ? "لا عملاء مطابقون" : "لا يوجد عملاء بعد"}
            description={
              q
                ? "جرّب الاسم أو آخر خانات الجوال."
                : "سيُضاف العميل تلقائيًا عند إتمام أول طلب من الموقع."
            }
            action={
              q ? (
                <Link
                  href="/admin/customers"
                  className="border-border-strong text-primary-800 hover:bg-surface-muted inline-flex min-h-10 items-center rounded-lg border px-4 text-sm font-bold"
                >
                  مسح البحث
                </Link>
              ) : undefined
            }
          />
        ) : (
          <>
            <ul className="divide-border divide-y md:hidden">
              {pageRows.map((customer) => (
                <li key={customer.id} className="px-4 py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 font-bold">
                        {customer.name}
                        {repeatBadge(customer.orderCount)}
                      </p>
                      {customer.companyName ? <p className="text-primary-500 text-xs">{customer.companyName}</p> : null}
                      <p className="text-primary-600 mt-0.5 font-mono text-xs" dir="ltr">
                        {formatPhone(customer.phone)}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <a
                        href={waLink(customer.phone)}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`واتساب ${customer.name}`}
                        className="bg-success-50 text-success-700 grid size-10 place-items-center rounded-lg"
                      >
                        <AdminIcon name="whatsapp" className="size-5" />
                      </a>
                      <a
                        href={telLink(customer.phone)}
                        aria-label={`اتصال بـ ${customer.name}`}
                        className="border-border text-primary-700 grid size-10 place-items-center rounded-lg border"
                      >
                        <AdminIcon name="phone" className="size-5" />
                      </a>
                    </div>
                  </div>
                  <p className="text-primary-600 mt-2 text-xs">
                    <strong className="text-primary-950 tabular-nums">{formatPriceWithCurrency(customer.lifetime)}</strong>
                    {" · "}
                    {formatNumber(customer.orderCount)} طلب
                    {customer.lastOrder ? ` · آخر طلب ${formatAge(customer.lastOrder, now)}` : ""}
                  </p>
                </li>
              ))}
            </ul>

            <div className="hidden md:block">
              <AdminTable
                caption="قائمة العملاء"
                head={
                  <>
                    <Th>العميل</Th>
                    <Th>الجوال</Th>
                    <Th>المنشأة</Th>
                    <Th>المدينة</Th>
                    <Th className="text-center">الطلبات</Th>
                    <Th>إجمالي المشتريات</Th>
                    <Th>آخر طلب</Th>
                    <Th>
                      <span className="sr-only">إجراءات</span>
                    </Th>
                  </>
                }
              >
                {pageRows.map((customer) => (
                  <tr key={customer.id} className="hover:bg-surface-muted transition-colors">
                    <Td>
                      <span className="flex flex-wrap items-center gap-2 font-bold">
                        {customer.name}
                        {repeatBadge(customer.orderCount)}
                      </span>
                      {customer.email ? (
                        <span className="text-primary-500 block text-[0.7rem]" dir="ltr">
                          {customer.email}
                        </span>
                      ) : null}
                      <span className="text-primary-400 block text-[0.68rem]">منذ {adminDate(customer.createdAt)}</span>
                    </Td>

                    <Td>
                      <a
                        href={telLink(customer.phone)}
                        className="text-accent-700 hover:text-accent-800 inline-flex items-center gap-1.5 font-mono text-xs font-bold hover:underline"
                        dir="ltr"
                      >
                        <AdminIcon name="phone" className="size-3.5" strokeWidth={1.8} />
                        {formatPhone(customer.phone)}
                      </a>
                    </Td>

                    <Td className="text-primary-700 text-sm">{customer.companyName ?? "—"}</Td>
                    <Td className="text-primary-700 text-sm">{customer.city ?? "—"}</Td>
                    <Td className="text-center text-sm font-bold tabular-nums">{formatNumber(customer.orderCount)}</Td>
                    <Td className="text-sm font-bold whitespace-nowrap tabular-nums">
                      {formatPriceWithCurrency(customer.lifetime)}
                    </Td>
                    <Td className="text-primary-600 text-xs whitespace-nowrap">
                      {customer.lastOrder ? formatAge(customer.lastOrder, now) : "—"}
                    </Td>
                    <Td>
                      <a
                        href={waLink(customer.phone)}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`واتساب ${customer.name}`}
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

            <Pagination base="/admin/customers" params={current} page={page} pageSize={PAGE_SIZE} total={total} />
          </>
        )}
      </AdminCard>

      {total >= FETCH_LIMIT ? (
        <p className="text-primary-500 mt-3 text-xs">
          عُرض أحدث {formatNumber(FETCH_LIMIT)} عميل فقط — استخدم البحث للوصول إلى الباقين.
        </p>
      ) : null}
    </>
  );
}

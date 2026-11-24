import Link from "next/link";

import { AdminIcon } from "@/components/admin/AdminIcon";
import { AdminCard, AdminEmpty, AdminHeading, AdminTable, Td, Th } from "@/components/admin/AdminUi";
import { FilterChip, FilterChips, Pagination } from "@/components/admin/ListParts";
import { ListToolbar } from "@/components/admin/ListToolbar";
import { AgePill, QuoteStatusBadge } from "@/components/admin/StatusBadges";
import { adminDate, adminDateTime, formatPhone, waLink } from "@/lib/admin/format";
import { quoteWhatsAppMessage } from "@/lib/admin/messages";
import { DAY_MS, ageHours, formatAge, startOfRiyadhDay, urgencyForAge } from "@/lib/admin/time";
import { firstParam, hrefWith, normalizeDigits, pageParam, type ParamBag } from "@/lib/admin/url";
import { QUOTE_STATUS_LABELS, QUOTE_STATUSES } from "@/lib/constants";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { formatNumber, formatPriceWithCurrency } from "@/lib/utils";

export const metadata = { title: "عروض الأسعار" };

const PAGE_SIZE = 25;

const SORTS = {
  new: { label: "الأحدث أولاً", orderBy: { createdAt: "desc" } },
  old: { label: "الأقدم أولاً (الأولى بالرد)", orderBy: { createdAt: "asc" } },
  due: { label: "الأقرب موعد تسليم", orderBy: { dueDate: "asc" } },
  amount_desc: { label: "الأعلى قيمة عرض", orderBy: { quotedAmount: "desc" } },
} as const;

type SortKey = keyof typeof SORTS;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminQuotesPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const statusParam = firstParam(raw.status);
  const status =
    statusParam && (QUOTE_STATUSES as readonly string[]).includes(statusParam) ? statusParam : undefined;
  const filterParam = firstParam(raw.filter);
  const filter =
    filterParam === "waiting" || filterParam === "overdue" || filterParam === "stale"
      ? filterParam
      : undefined;
  const q = firstParam(raw.q);
  const sortParam = firstParam(raw.sort);
  const sort: SortKey = sortParam && sortParam in SORTS ? (sortParam as SortKey) : filter === "waiting" ? "old" : "new";
  const defaultSort: SortKey = filter === "waiting" ? "old" : "new";
  const page = pageParam(raw.page);

  const now = new Date();
  const todayStart = startOfRiyadhDay(now);
  const staleBefore = new Date(now.getTime() - 3 * DAY_MS);

  const filterWhere: Record<"waiting" | "overdue" | "stale", Prisma.QuoteRequestWhereInput> = {
    waiting: { status: { in: ["NEW", "IN_REVIEW"] } },
    overdue: { status: { in: ["NEW", "IN_REVIEW", "QUOTED"] }, dueDate: { lt: todayStart } },
    stale: { status: "QUOTED", updatedAt: { lt: staleBefore } },
  };

  const search = q ? normalizeDigits(q) : undefined;

  const where: Prisma.QuoteRequestWhereInput = {
    ...(filter ? filterWhere[filter] : status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { reference: { contains: search } },
            { customerName: { contains: search } },
            { companyName: { contains: search } },
            { phone: { contains: search.replace(/^0/, "") } },
            { productType: { contains: search } },
          ],
        }
      : {}),
  };

  const current: ParamBag = { status, filter, q, sort: sort === defaultSort ? undefined : sort };

  const [quotes, total, counts, waitingCount, overdueCount, staleCount] = await Promise.all([
    prisma.quoteRequest.findMany({
      where,
      orderBy: SORTS[sort].orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        reference: true,
        customerName: true,
        companyName: true,
        phone: true,
        city: true,
        productType: true,
        quantity: true,
        status: true,
        quotedAmount: true,
        dueDate: true,
        createdAt: true,
        attachments: true,
      },
    }),
    prisma.quoteRequest.count({ where }),
    prisma.quoteRequest.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.quoteRequest.count({ where: filterWhere.waiting }),
    prisma.quoteRequest.count({ where: filterWhere.overdue }),
    prisma.quoteRequest.count({ where: filterWhere.stale }),
  ]);

  const countFor = (value: string) => counts.find((entry) => entry.status === value)?._count._all ?? 0;
  const totalCount = counts.reduce((sum, entry) => sum + entry._count._all, 0);
  const filtered = Boolean(status || filter || q);

  return (
    <>
      <AdminHeading
        title="عروض الأسعار"
        description="طلبات التسعير الواردة من النموذج — راجع الملفات، أرسل العرض، تابع الحسم."
      />

      <div className="mb-4 space-y-3" data-adm-in>
        <FilterChips label="تصفية حسب الحالة">
          <FilterChip href={hrefWith("/admin/quotes", current, { status: undefined, filter: undefined })} active={!status && !filter} count={totalCount}>
            الكل
          </FilterChip>
          <FilterChip
            href={hrefWith("/admin/quotes", current, { filter: "waiting", status: undefined })}
            active={filter === "waiting"}
            count={waitingCount}
            tone={waitingCount > 0 ? "attention" : undefined}
          >
            بانتظار ردّي
          </FilterChip>
          {QUOTE_STATUSES.map((value) => (
            <FilterChip
              key={value}
              href={hrefWith("/admin/quotes", current, { status: value, filter: undefined })}
              active={status === value && !filter}
              count={countFor(value)}
            >
              {QUOTE_STATUS_LABELS[value]}
            </FilterChip>
          ))}
          <FilterChip
            href={hrefWith("/admin/quotes", current, { filter: "overdue", status: undefined })}
            active={filter === "overdue"}
            count={overdueCount}
            tone={overdueCount > 0 ? "attention" : undefined}
          >
            تجاوزت الموعد
          </FilterChip>
          <FilterChip
            href={hrefWith("/admin/quotes", current, { filter: "stale", status: undefined })}
            active={filter === "stale"}
            count={staleCount}
          >
            بلا حسم +٣ أيام
          </FilterChip>
        </FilterChips>

        <ListToolbar
          placeholder="ابحث بالرقم المرجعي أو العميل أو الجوال أو المنتج…"
          defaultSort={defaultSort}
          sortOptions={Object.entries(SORTS).map(([value, entry]) => ({ value, label: entry.label }))}
        />
      </div>

      <AdminCard padded={false}>
        {quotes.length === 0 ? (
          <AdminEmpty
            icon="document"
            title={filtered ? "لا طلبات مطابقة" : "لا توجد طلبات عروض أسعار بعد"}
            description={
              filtered
                ? "جرّب تعديل البحث أو اختيار حالة أخرى."
                : "ستظهر هنا الطلبات الواردة من نموذج عرض السعر بمرفقاتها."
            }
            action={
              filtered ? (
                <Link
                  href="/admin/quotes"
                  className="border-border-strong text-primary-800 hover:bg-surface-muted inline-flex min-h-10 items-center rounded-lg border px-4 text-sm font-bold"
                >
                  مسح الفلاتر
                </Link>
              ) : undefined
            }
          />
        ) : (
          <>
            <ul className="divide-border divide-y md:hidden">
              {quotes.map((quote) => {
                const waiting = quote.status === "NEW" || quote.status === "IN_REVIEW";
                const attachments = Array.isArray(quote.attachments) ? quote.attachments.length : 0;

                return (
                  <li key={quote.id}>
                    <Link href={`/admin/quotes/${quote.id}`} className="hover:bg-surface-muted block px-4 py-3.5 transition-colors">
                      <span className="flex items-start justify-between gap-3">
                        <span className="min-w-0">
                          <span className="text-accent-700 block font-mono text-xs font-bold" dir="ltr">
                            {quote.reference}
                          </span>
                          <span className="mt-0.5 block truncate font-bold">{quote.customerName}</span>
                        </span>
                        <QuoteStatusBadge status={quote.status} />
                      </span>
                      <span className="text-primary-600 mt-1.5 block truncate text-xs">{quote.productType}</span>
                      <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
                        {quote.quotedAmount !== null ? (
                          <span className="text-primary-950 text-sm font-extrabold tabular-nums">
                            {formatPriceWithCurrency(quote.quotedAmount)}
                          </span>
                        ) : null}
                        {attachments > 0 ? (
                          <span className="text-primary-600 inline-flex items-center gap-1">
                            <AdminIcon name="file" className="size-3.5" />
                            {formatNumber(attachments)} مرفق
                          </span>
                        ) : null}
                        {waiting ? (
                          <AgePill label={formatAge(quote.createdAt, now)} urgency={urgencyForAge(ageHours(quote.createdAt, now))} />
                        ) : (
                          <span className="text-primary-400">{formatAge(quote.createdAt, now)}</span>
                        )}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>

            <div className="hidden md:block">
              <AdminTable
                caption="قائمة طلبات عروض الأسعار"
                head={
                  <>
                    <Th>الرقم المرجعي</Th>
                    <Th>العميل</Th>
                    <Th>الطلب</Th>
                    <Th>موعد التسليم</Th>
                    <Th className="text-center">المرفقات</Th>
                    <Th>قيمة العرض</Th>
                    <Th>الحالة</Th>
                    <Th>الانتظار</Th>
                    <Th>
                      <span className="sr-only">إجراءات</span>
                    </Th>
                  </>
                }
              >
                {quotes.map((quote) => {
                  const waiting = quote.status === "NEW" || quote.status === "IN_REVIEW";
                  const attachments = Array.isArray(quote.attachments) ? quote.attachments.length : 0;
                  const overdue =
                    quote.dueDate && quote.dueDate < todayStart && quote.status !== "WON" && quote.status !== "LOST";

                  return (
                    <tr key={quote.id} className="hover:bg-surface-muted transition-colors">
                      <Td>
                        <Link
                          href={`/admin/quotes/${quote.id}`}
                          className="text-accent-700 hover:text-accent-800 font-mono text-xs font-bold whitespace-nowrap hover:underline"
                          dir="ltr"
                        >
                          {quote.reference}
                        </Link>
                      </Td>

                      <Td>
                        <span className="block font-bold">{quote.customerName}</span>
                        {quote.companyName ? <span className="text-primary-500 block text-[0.7rem]">{quote.companyName}</span> : null}
                        <span className="text-primary-500 block font-mono text-[0.7rem]" dir="ltr">
                          {formatPhone(quote.phone)}
                        </span>
                      </Td>

                      <Td className="max-w-52 text-xs">
                        <span className="text-primary-900 line-clamp-2 font-medium">{quote.productType}</span>
                        <span className="text-primary-500 block">
                          {quote.quantity ? `الكمية: ${quote.quantity}` : ""}
                          {quote.quantity && quote.city ? " · " : ""}
                          {quote.city}
                        </span>
                      </Td>

                      <Td className="text-xs whitespace-nowrap">
                        {quote.dueDate ? (
                          <span className={overdue ? "text-danger-700 font-bold" : "text-primary-700"}>
                            {adminDate(quote.dueDate)}
                            {overdue ? <span className="block">تجاوز الموعد</span> : null}
                          </span>
                        ) : (
                          <span className="text-primary-400">—</span>
                        )}
                      </Td>

                      <Td className="text-primary-600 text-center text-xs tabular-nums">
                        {attachments > 0 ? formatNumber(attachments) : "—"}
                      </Td>

                      <Td className="text-sm font-bold whitespace-nowrap tabular-nums">
                        {quote.quotedAmount !== null ? formatPriceWithCurrency(quote.quotedAmount) : "—"}
                      </Td>

                      <Td>
                        <QuoteStatusBadge status={quote.status} />
                      </Td>

                      <Td className="text-xs whitespace-nowrap">
                        {waiting ? (
                          <AgePill label={formatAge(quote.createdAt, now)} urgency={urgencyForAge(ageHours(quote.createdAt, now))} />
                        ) : (
                          <span className="text-primary-500">{adminDateTime(quote.createdAt)}</span>
                        )}
                      </Td>

                      <Td>
                        <a
                          href={waLink(
                            quote.phone,
                            quoteWhatsAppMessage({
                              reference: quote.reference,
                              customerName: quote.customerName,
                              productType: quote.productType,
                              status: quote.status,
                              quotedAmount: quote.quotedAmount,
                            }),
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`واتساب ${quote.customerName}`}
                          title="واتساب برسالة جاهزة"
                          className="text-primary-500 hover:bg-success-50 hover:text-success-700 grid size-9 place-items-center rounded-lg transition-colors"
                        >
                          <AdminIcon name="whatsapp" className="size-[1.1rem]" />
                        </a>
                      </Td>
                    </tr>
                  );
                })}
              </AdminTable>
            </div>

            <Pagination base="/admin/quotes" params={current} page={page} pageSize={PAGE_SIZE} total={total} />
          </>
        )}
      </AdminCard>
    </>
  );
}

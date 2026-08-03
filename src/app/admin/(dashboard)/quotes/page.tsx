import Link from "next/link";

import {
  AdminCard,
  AdminEmpty,
  AdminHeading,
  AdminTable,
  StatusBadge,
  Td,
  Th,
} from "@/components/admin/AdminUi";
import {
  QUOTE_STATUS_LABELS,
  QUOTE_STATUS_TONE,
  QUOTE_STATUSES,
  type QuoteStatus,
} from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { cn, formatDateTime, formatPriceWithCurrency } from "@/lib/utils";

export const metadata = { title: "طلبات عروض الأسعار" };

type SearchParams = Promise<{ status?: string }>;

export default async function AdminQuotesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { status } = await searchParams;
  const activeStatus =
    status && (QUOTE_STATUSES as readonly string[]).includes(status) ? status : undefined;

  const [quotes, counts] = await Promise.all([
    prisma.quoteRequest.findMany({
      where: activeStatus ? { status: activeStatus } : undefined,
      orderBy: { createdAt: "desc" },
      take: 200,
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
        createdAt: true,
        attachments: true,
      },
    }),
    prisma.quoteRequest.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const countFor = (value: string) =>
    counts.find((entry) => entry.status === value)?._count._all ?? 0;
  const totalCount = counts.reduce((sum, entry) => sum + entry._count._all, 0);

  return (
    <>
      <AdminHeading
        title="طلبات عروض الأسعار"
        description="الطلبات الواردة من نموذج عرض السعر — راجع المواصفات وأرسل العرض."
      />

      <nav aria-label="تصفية حسب الحالة" className="mb-5">
        <ul className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <li>
            <FilterChip href="/admin/quotes" active={!activeStatus}>
              الكل <span className="opacity-70">({totalCount})</span>
            </FilterChip>
          </li>
          {QUOTE_STATUSES.map((value) => (
            <li key={value}>
              <FilterChip
                href={`/admin/quotes?status=${value}`}
                active={activeStatus === value}
              >
                {QUOTE_STATUS_LABELS[value]}{" "}
                <span className="opacity-70">({countFor(value)})</span>
              </FilterChip>
            </li>
          ))}
        </ul>
      </nav>

      <AdminCard padded={false}>
        {quotes.length === 0 ? (
          <AdminEmpty
            icon="document"
            title={
              activeStatus ? "لا توجد طلبات بهذه الحالة" : "لا توجد طلبات عروض أسعار بعد"
            }
            description={
              activeStatus
                ? "جرّب اختيار حالة أخرى أو اعرض كل الطلبات."
                : "ستظهر هنا الطلبات الواردة من نموذج عرض السعر بمرفقاتها."
            }
          />
        ) : (
          <AdminTable
            caption="قائمة طلبات عروض الأسعار"
            head={
              <>
                <Th>الرقم المرجعي</Th>
                <Th>العميل</Th>
                <Th>النوع</Th>
                <Th>الكمية</Th>
                <Th>المدينة</Th>
                <Th>المرفقات</Th>
                <Th>قيمة العرض</Th>
                <Th>الحالة</Th>
                <Th>التاريخ</Th>
              </>
            }
          >
            {quotes.map((quote) => {
              const attachments = Array.isArray(quote.attachments)
                ? (quote.attachments as unknown[]).length
                : 0;

              return (
                <tr key={quote.id} className="hover:bg-surface-muted transition-colors">
                  <Td>
                    <Link
                      href={`/admin/quotes/${quote.id}`}
                      className="text-accent-700 hover:text-accent-800 font-mono text-xs font-bold transition-colors"
                      dir="ltr"
                    >
                      {quote.reference}
                    </Link>
                  </Td>

                  <Td>
                    <span className="block font-medium">{quote.customerName}</span>
                    {quote.companyName ? (
                      <span className="text-primary-400 block text-[0.7rem]">
                        {quote.companyName}
                      </span>
                    ) : null}
                    <span className="text-primary-400 block font-mono text-[0.7rem]" dir="ltr">
                      {quote.phone}
                    </span>
                  </Td>

                  <Td className="text-primary-600 max-w-40 text-xs">
                    <span className="line-clamp-2">{quote.productType}</span>
                  </Td>

                  <Td className="text-primary-600 text-xs whitespace-nowrap">
                    {quote.quantity ?? "—"}
                  </Td>

                  <Td className="text-primary-600 text-xs whitespace-nowrap">{quote.city}</Td>

                  <Td className="text-primary-600 text-center text-xs tabular-nums">
                    {attachments > 0 ? attachments : "—"}
                  </Td>

                  <Td className="text-sm font-bold tabular-nums whitespace-nowrap">
                    {quote.quotedAmount !== null
                      ? formatPriceWithCurrency(quote.quotedAmount)
                      : "—"}
                  </Td>

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
              );
            })}
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

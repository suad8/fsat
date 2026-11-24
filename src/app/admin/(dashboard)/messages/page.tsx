import Link from "next/link";

import { MessagesList } from "@/app/admin/(dashboard)/messages/MessagesList";
import { AdminCard, AdminEmpty, AdminHeading } from "@/components/admin/AdminUi";
import { FilterChip, FilterChips, Pagination } from "@/components/admin/ListParts";
import { ListToolbar } from "@/components/admin/ListToolbar";
import { firstParam, hrefWith, normalizeDigits, pageParam, type ParamBag } from "@/lib/admin/url";
import { MESSAGE_STATUS_LABELS, MESSAGE_STATUSES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "رسائل الموقع" };

const PAGE_SIZE = 30;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminMessagesPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const statusParam = firstParam(raw.status);
  const status =
    statusParam && (MESSAGE_STATUSES as readonly string[]).includes(statusParam) ? statusParam : undefined;
  const q = firstParam(raw.q);
  const oldestFirst = firstParam(raw.sort) === "old";
  const page = pageParam(raw.page);

  const search = q ? normalizeDigits(q) : undefined;
  const current: ParamBag = { status, q, sort: oldestFirst ? "old" : undefined };

  const where = {
    // الأرشيف لا يظهر في «الكل» — الصندوق الوارد يبقى نظيفًا
    ...(status ? { status } : { status: { not: "ARCHIVED" } }),
    ...(search
      ? {
          OR: [
            { name: { contains: search } },
            { phone: { contains: search.replace(/^0/, "") } },
            { subject: { contains: search } },
            { message: { contains: search } },
          ],
        }
      : {}),
  };

  const [messages, total, counts] = await Promise.all([
    prisma.contactMessage.findMany({
      where,
      orderBy: { createdAt: oldestFirst ? "asc" : "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.contactMessage.count({ where }),
    prisma.contactMessage.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const countFor = (value: string) => counts.find((entry) => entry.status === value)?._count._all ?? 0;
  const inboxCount = counts.filter((entry) => entry.status !== "ARCHIVED").reduce((sum, entry) => sum + entry._count._all, 0);
  const unread = countFor("NEW");
  const filtered = Boolean(status || q);

  return (
    <>
      <AdminHeading
        title="رسائل الموقع"
        description={
          unread > 0
            ? `${unread} رسالة غير مقروءة من نموذج «اتصل بنا».`
            : "الرسائل الواردة من نموذج «اتصل بنا»."
        }
      />

      <div className="mb-4 space-y-3" data-adm-in>
        <FilterChips label="تصفية حسب الحالة">
          <FilterChip href={hrefWith("/admin/messages", current, { status: undefined })} active={!status} count={inboxCount}>
            الوارد
          </FilterChip>
          {MESSAGE_STATUSES.map((value) => (
            <FilterChip
              key={value}
              href={hrefWith("/admin/messages", current, { status: value })}
              active={status === value}
              count={countFor(value)}
              tone={value === "NEW" && countFor(value) > 0 ? "attention" : undefined}
            >
              {MESSAGE_STATUS_LABELS[value]}
            </FilterChip>
          ))}
        </FilterChips>

        <ListToolbar
          placeholder="ابحث بالاسم أو الجوال أو نص الرسالة…"
          defaultSort="new"
          sortOptions={[
            { value: "new", label: "الأحدث أولاً" },
            { value: "old", label: "الأقدم أولاً" },
          ]}
        />
      </div>

      {messages.length === 0 ? (
        <AdminCard padded={false}>
          <AdminEmpty
            icon="mail"
            title={filtered ? "لا رسائل مطابقة" : "لا توجد رسائل بعد"}
            description={
              filtered
                ? "جرّب تعديل البحث أو اختيار حالة أخرى."
                : "ستظهر هنا الرسائل الواردة من نموذج التواصل في الموقع."
            }
            action={
              filtered ? (
                <Link
                  href="/admin/messages"
                  className="border-border-strong text-primary-800 hover:bg-surface-muted inline-flex min-h-10 items-center rounded-lg border px-4 text-sm font-bold"
                >
                  مسح الفلاتر
                </Link>
              ) : undefined
            }
          />
        </AdminCard>
      ) : (
        <>
          <MessagesList messages={messages} nowIso={new Date().toISOString()} />
          <div className="border-border bg-surface mt-3 overflow-hidden rounded-xl border shadow-sm empty:hidden">
            <Pagination base="/admin/messages" params={current} page={page} pageSize={PAGE_SIZE} total={total} />
          </div>
        </>
      )}
    </>
  );
}

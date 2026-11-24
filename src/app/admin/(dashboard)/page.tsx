import Link from "next/link";

import { ActivityChart } from "@/components/admin/ActivityChart";
import { AdminIcon, type AdminIconName } from "@/components/admin/AdminIcon";
import { CountUp } from "@/components/admin/AdminMotion";
import { AdminCard, AdminEmpty, AdminHeading } from "@/components/admin/AdminUi";
import {
  AgePill,
  MessageStatusBadge,
  OrderStatusBadge,
  QuoteStatusBadge,
} from "@/components/admin/StatusBadges";
import { ButtonLink } from "@/components/ui/Button";
import { getDashboardData, type FeedItem } from "@/lib/admin/dashboard";
import { adminLongDay } from "@/lib/admin/format";
import { ageHours, formatAge, urgencyForAge } from "@/lib/admin/time";
import { cn, formatNumber, formatPriceWithCurrency } from "@/lib/utils";

export const metadata = { title: "لوحة المعلومات" };

export default async function AdminDashboard() {
  const data = await getDashboardData();
  const now = data.generatedAt;

  const needsAction =
    data.orders.newCount +
    data.quotes.waitingCount +
    data.messages.unreadCount +
    data.orders.stalledCount;

  return (
    <>
      <AdminHeading
        title="لوحة المعلومات"
        description={
          needsAction > 0
            ? `${adminLongDay(now)} — ${formatNumber(needsAction)} بند ينتظر إجراءً منك.`
            : `${adminLongDay(now)} — لا شيء ينتظرك الآن.`
        }
        action={
          <ButtonLink href="/admin/products/new" size="sm" variant="outline" icon="plus">
            منتج جديد
          </ButtonLink>
        }
      />

      {/* ---------- ما يحتاج إجراءً الآن ---------- */}
      <section aria-labelledby="needs-action" className="mb-6" data-adm-in>
        <h2 id="needs-action" className="sr-only">
          ما يحتاج إجراءً الآن
        </h2>

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-4">
          <ActionCard
            icon="cart"
            label="طلبات جديدة"
            count={data.orders.newCount}
            href="/admin/orders?status=NEW"
            cta="راجع الطلبات"
            age={data.orders.oldestNewAt}
            now={now}
            emptyText="لا طلبات جديدة"
          />
          <ActionCard
            icon="document"
            label="عروض أسعار بانتظار ردّك"
            count={data.quotes.waitingCount}
            href="/admin/quotes?filter=waiting"
            cta="أرسل العروض"
            age={data.quotes.waiting[0]?.createdAt ?? null}
            now={now}
            emptyText="كل العروض مُجاب عنها"
          />
          <ActionCard
            icon="mail"
            label="رسائل غير مقروءة"
            count={data.messages.unreadCount}
            href="/admin/messages?status=NEW"
            cta="اقرأ الرسائل"
            age={data.messages.oldestAt}
            now={now}
            emptyText="لا رسائل جديدة"
          />
          <ActionCard
            icon="clock"
            label="طلبات راكدة"
            count={data.orders.stalledCount}
            href="/admin/orders?filter=stalled"
            cta="تابع المتأخر"
            hint="لم تتحرك حالتها أكثر من المدة المعتادة"
            now={now}
            emptyText="لا طلبات متأخرة"
            tone="danger"
          />
        </div>

        <ul className="mt-3 flex flex-wrap gap-2">
          <MiniLink
            href="/admin/orders?filter=nodesign"
            count={data.orders.noDesignCount}
            label="طلبات بلا ملف تصميم"
          />
          <MiniLink
            href="/admin/quotes?filter=overdue"
            count={data.quotes.overdueDueCount}
            label="عروض تجاوزت موعد التسليم المطلوب"
          />
          <MiniLink
            href="/admin/quotes?filter=stale"
            count={data.quotes.staleQuotedCount}
            label="عروض أُرسلت ولم يحسمها العميل (+٣ أيام)"
          />
          <MiniLink
            href="/admin/orders?status=IN_PRODUCTION"
            count={data.orders.inProduction}
            label="قيد التنفيذ الآن"
            neutral
          />
        </ul>
      </section>

      {/* ---------- الإيراد ---------- */}
      <section aria-labelledby="revenue" className="mb-6" data-adm-in>
        <h2 id="revenue" className="sr-only">
          الإيراد
        </h2>
        <div className="border-border bg-surface grid divide-y rounded-xl border shadow-sm sm:grid-cols-3 sm:divide-x sm:divide-y-0 rtl:sm:divide-x-reverse">
          <RevenueTile label="اليوم" amount={data.revenue.today} orders={data.revenue.todayOrders} />
          <RevenueTile label="هذا الأسبوع" amount={data.revenue.week} orders={data.revenue.weekOrders} note="من السبت" />
          <RevenueTile
            label="هذا الشهر"
            amount={data.revenue.month}
            orders={data.revenue.monthOrders}
            note={
              data.revenue.month > 0
                ? `مدفوع منها ${formatPriceWithCurrency(data.revenue.monthPaid)}`
                : undefined
            }
          />
        </div>
        <p className="text-primary-500 mt-2 text-xs">
          الإيراد = قيمة الطلبات غير الملغاة بتوقيت الرياض، وليس بالضرورة مبالغ مقبوضة.
        </p>
      </section>

      <div className="mb-6 grid gap-6 xl:grid-cols-5">
        {/* ---------- عروض بانتظار الرد ---------- */}
        <AdminCard
          title="عروض أسعار بانتظار ردّك"
          description="الأقدم أولاً — العميل يقارن مع مطابع أخرى."
          padded={false}
          className="xl:col-span-3"
          action={
            <ButtonLink href="/admin/quotes?filter=waiting" size="sm" variant="ghost">
              عرض الكل
            </ButtonLink>
          }
        >
          {data.quotes.waiting.length === 0 ? (
            <AdminEmpty
              icon="check"
              title="لا عروض معلّقة"
              description="كل طلبات عروض الأسعار الواردة تم الرد عليها. أحسنت."
            />
          ) : (
            <ul className="divide-border divide-y">
              {data.quotes.waiting.map((quote) => (
                <li key={quote.id}>
                  <Link
                    href={`/admin/quotes/${quote.id}`}
                    className="hover:bg-surface-muted flex items-center gap-3 px-4 py-3 transition-colors sm:px-5"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-bold">{quote.customerName}</span>
                        <span className="text-primary-400 font-mono text-[0.7rem]" dir="ltr">
                          {quote.reference}
                        </span>
                      </span>
                      <span className="text-primary-600 mt-0.5 block truncate text-xs">
                        {quote.productType}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1.5">
                      <AgePill
                        label={formatAge(quote.createdAt, now)}
                        urgency={urgencyForAge(ageHours(quote.createdAt, now))}
                      />
                      <QuoteStatusBadge status={quote.status} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>

        {/* ---------- الأكثر طلبًا ---------- */}
        <AdminCard
          title="الأكثر طلبًا"
          description="آخر ٩٠ يومًا، حسب قيمة المبيعات."
          padded={false}
          className="xl:col-span-2"
        >
          {data.topProducts.length === 0 ? (
            <AdminEmpty
              icon="package"
              title="لا مبيعات بعد"
              description="ستظهر هنا المنتجات الأعلى مبيعًا بعد وصول أول الطلبات."
            />
          ) : (
            <ol className="divide-border divide-y">
              {data.topProducts.map((product, index) => {
                const top = data.topProducts[0].revenue || 1;
                return (
                  <li key={product.name} className="px-4 py-3 sm:px-5">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="flex min-w-0 items-baseline gap-2">
                        <span className="text-primary-400 w-4 shrink-0 text-xs tabular-nums">
                          {formatNumber(index + 1)}
                        </span>
                        <span className="truncate text-sm font-bold">{product.name}</span>
                      </span>
                      <span className="shrink-0 text-sm font-bold tabular-nums">
                        {formatPriceWithCurrency(product.revenue)}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <span
                        className="bg-primary-100 h-1.5 flex-1 overflow-hidden rounded-full"
                        aria-hidden="true"
                      >
                        <span
                          className="bg-brand-600 block h-full rounded-full"
                          style={{ width: `${Math.max(4, (product.revenue / top) * 100)}%` }}
                        />
                      </span>
                      <span className="text-primary-500 shrink-0 text-xs tabular-nums">
                        {formatNumber(product.quantity)} وحدة · {formatNumber(product.orders)} طلب
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </AdminCard>
      </div>

      {/* ---------- الرسم البياني ---------- */}
      <AdminCard
        title="النشاط خلال ٣٠ يومًا"
        description="عدد الطلبات وطلبات عروض الأسعار الواردة يوميًا."
        className="mb-6"
      >
        <div data-adm-in>
          <ActivityChart data={data.chart} />
        </div>
      </AdminCard>

      <div className="grid gap-6 xl:grid-cols-5">
        {/* ---------- تنبيهات الجاهزية ---------- */}
        <AdminCard
          title="تنبيهات الجاهزية"
          description="أشياء ناقصة تؤثر على ثقة العميل أو سلامة الفاتورة."
          padded={false}
          className="xl:col-span-3"
        >
          {data.alerts.length === 0 ? (
            <AdminEmpty
              icon="check"
              title="كل شيء جاهز"
              description="بيانات المنشأة والمنتجات مكتملة ولا توجد تنبيهات."
            />
          ) : (
            <ul className="divide-border divide-y">
              {data.alerts.map((alert) => (
                <li key={alert.id} className="flex items-start gap-3 px-4 py-3.5 sm:px-5">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg",
                      alert.level === "warn"
                        ? "bg-warning-50 text-warning-700"
                        : "bg-info-50 text-info-700",
                    )}
                  >
                    <AdminIcon name={alert.level === "warn" ? "alert" : "info"} className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">{alert.title}</p>
                    <p className="text-primary-600 mt-0.5 text-xs leading-relaxed">{alert.detail}</p>
                  </div>
                  <Link
                    href={alert.href}
                    className="border-border-strong text-primary-800 hover:bg-surface-muted inline-flex min-h-9 shrink-0 items-center rounded-lg border px-3 text-xs font-bold transition-colors"
                  >
                    {alert.cta}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>

        {/* ---------- آخر النشاط ---------- */}
        <AdminCard title="آخر النشاط" padded={false} className="xl:col-span-2">
          {data.feed.length === 0 ? (
            <AdminEmpty
              icon="clock"
              title="لا نشاط بعد"
              description="ستظهر هنا الطلبات والعروض والرسائل فور وصولها."
            />
          ) : (
            <ul className="divide-border divide-y">
              {data.feed.map((item) => (
                <FeedRow key={`${item.kind}-${item.id}`} item={item} now={now} />
              ))}
            </ul>
          )}
        </AdminCard>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------

function ActionCard({
  icon,
  label,
  count,
  href,
  cta,
  age,
  now,
  hint,
  emptyText,
  tone = "default",
}: {
  icon: AdminIconName;
  label: string;
  count: number;
  href: string;
  cta: string;
  age?: Date | null;
  now: Date;
  hint?: string;
  emptyText: string;
  tone?: "default" | "danger";
}) {
  const active = count > 0;

  return (
    <Link
      href={href}
      className={cn(
        "group bg-surface relative flex min-h-36 flex-col rounded-xl border p-4 shadow-sm transition-[border-color,box-shadow] hover:shadow-md sm:p-5",
        active
          ? tone === "danger"
            ? "border-danger-500/50 hover:border-danger-600"
            : "border-accent-600/70 hover:border-accent-600"
          : "border-border hover:border-border-strong",
      )}
    >
      <span className="flex items-start justify-between gap-2">
        <span className="text-primary-700 text-[0.82rem] leading-snug font-bold">{label}</span>
        <span
          aria-hidden="true"
          className={cn(
            "grid size-8 shrink-0 place-items-center rounded-lg",
            active
              ? tone === "danger"
                ? "bg-danger-50 text-danger-700"
                : "bg-accent-50 text-accent-700"
              : "bg-success-50 text-success-700",
          )}
        >
          <AdminIcon name={active ? icon : "check"} className="size-4" strokeWidth={active ? 1.7 : 2.2} />
        </span>
      </span>

      {active ? (
        <>
          <span className="font-display text-primary-950 mt-2 text-3xl font-extrabold tabular-nums">
            <CountUp value={count} />
          </span>
          <span className="text-primary-500 mt-1 min-h-4 text-xs">
            {age ? `الأقدم ${formatAge(age, now)}` : hint}
          </span>
        </>
      ) : (
        <span className="text-success-700 mt-3 text-sm font-bold">{emptyText}</span>
      )}

      <span className="text-primary-700 mt-auto flex items-center gap-1 pt-3 text-xs font-bold group-hover:underline">
        {active ? cta : "عرض القائمة"}
        <AdminIcon name="chevronLeft" className="size-3.5" strokeWidth={2.2} />
      </span>
    </Link>
  );
}

function MiniLink({
  href,
  count,
  label,
  neutral,
}: {
  href: string;
  count: number;
  label: string;
  neutral?: boolean;
}) {
  const hot = count > 0 && !neutral;

  return (
    <li>
      <Link
        href={href}
        className={cn(
          "inline-flex min-h-9 items-center gap-2 rounded-full border px-3.5 text-xs font-bold transition-colors",
          hot
            ? "border-accent-600/60 bg-accent-50 text-primary-950 hover:bg-accent-100"
            : "border-border bg-surface text-primary-600 hover:bg-surface-sunken",
        )}
      >
        <span
          className={cn(
            "min-w-5 rounded-full px-1.5 text-center tabular-nums",
            hot ? "bg-(--adm-gold) text-[#261747]" : "bg-surface-sunken text-primary-600",
          )}
        >
          {formatNumber(count)}
        </span>
        {label}
      </Link>
    </li>
  );
}

function RevenueTile({
  label,
  amount,
  orders,
  note,
}: {
  label: string;
  amount: number;
  orders: number;
  note?: string;
}) {
  return (
    <div className="px-4 py-4 sm:px-5">
      <p className="text-primary-600 text-xs font-bold">{label}</p>
      <p className="font-display text-primary-950 mt-1 text-2xl font-extrabold tabular-nums">
        <CountUp value={Math.round(amount)} kind="price" />
      </p>
      <p className="text-primary-500 mt-0.5 text-xs">
        {orders > 0 ? `${formatNumber(orders)} طلب` : "لا طلبات"}
        {note ? ` · ${note}` : ""}
      </p>
    </div>
  );
}

const FEED_ICON: Record<FeedItem["kind"], AdminIconName> = {
  order: "cart",
  quote: "document",
  message: "mail",
};

const FEED_LABEL: Record<FeedItem["kind"], string> = {
  order: "طلب",
  quote: "عرض سعر",
  message: "رسالة",
};

function FeedRow({ item, now }: { item: FeedItem; now: Date }) {
  return (
    <li>
      <Link
        href={item.href}
        className="hover:bg-surface-muted flex items-center gap-3 px-4 py-3 transition-colors sm:px-5"
      >
        <span
          aria-hidden="true"
          className="bg-surface-sunken text-primary-600 grid size-8 shrink-0 place-items-center rounded-lg"
        >
          <AdminIcon name={FEED_ICON[item.kind]} className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="text-primary-500 text-[0.7rem]">{FEED_LABEL[item.kind]}</span>
            <span className="truncate text-sm font-bold">{item.title}</span>
          </span>
          <span className="text-primary-600 block truncate text-xs">{item.subtitle}</span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          {item.kind === "order" ? (
            <OrderStatusBadge status={item.status} />
          ) : item.kind === "quote" ? (
            <QuoteStatusBadge status={item.status} />
          ) : (
            <MessageStatusBadge status={item.status} />
          )}
          <span className="text-primary-400 text-[0.68rem]">{formatAge(item.at, now)}</span>
        </span>
      </Link>
    </li>
  );
}

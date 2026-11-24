import { NEEDS_BRAND_FILE } from "@/config/brand";
import {
  DAY_MS,
  ageHours,
  riyadhDayKey,
  startOfRiyadhDay,
  startOfRiyadhMonth,
  startOfRiyadhWeek,
} from "@/lib/admin/time";
import { prisma } from "@/lib/prisma";

/**
 * استعلامات القراءة للوحة الرئيسية ولشارات الشريط الجانبي.
 *
 * ما يُحسب هنا هو «ماذا يحتاج انتباهي الآن» لا إحصاءات زخرفية. كل رقم له
 * رابط مباشر للإجراء في الواجهة.
 */

// ---------------------------------------------------------------------------
// عدّادات الشريط الجانبي
// ---------------------------------------------------------------------------

export type NavCounts = {
  orders: number;
  quotes: number;
  messages: number;
  testimonials: number;
};

export async function getNavCounts(): Promise<NavCounts> {
  try {
    const [orders, quotes, messages, testimonials] = await Promise.all([
      prisma.order.count({ where: { status: "NEW" } }),
      prisma.quoteRequest.count({ where: { status: { in: ["NEW", "IN_REVIEW"] } } }),
      prisma.contactMessage.count({ where: { status: "NEW" } }),
      prisma.testimonial.count({ where: { isApproved: false } }),
    ]);

    return { orders, quotes, messages, testimonials };
  } catch {
    // العدّادات تحسين لا ضرورة: تعذّرها لا يجب أن يكسر اللوحة كلها
    return { orders: 0, quotes: 0, messages: 0, testimonials: 0 };
  }
}

// ---------------------------------------------------------------------------
// تعريف «التأخّر»
// ---------------------------------------------------------------------------

/** الطلب لا يحمل موعد تسليم في المخطط، فالتأخّر يُقاس بعمر الحالة الحالية. */
export const OPEN_ORDER_STATUSES = ["NEW", "CONFIRMED", "IN_PRODUCTION", "READY", "SHIPPED"] as const;

/** عدد الساعات التي تُعدّ بعدها الحالة «راكدة». قابلة للضبط في مكان واحد. */
export const STALL_HOURS: Record<string, number> = {
  NEW: 24,
  CONFIRMED: 72,
  IN_PRODUCTION: 168,
  READY: 72,
  SHIPPED: 120,
};

/** حالات يُنتظر فيها ملف تصميم من العميل قبل الإنتاج. */
const DESIGN_PENDING_STATUSES = ["NEW", "CONFIRMED", "IN_PRODUCTION"] as const;

type OpenOrderLite = {
  id: string;
  orderNumber: string;
  customerName: string;
  status: string;
  total: number;
  createdAt: Date;
  updatedAt: Date;
  items: { uploadedFiles: unknown }[];
};

function hasDesignFile(order: OpenOrderLite): boolean {
  return order.items.some(
    (item) => Array.isArray(item.uploadedFiles) && item.uploadedFiles.length > 0,
  );
}

function isStalled(order: OpenOrderLite, now: Date): boolean {
  const limit = STALL_HOURS[order.status];
  return limit !== undefined && ageHours(order.updatedAt, now) > limit;
}

async function loadOpenOrders(): Promise<OpenOrderLite[]> {
  return prisma.order.findMany({
    where: { status: { in: [...OPEN_ORDER_STATUSES] } },
    orderBy: { createdAt: "asc" },
    take: 500,
    select: {
      id: true,
      orderNumber: true,
      customerName: true,
      status: true,
      total: true,
      createdAt: true,
      updatedAt: true,
      items: { select: { uploadedFiles: true } },
    },
  });
}

/** معرّفات الطلبات لفلاتر قائمة الطلبات الخاصة (راكد / بلا تصميم). */
export async function getOrderFilterIds(): Promise<{ stalled: string[]; nodesign: string[] }> {
  const now = new Date();
  const open = await loadOpenOrders();

  return {
    stalled: open.filter((order) => isStalled(order, now)).map((order) => order.id),
    nodesign: open
      .filter(
        (order) =>
          (DESIGN_PENDING_STATUSES as readonly string[]).includes(order.status) &&
          !hasDesignFile(order),
      )
      .map((order) => order.id),
  };
}

// ---------------------------------------------------------------------------
// اللوحة الرئيسية
// ---------------------------------------------------------------------------

export type Alert = {
  id: string;
  level: "warn" | "info";
  title: string;
  detail: string;
  href: string;
  cta: string;
};

export type FeedItem = {
  kind: "order" | "quote" | "message";
  id: string;
  title: string;
  subtitle: string;
  href: string;
  status: string;
  at: Date;
};

export type DashboardData = {
  generatedAt: Date;
  orders: {
    newCount: number;
    oldestNewAt: Date | null;
    noDesignCount: number;
    stalledCount: number;
    stalledSample: { id: string; orderNumber: string; customerName: string; status: string; updatedAt: Date }[];
    inProduction: number;
  };
  quotes: {
    waitingCount: number;
    waiting: {
      id: string;
      reference: string;
      customerName: string;
      productType: string;
      status: string;
      createdAt: Date;
    }[];
    overdueDueCount: number;
    staleQuotedCount: number;
  };
  messages: { unreadCount: number; oldestAt: Date | null };
  revenue: {
    today: number;
    week: number;
    month: number;
    todayOrders: number;
    weekOrders: number;
    monthOrders: number;
    monthPaid: number;
  };
  topProducts: { name: string; quantity: number; revenue: number; orders: number }[];
  chart: { key: string; label: string; orders: number; quotes: number }[];
  alerts: Alert[];
  feed: FeedItem[];
};

const CHART_DAYS = 30;

const PLACEHOLDER = (value: string | null | undefined) =>
  !value || value.includes(NEEDS_BRAND_FILE) || value.includes("example.com") || /^\+?9665?0{8}/.test(value.replace(/\s/g, ""));

export async function getDashboardData(): Promise<DashboardData> {
  const now = new Date();
  const todayStart = startOfRiyadhDay(now);
  const weekStart = startOfRiyadhWeek(now);
  const monthStart = startOfRiyadhMonth(now);
  const chartStart = new Date(todayStart.getTime() - (CHART_DAYS - 1) * DAY_MS);
  const revenueFrom = new Date(Math.min(monthStart.getTime(), chartStart.getTime()));
  const topFrom = new Date(now.getTime() - 90 * DAY_MS);
  const quotedStaleBefore = new Date(now.getTime() - 3 * DAY_MS);

  const [
    openOrders,
    latestOrders,
    recentOrders,
    quotesWaitingCount,
    quotesWaiting,
    quotesOverdueDue,
    quotesStale,
    messagesUnread,
    oldestUnreadMessage,
    quotesRecent,
    chartQuotes,
    topGroups,
    productsNoImage,
    productsNoImageCount,
    settings,
    activeShipping,
    pendingTestimonials,
    messagesRecent,
    activeProducts,
  ] = await Promise.all([
    loadOpenOrders(),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, orderNumber: true, customerName: true, status: true, createdAt: true },
    }),
    prisma.order.findMany({
      where: { createdAt: { gte: revenueFrom }, status: { not: "CANCELLED" } },
      select: { total: true, createdAt: true, paymentStatus: true },
    }),
    prisma.quoteRequest.count({ where: { status: { in: ["NEW", "IN_REVIEW"] } } }),
    prisma.quoteRequest.findMany({
      where: { status: { in: ["NEW", "IN_REVIEW"] } },
      orderBy: { createdAt: "asc" },
      take: 5,
      select: {
        id: true,
        reference: true,
        customerName: true,
        productType: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.quoteRequest.count({
      where: { status: { in: ["NEW", "IN_REVIEW", "QUOTED"] }, dueDate: { lt: todayStart } },
    }),
    prisma.quoteRequest.count({
      where: { status: "QUOTED", updatedAt: { lt: quotedStaleBefore } },
    }),
    prisma.contactMessage.count({ where: { status: "NEW" } }),
    prisma.contactMessage.findFirst({
      where: { status: "NEW" },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
    prisma.quoteRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, reference: true, customerName: true, productType: true, status: true, createdAt: true },
    }),
    prisma.quoteRequest.findMany({
      where: { createdAt: { gte: chartStart } },
      select: { createdAt: true },
    }),
    prisma.orderItem.groupBy({
      by: ["productName"],
      where: { order: { status: { not: "CANCELLED" }, createdAt: { gte: topFrom } } },
      _sum: { quantity: true, lineTotal: true },
      _count: { _all: true },
      orderBy: { _sum: { lineTotal: "desc" } },
      take: 5,
    }),
    prisma.product.findMany({
      where: { isActive: true, images: { none: {} } },
      orderBy: { updatedAt: "desc" },
      take: 4,
      select: { id: true, name: true },
    }),
    prisma.product.count({ where: { isActive: true, images: { none: {} } } }),
    prisma.siteSettings.findUnique({ where: { id: "singleton" } }),
    prisma.shippingZone.count({ where: { isActive: true } }),
    prisma.testimonial.count({ where: { isApproved: false } }),
    prisma.contactMessage.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, name: true, subject: true, status: true, createdAt: true },
    }),
    prisma.product.count({ where: { isActive: true } }),
  ]);

  // ---------- الطلبات ----------
  const newOrders = openOrders.filter((order) => order.status === "NEW");
  const noDesign = openOrders.filter(
    (order) =>
      (DESIGN_PENDING_STATUSES as readonly string[]).includes(order.status) && !hasDesignFile(order),
  );
  const stalled = openOrders.filter((order) => isStalled(order, now));

  // ---------- الإيراد ----------
  const sum = (from: Date) => {
    const rows = recentOrders.filter((order) => order.createdAt >= from);
    return {
      total: rows.reduce((acc, order) => acc + order.total, 0),
      count: rows.length,
      paid: rows
        .filter((order) => order.paymentStatus === "PAID")
        .reduce((acc, order) => acc + order.total, 0),
    };
  };
  const today = sum(todayStart);
  const week = sum(weekStart);
  const month = sum(monthStart);

  // ---------- الرسم البياني: ٣٠ يومًا بتوقيت الرياض ----------
  const buckets = new Map<string, { orders: number; quotes: number }>();
  const days: { key: string; label: string }[] = [];
  for (let i = 0; i < CHART_DAYS; i++) {
    const day = new Date(chartStart.getTime() + i * DAY_MS);
    const key = riyadhDayKey(new Date(day.getTime() + 60_000));
    buckets.set(key, { orders: 0, quotes: 0 });
    days.push({
      key,
      label: new Intl.DateTimeFormat("ar-SA-u-nu-latn", { day: "numeric", month: "short" }).format(
        new Date(day.getTime() + 12 * 3_600_000),
      ),
    });
  }
  for (const order of recentOrders) {
    const bucket = buckets.get(riyadhDayKey(order.createdAt));
    if (bucket) bucket.orders += 1;
  }
  for (const quote of chartQuotes) {
    const bucket = buckets.get(riyadhDayKey(quote.createdAt));
    if (bucket) bucket.quotes += 1;
  }

  // ---------- تنبيهات الجاهزية ----------
  const alerts: Alert[] = [];

  if (settings) {
    if (PLACEHOLDER(settings.phone) || PLACEHOLDER(settings.whatsapp)) {
      alerts.push({
        id: "contact-phone",
        level: "warn",
        title: "رقم الجوال أو الواتساب مؤقت",
        detail: "أزرار الاتصال والواتساب في الموقع توجّه العملاء إلى رقم غير حقيقي.",
        href: "/admin/settings#sec-contact",
        cta: "استبدال الأرقام",
      });
    }
    if (PLACEHOLDER(settings.email)) {
      alerts.push({
        id: "contact-email",
        level: "warn",
        title: "البريد الإلكتروني مؤقت",
        detail: "يظهر في الفوتر وصفحة الاتصال وفي البيانات المنظّمة لمحركات البحث.",
        href: "/admin/settings#sec-contact",
        cta: "تعديل البريد",
      });
    }
    if (PLACEHOLDER(settings.addressLine)) {
      alerts.push({
        id: "contact-address",
        level: "info",
        title: "عنوان المنشأة غير مضبوط",
        detail: "العنوان يظهر في صفحة الاتصال وعلى الفاتورة المطبوعة.",
        href: "/admin/settings#sec-contact",
        cta: "إضافة العنوان",
      });
    }
    if (!settings.vatNumber?.trim()) {
      alerts.push({
        id: "vat",
        level: "warn",
        title: "الرقم الضريبي غير مسجّل",
        detail: "الفاتورة الضريبية لا تصحّ نظامًا بدون الرقم الضريبي للمنشأة.",
        href: "/admin/settings#sec-legal",
        cta: "إضافة الرقم الضريبي",
      });
    }
    if (!settings.crNumber?.trim()) {
      alerts.push({
        id: "cr",
        level: "info",
        title: "السجل التجاري غير مسجّل",
        detail: "يظهر في الفاتورة وفي صفحة من نحن لبناء الثقة عند الشركات.",
        href: "/admin/settings#sec-legal",
        cta: "إضافة السجل",
      });
    }
    if (!settings.logoUrl) {
      alerts.push({
        id: "logo",
        level: "info",
        title: "لا يوجد شعار مرفوع",
        detail: "الموقع يعرض شعارًا نصيًا مؤقتًا بدل شعار المنشأة.",
        href: "/admin/settings#sec-identity",
        cta: "رفع الشعار",
      });
    }

    const payment = (settings.paymentSettings ?? {}) as {
      bankTransfer?: boolean;
      bankAccounts?: unknown[];
    };
    if ((payment.bankTransfer ?? true) && (payment.bankAccounts ?? []).length === 0) {
      alerts.push({
        id: "bank",
        level: "warn",
        title: "التحويل البنكي مفعّل بلا حساب بنكي",
        detail: "العميل الذي يختار التحويل لن يجد رقم IBAN ليحوّل إليه.",
        href: "/admin/settings#sec-payment",
        cta: "إضافة حساب بنكي",
      });
    }
  } else {
    alerts.push({
      id: "settings-missing",
      level: "warn",
      title: "إعدادات المنشأة غير موجودة",
      detail: "احفظ بيانات المنشأة مرة واحدة لتُنشأ الإعدادات.",
      href: "/admin/settings",
      cta: "فتح الإعدادات",
    });
  }

  if (productsNoImageCount > 0) {
    alerts.push({
      id: "product-images",
      level: "warn",
      title: `${productsNoImageCount} منتج منشور بلا صور`,
      detail: `${productsNoImage.map((product) => product.name).join("، ")}${
        productsNoImageCount > productsNoImage.length ? " …" : ""
      }`,
      href: productsNoImage.length === 1 ? `/admin/products/${productsNoImage[0].id}` : "/admin/products?filter=noimage",
      cta: "إضافة الصور",
    });
  }

  if (activeShipping === 0) {
    alerts.push({
      id: "shipping",
      level: "info",
      title: "لا توجد مناطق شحن مفعّلة",
      detail: "بدونها لا تُحتسب تكلفة التوصيل في السلة.",
      href: "/admin/shipping",
      cta: "ضبط الشحن",
    });
  }

  if (pendingTestimonials > 0) {
    alerts.push({
      id: "testimonials",
      level: "info",
      title: `${pendingTestimonials} تقييم بانتظار الاعتماد`,
      detail: "لا يظهر التقييم في الموقع قبل اعتماده.",
      href: "/admin/testimonials",
      cta: "مراجعة التقييمات",
    });
  }

  if (activeProducts === 0) {
    alerts.unshift({
      id: "no-products",
      level: "warn",
      title: "لا توجد منتجات منشورة",
      detail: "المتجر فارغ للزائر حتى تنشر منتجًا واحدًا على الأقل.",
      href: "/admin/products/new",
      cta: "إضافة منتج",
    });
  }

  // ---------- آخر النشاط ----------
  const feed: FeedItem[] = [
    ...latestOrders.map<FeedItem>((order) => ({
        kind: "order",
        id: order.id,
        title: order.orderNumber,
        subtitle: order.customerName,
        href: `/admin/orders/${order.id}`,
      status: order.status,
      at: order.createdAt,
    })),
    ...quotesRecent.map<FeedItem>((quote) => ({
      kind: "quote",
      id: quote.id,
      title: quote.reference,
      subtitle: `${quote.customerName} — ${quote.productType}`,
      href: `/admin/quotes/${quote.id}`,
      status: quote.status,
      at: quote.createdAt,
    })),
    ...messagesRecent.map<FeedItem>((message) => ({
      kind: "message",
      id: message.id,
      title: message.name,
      subtitle: message.subject ?? "رسالة من الموقع",
      href: "/admin/messages",
      status: message.status,
      at: message.createdAt,
    })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 8);

  return {
    generatedAt: now,
    orders: {
      newCount: newOrders.length,
      oldestNewAt: newOrders[0]?.createdAt ?? null,
      noDesignCount: noDesign.length,
      stalledCount: stalled.length,
      stalledSample: stalled.slice(0, 4).map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        status: order.status,
        updatedAt: order.updatedAt,
      })),
      inProduction: openOrders.filter((order) => order.status === "IN_PRODUCTION").length,
    },
    quotes: {
      waitingCount: quotesWaitingCount,
      waiting: quotesWaiting,
      overdueDueCount: quotesOverdueDue,
      staleQuotedCount: quotesStale,
    },
    messages: { unreadCount: messagesUnread, oldestAt: oldestUnreadMessage?.createdAt ?? null },
    revenue: {
      today: today.total,
      week: week.total,
      month: month.total,
      todayOrders: today.count,
      weekOrders: week.count,
      monthOrders: month.count,
      monthPaid: month.paid,
    },
    topProducts: topGroups.map((group) => ({
      name: group.productName,
      quantity: group._sum.quantity ?? 0,
      revenue: group._sum.lineTotal ?? 0,
      orders: group._count._all,
    })),
    chart: days.map((day) => ({
      key: day.key,
      label: day.label,
      orders: buckets.get(day.key)?.orders ?? 0,
      quotes: buckets.get(day.key)?.quotes ?? 0,
    })),
    alerts,
    feed,
  };
}

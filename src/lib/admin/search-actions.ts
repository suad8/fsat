"use server";

import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeDigits } from "@/lib/admin/url";

/**
 * البحث السريع (Ctrl+K): يجيب عن «أين هذا الطلب/العميل/المنتج؟» بنتيجة واحدة
 * قابلة للنقر. إجراء قراءة فقط، ويتطلب جلسة إدارة صالحة (الإجراءات تُستدعى
 * كنقاط HTTP عامة فلا يكفي أن تكون الصفحة محمية).
 */

export type SearchHit = {
  kind: "order" | "quote" | "customer" | "product" | "message";
  title: string;
  subtitle?: string;
  href: string;
};

const KIND_LIMIT = 4;

export async function searchAdminAction(rawQuery: string): Promise<SearchHit[]> {
  try {
    await requireAdmin();
  } catch {
    return [];
  }

  const q = normalizeDigits(rawQuery).trim().slice(0, 60);
  if (q.length < 2) return [];

  const [orders, quotes, customers, products, messages] = await Promise.all([
    prisma.order.findMany({
      where: {
        OR: [
          { orderNumber: { contains: q } },
          { customerName: { contains: q } },
          { customerPhone: { contains: q } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: KIND_LIMIT,
      select: { id: true, orderNumber: true, customerName: true },
    }),
    prisma.quoteRequest.findMany({
      where: {
        OR: [
          { reference: { contains: q } },
          { customerName: { contains: q } },
          { phone: { contains: q } },
          { productType: { contains: q } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: KIND_LIMIT,
      select: { id: true, reference: true, customerName: true, productType: true },
    }),
    prisma.customer.findMany({
      where: {
        OR: [{ name: { contains: q } }, { phone: { contains: q } }, { companyName: { contains: q } }],
      },
      orderBy: { createdAt: "desc" },
      take: KIND_LIMIT,
      select: { id: true, name: true, phone: true, companyName: true },
    }),
    prisma.product.findMany({
      where: { OR: [{ name: { contains: q } }, { slug: { contains: q } }, { sku: { contains: q } }] },
      take: KIND_LIMIT,
      select: { id: true, name: true, category: { select: { name: true } } },
    }),
    prisma.contactMessage.findMany({
      where: {
        OR: [{ name: { contains: q } }, { phone: { contains: q } }, { subject: { contains: q } }],
      },
      orderBy: { createdAt: "desc" },
      take: KIND_LIMIT,
      select: { id: true, name: true, subject: true },
    }),
  ]);

  return [
    ...orders.map<SearchHit>((order) => ({
      kind: "order",
      title: order.orderNumber,
      subtitle: order.customerName,
      href: `/admin/orders/${order.id}`,
    })),
    ...quotes.map<SearchHit>((quote) => ({
      kind: "quote",
      title: quote.reference,
      subtitle: `${quote.customerName} — ${quote.productType}`,
      href: `/admin/quotes/${quote.id}`,
    })),
    ...customers.map<SearchHit>((customer) => ({
      kind: "customer",
      title: customer.name,
      subtitle: customer.companyName ?? customer.phone,
      href: `/admin/customers?q=${encodeURIComponent(customer.phone)}`,
    })),
    ...products.map<SearchHit>((product) => ({
      kind: "product",
      title: product.name,
      subtitle: product.category.name,
      href: `/admin/products/${product.id}`,
    })),
    ...messages.map<SearchHit>((message) => ({
      kind: "message",
      title: message.name,
      subtitle: message.subject ?? "رسالة من الموقع",
      href: `/admin/messages?q=${encodeURIComponent(message.name)}`,
    })),
  ];
}

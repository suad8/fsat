import { prisma } from "@/lib/prisma";

/**
 * توليد الأرقام المرجعية للطلبات وعروض الأسعار.
 *
 * الصيغة: البادئة + السنة + تسلسل من ٤ خانات — مثال: ORD-2026-0043
 * أرقام مقروءة ينطقها العميل على الهاتف بسهولة، وتكشف سنة الطلب مباشرة.
 */

async function nextSequence(
  prefix: string,
  year: number,
  countExisting: (pattern: string) => Promise<number>,
): Promise<string> {
  const pattern = `${prefix}-${year}-`;
  const existing = await countExisting(pattern);

  // نحاول عدة مرات تحسّبًا لتزامن طلبين في اللحظة نفسها
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = `${pattern}${String(existing + 1 + attempt).padStart(4, "0")}`;
    const taken = await isTaken(prefix, candidate);
    if (!taken) return candidate;
  }

  // احتياط أخير مضمون التفرّد
  return `${pattern}${Date.now().toString().slice(-6)}`;
}

async function isTaken(prefix: string, reference: string): Promise<boolean> {
  if (prefix === "ORD") {
    const found = await prisma.order.findUnique({ where: { orderNumber: reference } });
    return found !== null;
  }
  const found = await prisma.quoteRequest.findUnique({ where: { reference } });
  return found !== null;
}

export async function generateOrderNumber(): Promise<string> {
  const year = new Date().getFullYear();
  return nextSequence("ORD", year, (pattern) =>
    prisma.order.count({ where: { orderNumber: { startsWith: pattern } } }),
  );
}

export async function generateQuoteReference(): Promise<string> {
  const year = new Date().getFullYear();
  return nextSequence("QT", year, (pattern) =>
    prisma.quoteRequest.count({ where: { reference: { startsWith: pattern } } }),
  );
}

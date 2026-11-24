import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/AdminShell";
import { getNavCounts } from "@/lib/admin/dashboard";
import { ADMIN_ROLE_LABELS, type AdminRole } from "@/lib/constants";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: { default: "لوحة التحكم", template: "%s | لوحة التحكم" },
  robots: { index: false, follow: false },
};

/**
 * غلاف لوحة التحكم.
 *
 * الـ middleware يمنع الوصول بلا توكن صالح، لكن التحقق يُعاد هنا مقابل قاعدة
 * البيانات: التوكن قد يكون صالحًا لحساب عُطّل بعد إصداره. الاعتماد على
 * الـ middleware وحده يترك حسابًا معطّلاً يعمل حتى انتهاء صلاحية توكنه.
 */
export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const [user, counts] = await Promise.all([
    prisma.adminUser.findUnique({
      where: { id: session.id },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    }),
    getNavCounts(),
  ]);

  if (!user || !user.isActive) redirect("/admin/login");

  return (
    <AdminShell
      user={{
        name: user.name,
        email: user.email,
        role: ADMIN_ROLE_LABELS[user.role as AdminRole] ?? user.role,
      }}
      counts={counts}
    >
      {children}
    </AdminShell>
  );
}

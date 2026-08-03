import { redirect } from "next/navigation";

import { AdminHeading } from "@/components/admin/AdminUi";
import { ProjectEditor } from "@/components/admin/ProjectEditor";
import { EMPTY_PROJECT } from "@/lib/admin/drafts";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "مشروع جديد" };

export default async function NewProjectPage() {
  const [categories, products] = await Promise.all([
    prisma.projectCategory.findMany({
      orderBy: { order: "asc" },
      select: { id: true, name: true },
    }),
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (categories.length === 0) redirect("/admin/portfolio");

  return (
    <>
      <AdminHeading
        title="مشروع جديد"
        description="أضف تفاصيل المشروع وصوره ليظهر في معرض الأعمال."
        backHref="/admin/portfolio"
        backLabel="رجوع إلى معرض الأعمال"
      />

      <ProjectEditor
        initial={{ ...EMPTY_PROJECT, categoryId: categories[0].id }}
        categories={categories}
        products={products}
      />
    </>
  );
}

import Link from "next/link";

import { ContentTable } from "@/app/admin/(dashboard)/portfolio/ContentTable";
import { AdminCard, AdminEmpty, AdminHeading } from "@/components/admin/AdminUi";
import { ButtonLink } from "@/components/ui/Button";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "معرض الأعمال" };

export default async function AdminPortfolioPage() {
  const [projects, categoryCount] = await Promise.all([
    prisma.project.findMany({
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        title: true,
        slug: true,
        clientName: true,
        isActive: true,
        isFeatured: true,
        updatedAt: true,
        category: { select: { name: true } },
        images: { orderBy: { order: "asc" }, take: 1, select: { url: true } },
      },
    }),
    prisma.projectCategory.count(),
  ]);

  return (
    <>
      <AdminHeading
        title="معرض الأعمال"
        description="أضف مشاريعك المنفّذة بصورها وخاماتها ومقاساتها — هذا ما يحوّل الزائر إلى عميل."
        action={
          categoryCount > 0 ? (
            <ButtonLink href="/admin/portfolio/new" icon="plus">
              مشروع جديد
            </ButtonLink>
          ) : null
        }
      />

      <AdminCard padded={false}>
        {categoryCount === 0 ? (
          <AdminEmpty
            icon="tag"
            title="أضف تصنيفًا أولاً"
            description="كل مشروع يجب أن ينتمي لتصنيف. أنشئ تصنيفًا واحدًا على الأقل قبل إضافة المشاريع."
            action={
              <ButtonLink href="/admin/project-categories/new" icon="plus">
                إضافة تصنيف
              </ButtonLink>
            }
          />
        ) : projects.length === 0 ? (
          <AdminEmpty
            icon="image"
            title="لا توجد مشاريع بعد"
            description="أضف أول مشروع بصوره وتفاصيل تنفيذه. سيظهر في معرض الأعمال وفي الصفحة الرئيسية."
            action={
              <ButtonLink href="/admin/portfolio/new" icon="plus">
                إضافة مشروع
              </ButtonLink>
            }
          />
        ) : (
          <ContentTable
            model="project"
            basePath="/admin/portfolio"
            publicPath="/portfolio"
            metaLabel="التصنيف"
            featuredLabel="مميّز"
            rows={projects.map((project) => ({
              id: project.id,
              title: project.title,
              slug: project.slug,
              meta: project.category.name,
              extra: project.clientName,
              imageUrl: project.images[0]?.url ?? null,
              isActive: project.isActive,
              isFeatured: project.isFeatured,
              updatedAt: project.updatedAt,
            }))}
          />
        )}
      </AdminCard>

      <p className="text-primary-500 mt-4 text-xs">
        التصنيفات تُدار من{" "}
        <Link href="/admin/project-categories" className="text-accent-700 font-bold">
          صفحة تصنيفات معرض الأعمال
        </Link>
        .
      </p>
    </>
  );
}

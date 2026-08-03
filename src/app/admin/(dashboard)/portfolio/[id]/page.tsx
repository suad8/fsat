import { notFound } from "next/navigation";

import { AdminHeading } from "@/components/admin/AdminUi";
import { ProjectEditor, type ProjectDraft } from "@/components/admin/ProjectEditor";
import { ButtonLink } from "@/components/ui/Button";
import type { ProjectImageStage } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ id: string }>;

export const metadata = { title: "تعديل مشروع" };

export default async function EditProjectPage({ params }: { params: Params }) {
  const { id } = await params;

  const [project, categories, products] = await Promise.all([
    prisma.project.findUnique({
      where: { id },
      include: { images: { orderBy: { order: "asc" } } },
    }),
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

  if (!project) notFound();

  const draft: ProjectDraft = {
    id: project.id,
    title: project.title,
    slug: project.slug,
    categoryId: project.categoryId,
    clientName: project.clientName ?? "",
    summary: project.summary ?? "",
    description: project.description ?? "",
    materials: project.materials ?? "",
    dimensions: project.dimensions ?? "",
    techniques: project.techniques ?? "",
    completedAt: project.completedAt
      ? project.completedAt.toISOString().slice(0, 10)
      : "",
    relatedProductId: project.relatedProductId ?? "",
    isFeatured: project.isFeatured,
    isActive: project.isActive,
    order: project.order,
    seoTitle: project.seoTitle ?? "",
    seoDescription: project.seoDescription ?? "",
    images: project.images.map((image) => ({
      url: image.url,
      alt: image.alt,
      caption: image.caption ?? "",
      stage: image.stage as ProjectImageStage,
    })),
  };

  return (
    <>
      <AdminHeading
        title="تعديل المشروع"
        description={project.title}
        backHref="/admin/portfolio"
        backLabel="رجوع إلى معرض الأعمال"
        action={
          <ButtonLink
            href={`/portfolio/${project.slug}`}
            external
            variant="outline"
            size="sm"
            iconAfter="externalLink"
          >
            معاينة في الموقع
          </ButtonLink>
        }
      />

      <ProjectEditor initial={draft} categories={categories} products={products} />
    </>
  );
}

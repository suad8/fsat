import { notFound } from "next/navigation";

import { AdminCard, AdminHeading } from "@/components/admin/AdminUi";
import { ResourceTable } from "@/components/admin/ResourceTable";
import { ButtonLink } from "@/components/ui/Button";
import { getResource, RESOURCE_SLUGS } from "@/lib/admin/resources";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ resource: string }>;

/**
 * قائمة أي مورد بسيط.
 *
 * المسارات الثابتة مثل /admin/products و /admin/orders لها مجلداتها الخاصة،
 * و Next.js يفضّل المقطع الثابت على الديناميكي — فلا تتعارض معها.
 */
export function generateStaticParams() {
  return RESOURCE_SLUGS.map((resource) => ({ resource }));
}

export async function generateMetadata({ params }: { params: Params }) {
  const { resource: slug } = await params;
  const resource = getResource(slug);
  return { title: resource?.title ?? "غير موجود" };
}

export default async function ResourceListPage({ params }: { params: Params }) {
  const { resource: slug } = await params;
  const resource = getResource(slug);

  if (!resource) notFound();

  const client = prisma as unknown as Record<
    string,
    { findMany: (args?: unknown) => Promise<Record<string, unknown>[]> }
  >;

  const rows = await client[resource.model].findMany({
    orderBy: resource.orderBy,
    take: 200,
  });

  return (
    <>
      <AdminHeading
        title={resource.title}
        description={resource.description}
        action={
          <ButtonLink href={`/admin/${resource.slug}/new`} icon="plus">
            إضافة {resource.singular}
          </ButtonLink>
        }
      />

      <AdminCard padded={false}>
        <ResourceTable
          resourceSlug={resource.slug}
          singular={resource.singular}
          columns={resource.columns}
          rows={rows}
          newHref={`/admin/${resource.slug}/new`}
          emptyTitle={`لا توجد ${resource.title} بعد`}
          emptyDescription={resource.description}
        />
      </AdminCard>
    </>
  );
}

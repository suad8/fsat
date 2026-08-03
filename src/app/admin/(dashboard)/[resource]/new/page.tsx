import { notFound } from "next/navigation";

import { AdminCard, AdminHeading } from "@/components/admin/AdminUi";
import { EntityForm } from "@/components/admin/EntityForm";
import { getResource } from "@/lib/admin/resources";

type Params = Promise<{ resource: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { resource: slug } = await params;
  const resource = getResource(slug);
  return { title: resource ? `إضافة ${resource.singular}` : "غير موجود" };
}

export default async function NewResourcePage({ params }: { params: Params }) {
  const { resource: slug } = await params;
  const resource = getResource(slug);

  if (!resource) notFound();

  return (
    <>
      <AdminHeading
        title={`إضافة ${resource.singular}`}
        description={resource.description}
        backHref={`/admin/${resource.slug}`}
        backLabel={`رجوع إلى ${resource.title}`}
      />

      <AdminCard>
        <EntityForm
          resource={resource.slug}
          fields={resource.fields}
          listHref={`/admin/${resource.slug}`}
        />
      </AdminCard>
    </>
  );
}

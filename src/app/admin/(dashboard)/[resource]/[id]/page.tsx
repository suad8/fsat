import { notFound } from "next/navigation";

import { fetchResourceRecord } from "@/app/admin/(dashboard)/actions/resource";
import { AdminCard, AdminHeading } from "@/components/admin/AdminUi";
import { EntityForm } from "@/components/admin/EntityForm";
import { getResource } from "@/lib/admin/resources";

type Params = Promise<{ resource: string; id: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { resource: slug } = await params;
  const resource = getResource(slug);
  return { title: resource ? `تعديل ${resource.singular}` : "غير موجود" };
}

export default async function EditResourcePage({ params }: { params: Params }) {
  const { resource: slug, id } = await params;
  const resource = getResource(slug);

  if (!resource) notFound();

  const record = await fetchResourceRecord(resource.slug, id);
  if (!record) notFound();

  const label = String(record.name ?? record.title ?? record.question ?? record.code ?? "");

  return (
    <>
      <AdminHeading
        title={`تعديل ${resource.singular}`}
        description={label}
        backHref={`/admin/${resource.slug}`}
        backLabel={`رجوع إلى ${resource.title}`}
      />

      <AdminCard>
        <EntityForm
          resource={resource.slug}
          fields={resource.fields}
          record={record}
          listHref={`/admin/${resource.slug}`}
        />
      </AdminCard>
    </>
  );
}

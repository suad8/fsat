import { notFound } from "next/navigation";

import { AdminHeading } from "@/components/admin/AdminUi";
import { ServiceEditor, type ServiceDraft } from "@/components/admin/ServiceEditor";
import { ButtonLink } from "@/components/ui/Button";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ id: string }>;

export const metadata = { title: "تعديل خدمة" };

export default async function EditServicePage({ params }: { params: Params }) {
  const { id } = await params;

  const [service, products] = await Promise.all([
    prisma.service.findUnique({
      where: { id },
      include: {
        images: { orderBy: { order: "asc" } },
        products: { select: { id: true } },
      },
    }),
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!service) notFound();

  const draft: ServiceDraft = {
    id: service.id,
    title: service.title,
    slug: service.slug,
    shortDescription: service.shortDescription,
    description: service.description ?? "",
    iconKey: service.iconKey ?? "package",
    imageUrl: service.imageUrl ?? "",
    imageAlt: service.imageAlt ?? "",
    highlights: Array.isArray(service.highlights) ? (service.highlights as string[]) : [],
    isActive: service.isActive,
    isFeatured: service.isFeatured,
    order: service.order,
    seoTitle: service.seoTitle ?? "",
    seoDescription: service.seoDescription ?? "",
    productIds: service.products.map((product) => product.id),
    images: service.images.map((image) => ({ url: image.url, alt: image.alt })),
  };

  return (
    <>
      <AdminHeading
        title="تعديل الخدمة"
        description={service.title}
        backHref="/admin/services"
        backLabel="رجوع إلى الخدمات"
        action={
          <ButtonLink
            href={`/services/${service.slug}`}
            external
            variant="outline"
            size="sm"
            iconAfter="externalLink"
          >
            معاينة في الموقع
          </ButtonLink>
        }
      />

      <ServiceEditor initial={draft} products={products} />
    </>
  );
}

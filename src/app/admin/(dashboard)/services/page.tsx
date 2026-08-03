import { ContentTable } from "@/app/admin/(dashboard)/portfolio/ContentTable";
import { AdminCard, AdminEmpty, AdminHeading } from "@/components/admin/AdminUi";
import { ButtonLink } from "@/components/ui/Button";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "الخدمات" };

export default async function AdminServicesPage() {
  const services = await prisma.service.findMany({
    orderBy: [{ order: "asc" }, { title: "asc" }],
    select: {
      id: true,
      title: true,
      slug: true,
      shortDescription: true,
      imageUrl: true,
      isActive: true,
      isFeatured: true,
      updatedAt: true,
      _count: { select: { products: true } },
    },
  });

  return (
    <>
      <AdminHeading
        title="الخدمات"
        description="خدمات الطباعة المعروضة في الموقع، وما يرتبط بها من منتجات."
        action={
          <ButtonLink href="/admin/services/new" icon="plus">
            خدمة جديدة
          </ButtonLink>
        }
      />

      <AdminCard padded={false}>
        {services.length === 0 ? (
          <AdminEmpty
            icon="sparkles"
            title="لا توجد خدمات بعد"
            description="أضف خدماتك ليعرف العميل ما تقدّمه، واربط كل خدمة بمنتجاتها في المتجر."
            action={
              <ButtonLink href="/admin/services/new" icon="plus">
                إضافة خدمة
              </ButtonLink>
            }
          />
        ) : (
          <ContentTable
            model="service"
            basePath="/admin/services"
            publicPath="/services"
            metaLabel="المنتجات المرتبطة"
            featuredLabel="في الرئيسية"
            rows={services.map((service) => ({
              id: service.id,
              title: service.title,
              slug: service.slug,
              meta: `${service._count.products} منتج`,
              extra: service.shortDescription,
              imageUrl: service.imageUrl,
              isActive: service.isActive,
              isFeatured: service.isFeatured,
              updatedAt: service.updatedAt,
            }))}
          />
        )}
      </AdminCard>
    </>
  );
}

import { AdminHeading } from "@/components/admin/AdminUi";
import { ServiceEditor } from "@/components/admin/ServiceEditor";
import { EMPTY_SERVICE } from "@/lib/admin/drafts";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "خدمة جديدة" };

export default async function NewServicePage() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <>
      <AdminHeading
        title="خدمة جديدة"
        description="أضف خدمة جديدة واربطها بمنتجاتها في المتجر."
        backHref="/admin/services"
        backLabel="رجوع إلى الخدمات"
      />

      <ServiceEditor initial={EMPTY_SERVICE} products={products} />
    </>
  );
}

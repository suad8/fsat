import { redirect } from "next/navigation";

import { AdminHeading } from "@/components/admin/AdminUi";
import { ProductEditor } from "@/components/admin/ProductEditor";
import { EMPTY_PRODUCT } from "@/lib/admin/drafts";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "منتج جديد" };

export default async function NewProductPage() {
  const [categories, services] = await Promise.all([
    prisma.category.findMany({
      orderBy: { order: "asc" },
      select: { id: true, name: true },
    }),
    prisma.service.findMany({
      orderBy: { order: "asc" },
      select: { id: true, title: true },
    }),
  ]);

  // لا يمكن إنشاء منتج بلا قسم — نعيد المستخدم لصفحة المنتجات التي تشرح ذلك
  if (categories.length === 0) redirect("/admin/products");

  return (
    <>
      <AdminHeading
        title="منتج جديد"
        description="أدخل بيانات المنتج ثم اضبط خياراته وشرائح أسعاره."
        backHref="/admin/products"
        backLabel="رجوع إلى المنتجات"
      />

      <ProductEditor
        initial={{ ...EMPTY_PRODUCT, categoryId: categories[0].id }}
        categories={categories}
        services={services}
      />
    </>
  );
}

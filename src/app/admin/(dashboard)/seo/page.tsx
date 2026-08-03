import Link from "next/link";

import { SeoDefaultsForm } from "@/app/admin/(dashboard)/seo/SeoDefaultsForm";
import { AdminCard, AdminHeading, StatCard } from "@/components/admin/AdminUi";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { siteUrl } from "@/config/brand";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export const metadata = { title: "تحسين محركات البحث" };

export default async function AdminSeoPage() {
  const [
    settings,
    productTotal,
    productsMissingSeo,
    productsMissingImages,
    imagesMissingAlt,
    projectTotal,
    projectsMissingSeo,
    serviceTotal,
    servicesMissingSeo,
  ] = await Promise.all([
    prisma.siteSettings.findUnique({ where: { id: "singleton" } }),
    prisma.product.count({ where: { isActive: true } }),
    prisma.product.findMany({
      where: { isActive: true, OR: [{ seoDescription: null }, { seoDescription: "" }] },
      select: { id: true, name: true },
      take: 50,
    }),
    prisma.product.findMany({
      where: { isActive: true, images: { none: {} } },
      select: { id: true, name: true },
      take: 50,
    }),
    prisma.productImage.count({ where: { alt: "" } }),
    prisma.project.count({ where: { isActive: true } }),
    prisma.project.findMany({
      where: { isActive: true, OR: [{ seoDescription: null }, { seoDescription: "" }] },
      select: { id: true, title: true },
      take: 50,
    }),
    prisma.service.count({ where: { isActive: true } }),
    prisma.service.findMany({
      where: { isActive: true, OR: [{ seoDescription: null }, { seoDescription: "" }] },
      select: { id: true, title: true },
      take: 50,
    }),
  ]);

  const checks = [
    {
      label: "منتجات بلا وصف Meta",
      count: productsMissingSeo.length,
      total: productTotal,
      href: "/admin/products",
      hint: "بدون وصف Meta تختار جوجل مقتطفًا عشوائيًا من الصفحة.",
      items: productsMissingSeo.map((item) => ({ id: item.id, label: item.name })),
      basePath: "/admin/products",
    },
    {
      label: "منتجات بلا صور",
      count: productsMissingImages.length,
      total: productTotal,
      href: "/admin/products",
      hint: "المنتج بلا صورة يفقد الظهور في نتائج البحث بالصور وفي بطاقات المشاركة.",
      items: productsMissingImages.map((item) => ({ id: item.id, label: item.name })),
      basePath: "/admin/products",
    },
    {
      label: "مشاريع بلا وصف Meta",
      count: projectsMissingSeo.length,
      total: projectTotal,
      href: "/admin/portfolio",
      hint: "صفحات معرض الأعمال من أقوى صفحات جذب البحث المحلي.",
      items: projectsMissingSeo.map((item) => ({ id: item.id, label: item.title })),
      basePath: "/admin/portfolio",
    },
    {
      label: "خدمات بلا وصف Meta",
      count: servicesMissingSeo.length,
      total: serviceTotal,
      href: "/admin/services",
      hint: "صفحات الخدمات هي ما يبحث عنه العميل عادةً («طباعة بوكسات الرياض»).",
      items: servicesMissingSeo.map((item) => ({ id: item.id, label: item.title })),
      basePath: "/admin/services",
    },
  ];

  const totalIssues =
    checks.reduce((sum, check) => sum + check.count, 0) + imagesMissingAlt;

  return (
    <>
      <AdminHeading
        title="تحسين محركات البحث"
        description="الإعدادات الافتراضية وحالة تهيئة الصفحات لمحركات البحث."
        action={
          <ButtonLink href={`${siteUrl}/sitemap.xml`} external variant="outline" size="sm">
            عرض خريطة الموقع
          </ButtonLink>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="نقاط تحتاج معالجة"
          value={totalIssues}
          icon="alert"
          tone={totalIssues === 0 ? "success" : "warning"}
          hint={totalIssues === 0 ? "كل الصفحات مهيّأة" : undefined}
        />
        <StatCard label="منتجات منشورة" value={productTotal} icon="package" />
        <StatCard label="مشاريع منشورة" value={projectTotal} icon="image" />
        <StatCard label="خدمات منشورة" value={serviceTotal} icon="sparkles" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminCard
          title="الإعدادات الافتراضية"
          description="تُستخدم في الصفحات التي لا تحدّد عنوانًا أو وصفًا خاصًا بها."
        >
          <SeoDefaultsForm
            defaultTitle={settings?.defaultSeoTitle ?? ""}
            defaultDescription={settings?.defaultSeoDescription ?? ""}
          />
        </AdminCard>

        <AdminCard
          title="ما يعمل تلقائيًا"
          description="لا يحتاج منك أي إعداد — مبني في الموقع."
        >
          <ul className="space-y-3 text-sm">
            {[
              "خريطة الموقع sitemap.xml تُبنى من قاعدة البيانات وتشمل كل منتج وقسم وخدمة ومشروع.",
              "ملف robots.txt يمنع فهرسة السلة وإتمام الطلب ولوحة التحكم.",
              "بيانات منظّمة JSON-LD: المنشأة، المنتجات وأسعارها، مسار التنقّل، والأسئلة الشائعة.",
              "روابط canonical وبطاقات Open Graph لكل صفحة.",
              "الصور تُحوَّل إلى WebP وتُحمَّل تحميلاً كسولاً.",
            ].map((item) => (
              <li key={item} className="flex gap-2.5">
                <Icon
                  name="check"
                  className="text-success-600 mt-0.5 size-4 shrink-0"
                  strokeWidth={2.5}
                />
                <span className="text-primary-700 leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </AdminCard>
      </div>

      <div className="mt-6 space-y-4">
        {imagesMissingAlt > 0 ? (
          <AdminCard>
            <div className="flex items-start gap-3">
              <Icon name="alert" className="text-warning-600 mt-0.5 size-5 shrink-0" />
              <div>
                <p className="font-bold">
                  {imagesMissingAlt} صورة منتج بلا نص بديل
                </p>
                <p className="text-primary-600 mt-1 text-sm leading-relaxed">
                  النص البديل يصف الصورة لقارئات الشاشة ولمحركات البحث. افتح المنتج
                  وأضف وصفًا مختصرًا لكل صورة.
                </p>
                <ButtonLink href="/admin/products" size="sm" variant="outline" className="mt-3">
                  فتح المنتجات
                </ButtonLink>
              </div>
            </div>
          </AdminCard>
        ) : null}

        {checks
          .filter((check) => check.count > 0)
          .map((check) => (
            <AdminCard key={check.label}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-bold">
                    <span
                      className={cn(
                        "grid size-6 place-items-center rounded-full text-xs font-bold",
                        "bg-warning-50 text-warning-700",
                      )}
                    >
                      {check.count}
                    </span>
                    {check.label}
                  </p>

                  <p className="text-primary-600 mt-1.5 text-sm leading-relaxed">
                    {check.hint}
                  </p>

                  <ul className="mt-3 flex flex-wrap gap-2">
                    {check.items.slice(0, 8).map((item) => (
                      <li key={item.id}>
                        <Link
                          href={`${check.basePath}/${item.id}`}
                          className="border-border text-primary-700 hover:border-accent-600 hover:text-accent-700 inline-block rounded-md border px-2.5 py-1 text-xs transition-colors"
                        >
                          {item.label}
                        </Link>
                      </li>
                    ))}
                    {check.items.length > 8 ? (
                      <li className="text-primary-500 self-center text-xs">
                        و{check.items.length - 8} غيرها
                      </li>
                    ) : null}
                  </ul>
                </div>
              </div>
            </AdminCard>
          ))}

        {totalIssues === 0 ? (
          <AdminCard>
            <div className="flex items-start gap-3">
              <Icon name="check" className="text-success-600 mt-0.5 size-5 shrink-0" strokeWidth={2.5} />
              <div>
                <p className="font-bold">كل الصفحات المنشورة مهيّأة لمحركات البحث</p>
                <p className="text-primary-600 mt-1 text-sm leading-relaxed">
                  لكل منتج وخدمة ومشروع منشور وصف Meta وصور بنصوص بديلة.
                </p>
              </div>
            </div>
          </AdminCard>
        ) : null}
      </div>
    </>
  );
}

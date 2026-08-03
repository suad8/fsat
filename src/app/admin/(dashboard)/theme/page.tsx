import {
  ThemeEditor,
  type SectionRow,
} from "@/app/admin/(dashboard)/theme/ThemeEditor";
import { AdminHeading } from "@/components/admin/AdminUi";
import { ButtonLink } from "@/components/ui/Button";
import { prisma } from "@/lib/prisma";
import { getTheme } from "@/lib/theme-server";

export const metadata = { title: "تصميم الموقع" };

/** التسميات العربية للأقسام — مفاتيحها ثابتة ومرتبطة بمكوّنات في الكود. */
const SECTION_LABELS: Record<string, { label: string; locked?: boolean }> = {
  products: { label: "المنتجات الأكثر طلبًا" },
  portfolio: { label: "معرض الأعمال" },
  services: { label: "الخدمات" },
  whyUs: { label: "لماذا نحن" },
  orderSteps: { label: "خطوات الطلب" },
  testimonials: { label: "آراء العملاء" },
  contact: { label: "التواصل وطلب عرض السعر", locked: true },
};

export default async function AdminThemePage() {
  const [theme, rows] = await Promise.all([
    getTheme(),
    prisma.homeSection.findMany({ orderBy: { order: "asc" } }),
  ]);

  const sections: SectionRow[] = rows
    .filter((row) => row.key in SECTION_LABELS)
    .map((row) => ({
      key: row.key,
      label: SECTION_LABELS[row.key].label,
      locked: SECTION_LABELS[row.key].locked,
      // القسم المقفل يبقى ظاهرًا دائمًا مهما كانت قيمته المخزّنة
      isActive: SECTION_LABELS[row.key].locked ? true : row.isActive,
      order: row.order,
      eyebrow: row.eyebrow ?? "",
      title: row.title ?? "",
      description: row.description ?? "",
    }));

  return (
    <>
      <AdminHeading
        title="تصميم الموقع"
        description="غيّر ألوان الموقع وخطّه وشكل أركانه، ورتّب أقسام الصفحة الرئيسية — كل شيء يُطبَّق فورًا دون كود."
        action={
          <ButtonLink href="/" external variant="outline" size="sm" iconAfter="externalLink">
            معاينة الموقع
          </ButtonLink>
        }
      />

      <ThemeEditor initialTheme={theme} initialSections={sections} />
    </>
  );
}

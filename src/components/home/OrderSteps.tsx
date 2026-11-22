import { ButtonLink } from "@/components/ui/Button";
import { StepsTimeline } from "@/components/home/StepsTimeline";
import type { IconName } from "@/components/ui/Icon";
import { Section, SectionHeading } from "@/components/ui/Section";

const STEPS: { icon: IconName; title: string; description: string }[] = [
  {
    icon: "package",
    title: "اختر المنتج أو الخدمة",
    description: "تصفّح المتجر أو الخدمات، واختر ما يناسب احتياجك.",
  },
  {
    icon: "settings",
    title: "حدّد المواصفات",
    description: "المقاس والخامة والكمية والتشطيب — والسعر يتحدّث أمامك لحظيًا.",
  },
  {
    icon: "upload",
    title: "ارفع التصميم أو الشعار",
    description: "أرفق ملفك، أو اطلب من فريقنا تصميمه لك من الصفر.",
  },
  {
    icon: "document",
    title: "استلم عرض السعر والمدة",
    description: "نراجع الملف فنيًا ونؤكد لك السعر النهائي ومدة التنفيذ.",
  },
  {
    icon: "check",
    title: "أكّد الطلب وادفع",
    description: "تحويل بنكي أو دفع عند الاستلام — وتصلك فاتورة ضريبية نظامية.",
  },
  {
    icon: "truck",
    title: "الإنتاج ثم الاستلام أو الشحن",
    description: "نبدأ الإنتاج ونبلّغك عند الجاهزية للاستلام أو نشحنه إليك.",
  },
];

/**
 * خطوات الطلب — خط زمني تفاعلي.
 *
 * العنوان والدعوة للإجراء مثبّتان (sticky) على الشاشات الكبيرة بينما يمرّ
 * القارئ على الخطوات، والخط يمتلئ مع التمرير (انظر StepsTimeline).
 */
/** العناوين قابلة للتعديل من /admin/theme — تسقط للافتراضي إن تُركت فارغة. */
export function OrderSteps({
  heading,
}: {
  heading?: { eyebrow?: string; title?: string; description?: string };
} = {}) {
  return (
    <Section id="how-to-order">
      <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:sticky lg:top-32 lg:col-span-5 lg:self-start">
          <SectionHeading
            align="start"
            className="mb-8 md:mb-8"
            eyebrow={heading?.eyebrow ?? "خطوات الطلب"}
            title={heading?.title ?? "من الفكرة إلى الاستلام في ست خطوات"}
            description={
              heading?.description ??
              "مسار واضح بلا مفاجآت — تعرف في كل مرحلة أين وصل طلبك وما الخطوة التالية."
            }
          />

          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/shop" size="lg" iconAfter="arrowLeft">
              ابدأ الطلب الآن
            </ButtonLink>
            <ButtonLink href="/faq" size="lg" variant="outline">
              الأسئلة الشائعة
            </ButtonLink>
          </div>
        </div>

        <div className="lg:col-span-7">
          <StepsTimeline steps={STEPS} />
        </div>
      </div>
    </Section>
  );
}

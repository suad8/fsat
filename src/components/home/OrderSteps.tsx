import { ButtonLink } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";
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
 * خطوات الطلب.
 *
 * الخط الرابط بين الخطوات أفقي على الشاشات الكبيرة ورأسي على الجوال،
 * وهو عنصر زخرفي مخفي عن قارئ الشاشة — الترتيب يفهمه القارئ من ترقيم
 * القائمة نفسه.
 */
/** العناوين قابلة للتعديل من /admin/theme — تسقط للافتراضي إن تُركت فارغة. */
export function OrderSteps({
  heading,
}: {
  heading?: { eyebrow?: string; title?: string; description?: string };
} = {}) {
  return (
    <Section id="how-to-order">
      <SectionHeading
        eyebrow={heading?.eyebrow ?? "خطوات الطلب"}
        title={heading?.title ?? "من الفكرة إلى الاستلام في ست خطوات"}
        description={heading?.description ?? "مسار واضح بلا مفاجآت — تعرف في كل مرحلة أين وصل طلبك وما الخطوة التالية."}
      />

      <ol className="relative grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-8 lg:gap-y-10">
        {STEPS.map((step, index) => (
          <Reveal
            as="li"
            key={step.title}
            delay={Math.min(index * 70, 350)}
            className="relative"
          >
            <div className="flex items-start gap-4">
              <span className="relative shrink-0">
                <span
                  aria-hidden="true"
                  className="border-border bg-surface text-primary-950 shadow-card grid size-14 place-items-center rounded-xl border"
                >
                  <Icon name={step.icon} className="size-6" strokeWidth={1.5} />
                </span>

                <span
                  aria-hidden="true"
                  className="bg-brand-600 absolute -top-2 -right-2 grid size-7 place-items-center rounded-full text-xs font-bold text-white shadow-sm"
                >
                  {index + 1}
                </span>
              </span>

              <div className="min-w-0 flex-1 pt-1">
                <h3 className="text-base font-bold">{step.title}</h3>
                <p className="text-primary-600 mt-1.5 text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          </Reveal>
        ))}
      </ol>

      <div className="mt-12 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/shop" size="lg" iconAfter="arrowLeft">
          ابدأ الطلب الآن
        </ButtonLink>
        <ButtonLink href="/faq" size="lg" variant="outline">
          الأسئلة الشائعة
        </ButtonLink>
      </div>
    </Section>
  );
}

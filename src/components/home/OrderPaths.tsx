import { ButtonLink } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";
import { Section, SectionHeading } from "@/components/ui/Section";
import { whatsappGeneralUrl } from "@/lib/whatsapp";

const PATHS: {
  icon: IconName;
  title: string;
  description: string;
  cta: string;
  href: string;
  external?: boolean;
  variant: "accent" | "primary" | "whatsapp";
}[] = [
  {
    icon: "cart",
    title: "اشترِ مباشرة",
    description:
      "اختر المنتج والمقاس والخامة والكمية، والسعر يتحدّث أمامك. أضفه للسلة وأتمّ الطلب.",
    cta: "تصفّح المتجر",
    href: "/shop",
    variant: "accent",
  },
  {
    icon: "document",
    title: "اطلب عرض سعر",
    description:
      "مشروع بمواصفات خاصة؟ اشرح لنا ما تريد وسيصلك عرض سعر واضح خلال يوم عمل.",
    cta: "اطلب عرض سعر",
    href: "/quote",
    variant: "primary",
  },
  {
    icon: "whatsapp",
    title: "تحدّث معنا مباشرة",
    description:
      "الأسرع: راسلنا على واتساب بما تحتاجه وسيردّ عليك مختص ويتابع طلبك خطوة بخطوة.",
    cta: "افتح واتساب",
    href: whatsappGeneralUrl(),
    external: true,
    variant: "whatsapp",
  },
];

/**
 * ثلاث طرق للطلب — أول سؤال عند العميل: «كيف أطلب؟». تُجاب هنا بثلاث
 * بطاقات متساوية، كل واحدة تنتهي بزر واحد واضح.
 */
export function OrderPaths() {
  return (
    <Section id="order-paths">
      <SectionHeading
        eyebrow="كيف تطلب"
        title="ثلاث طرق، اختر الأنسب لك"
        description="سواء كنت تعرف ما تريد بالضبط أو تحتاج مشورة، لدينا مسار مناسب."
      />

      <ul className="grid gap-4 md:grid-cols-3 lg:gap-6">
        {PATHS.map((path, index) => (
          <Reveal as="li" key={path.title} delay={index * 90}>
            <div className="border-border bg-surface shadow-card hover:shadow-card-hover flex h-full flex-col rounded-3xl border p-7 transition-shadow duration-300 md:p-8">
              <span
                aria-hidden="true"
                className="bg-ink text-accent-400 mb-6 grid size-14 place-items-center rounded-2xl"
              >
                <Icon name={path.icon} className="size-7" strokeWidth={1.5} />
              </span>
              <h3 className="text-xl font-black md:text-2xl">{path.title}</h3>
              <p className="text-primary-600 mt-3 flex-1 leading-relaxed">{path.description}</p>
              <ButtonLink
                href={path.href}
                external={path.external}
                variant={path.variant}
                size="lg"
                iconAfter="arrowLeft"
                className="mt-7 w-full"
              >
                {path.cta}
              </ButtonLink>
            </div>
          </Reveal>
        ))}
      </ul>
    </Section>
  );
}

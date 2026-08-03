import type { Metadata } from "next";

import { WhyUs } from "@/components/home/WhyUs";
import { PageHeader } from "@/components/site/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { Icon, resolveIcon } from "@/components/ui/Icon";
import { Section, SectionHeading } from "@/components/ui/Section";
import { brand } from "@/config/brand";
import { getCategories, getEquipment, getServices } from "@/lib/queries";
import { breadcrumbJsonLd, JsonLd, organizationJsonLd } from "@/lib/seo";
import { getSettings } from "@/lib/settings";
import { whatsappGeneralUrl } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "من نحن",
  description:
    "تعرّف على مصنعنا للطباعة والتجهيزات الدعائية: إمكانياتنا، مكائننا، طريقة عملنا، والقطاعات التي نخدمها داخل المملكة العربية السعودية.",
  alternates: { canonical: "/about" },
};

export default async function AboutPage() {
  const [settings, services, categories, equipment] = await Promise.all([
    getSettings(),
    getServices(),
    getCategories(),
    getEquipment(),
  ]);

  const years = new Date().getFullYear() - brand.foundedYear;

  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([{ label: "من نحن", href: "/about" }]),
          organizationJsonLd(settings),
        ]}
      />

      <PageHeader
        eyebrow="من نحن"
        title="مصنع طباعة متكامل، لا وسيط بينك وبين المنتج"
        description={`نعمل في الطباعة والتجهيزات الدعائية منذ ${years} سنة. نملك خط الإنتاج داخل مصنعنا — من التصميم والطباعة إلى القص والتشطيب والتركيب — فنتحكّم في الجودة والمدة والتكلفة بدل أن نعتمد على موردين خارجيين.`}
        breadcrumbs={[{ label: "من نحن", href: "/about" }]}
        action={
          <ButtonLink href="/portfolio" variant="accent" size="lg">
            شاهد أعمالنا
          </ButtonLink>
        }
      />

      {/* --- أرقام --- */}
      <Section tone="default" className="border-border border-b">
        <dl className="grid grid-cols-2 gap-6 md:grid-cols-4">
          <Figure value={`+${years}`} label="سنوات في السوق" />
          <Figure value={`+${services.length}`} label="خدمة طباعة" />
          <Figure value={`+${categories.length}`} label="قسم منتجات" />
          <Figure value={`+${equipment.length}`} label="ماكينة إنتاج" />
        </dl>
      </Section>

      {/* --- القصة --- */}
      <Section tone="default">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 className="text-2xl md:text-3xl">كيف نعمل</h2>

            <div className="text-primary-700 mt-6 space-y-4 leading-[1.9]">
              <p>
                بدأنا بخدمة طباعة واحدة، ثم أضفنا خطوط إنتاج جديدة كلما وجدنا أن
                عملاءنا يضطرون للذهاب لجهة أخرى لإكمال طلبهم. اليوم يغطي المصنع دورة
                كاملة: التغليف، المطبوعات الورقية، الاستيكرات، طباعة UV، الأكريليك،
                اللوحات، البنرات، الملابس، والهدايا الدعائية.
              </p>

              <p>
                هذا التكامل ليس شعارًا تسويقيًا — له أثر عملي مباشر. عندما يمرّ الطلب
                داخل مصنع واحد تقلّ نقاط التسليم بين الأطراف، وتقلّ معها فرص التأخير
                واختلاف الألوان بين دفعة وأخرى، وتصبح مدة التنفيذ قابلة للالتزام بها
                لا مجرد تقدير.
              </p>

              <p>
                نبدأ كل طلب بمراجعة فنية للملف قبل الإنتاج: دقة الصور، نظام الألوان،
                الهوامش، وحدود القص. كثير من أخطاء الطباعة المكلفة تُكتشف في هذه
                المرحلة — وتصحيحها هنا يكلّف دقائق، بينما اكتشافها بعد طباعة آلاف
                النسخ يكلّف الطلب كاملاً.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/equipment" size="lg" iconAfter="arrowLeft">
                معدات وتقنيات الطباعة
              </ButtonLink>
              <ButtonLink
                href={whatsappGeneralUrl("/about")}
                external
                size="lg"
                variant="outline"
                icon="whatsapp"
              >
                تحدّث معنا
              </ButtonLink>
            </div>
          </div>

          {/* --- ما نغطّيه --- */}
          <div>
            <h2 className="text-2xl md:text-3xl">ما نغطّيه</h2>

            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {services.map((service) => (
                <li
                  key={service.id}
                  className="border-border bg-surface-muted flex items-start gap-3 rounded-lg border p-3.5"
                >
                  <span
                    aria-hidden="true"
                    className="bg-surface text-accent-700 ring-border grid size-9 shrink-0 place-items-center rounded-lg ring-1"
                  >
                    <Icon name={resolveIcon(service.iconKey)} className="size-4" />
                  </span>
                  <span className="text-primary-800 pt-1.5 text-sm font-medium">
                    {service.title}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* --- من نخدم --- */}
      <Section tone="muted">
        <SectionHeading
          eyebrow="عملاؤنا"
          title="القطاعات التي نخدمها"
          description="لكل قطاع متطلباته في الخامة والمقاس ومدة التنفيذ — وخبرتنا في التعامل معها توفّر عليك جولات التجربة والخطأ."
        />

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: "cup" as const,
              title: "المطاعم والمقاهي",
              text: "أكواب، بوكسات، أكياس، قوائم طعام، واستيكرات تغليف آمنة غذائيًا.",
            },
            {
              icon: "package" as const,
              title: "المتاجر الإلكترونية",
              text: "تغليف مطبوع بهويتك، استيكرات شحن، وبطاقات شكر داخل الطرد.",
            },
            {
              icon: "sign" as const,
              title: "المحلات التجارية",
              text: "لوحات واجهات مضيئة، لوحات إرشادية، وستاندات عرض أكريليك.",
            },
            {
              icon: "users" as const,
              title: "الجهات المؤسسية",
              text: "هدايا دعائية، أجندات، زي موحّد، ومطبوعات إدارية بالهوية الرسمية.",
            },
            {
              icon: "rocket" as const,
              title: "الفعاليات والمعارض",
              text: "بنرات، رول أب، ستاندات، وهدايا زوّار بتنفيذ سريع.",
            },
            {
              icon: "palette" as const,
              title: "وكالات التسويق",
              text: "تنفيذ مطبوعات عملائكم بجودة ثابتة ومواعيد يمكن الالتزام بها.",
            },
          ].map((sector) => (
            <li
              key={sector.title}
              className="border-border bg-surface rounded-xl border p-6"
            >
              <span
                aria-hidden="true"
                className="bg-primary-950 mb-4 grid size-11 place-items-center rounded-lg text-white"
              >
                <Icon name={sector.icon} className="size-[1.35rem]" />
              </span>
              <h3 className="text-base font-bold">{sector.title}</h3>
              <p className="text-primary-600 mt-2 text-sm leading-relaxed">
                {sector.text}
              </p>
            </li>
          ))}
        </ul>
      </Section>

      <WhyUs />

      {/* --- دعوة --- */}
      <Section tone="dark">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl text-white md:text-3xl">جاهزون لتنفيذ مشروعك</h2>
          <p className="text-primary-300 mt-4 leading-relaxed">
            أرسل لنا ما تحتاجه، وسيتواصل معك مختص بعرض سعر ومدة تنفيذ واضحة خلال يوم
            عمل واحد.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/quote" size="lg" variant="accent">
              طلب عرض سعر
            </ButtonLink>
            <ButtonLink href="/shop" size="lg" variant="outline" className="border-primary-700 bg-transparent text-white hover:border-primary-500 hover:bg-primary-900 hover:text-white">
              تصفّح المنتجات
            </ButtonLink>
          </div>
        </div>
      </Section>
    </>
  );
}

function Figure({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col-reverse text-center">
      <dt className="text-primary-600 mt-1.5 text-sm">{label}</dt>
      <dd className="font-display text-primary-950 text-3xl font-extrabold md:text-4xl">
        {value}
      </dd>
    </div>
  );
}

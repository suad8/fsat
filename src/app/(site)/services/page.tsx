import type { Metadata } from "next";

import { ClosingCta } from "@/components/pages/ClosingCta";
import { PageSection } from "@/components/pages/PageSection";
import { ServiceCard } from "@/components/services/ServiceCard";
import { PageHeader } from "@/components/site/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";
import { getServices } from "@/lib/queries";
import { breadcrumbJsonLd, JsonLd } from "@/lib/seo";
import { getSettings } from "@/lib/settings";
import { absoluteUrl } from "@/lib/utils";
import { whatsappGeneralUrl } from "@/lib/whatsapp";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();

  return {
    title: `خدمات الطباعة والتجهيزات الدعائية في ${settings.city}`,
    description: `خدمات الطباعة الكاملة في ${settings.city} والمملكة: بوكسات وتغليف، أكواب، مطبوعات ورقية، استيكرات، طباعة UV، أكريليك، لوحات وفلكس، طباعة ملابس وهدايا دعائية. اطلب عرض سعر خلال يوم عمل.`,
    alternates: { canonical: "/services" },
  };
}

const HOW: { icon: IconName; title: string; text: string }[] = [
  {
    icon: "document",
    title: "اختر الخدمة وأرسل المواصفات",
    text: "النوع والمقاس والكمية تكفي للبدء، والتصميم اختياري.",
  },
  {
    icon: "search",
    title: "نراجع ونسعّر",
    text: "مختص يراجع الطلب فنيًا ويحدّد السعر والمدة.",
  },
  {
    icon: "check",
    title: "يصلك عرض واضح خلال يوم عمل",
    text: "تعتمد، فنبدأ التنفيذ داخل المصنع.",
  },
];

export default async function ServicesPage() {
  const [services, settings] = await Promise.all([getServices(), getSettings()]);

  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([{ label: "الخدمات", href: "/services" }]),
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "خدمات الطباعة والتجهيزات الدعائية",
            itemListElement: services.map((service, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: service.title,
              url: absoluteUrl(`/services/${service.slug}`),
            })),
          },
        ]}
      />

      <PageHeader
        eyebrow="خدماتنا"
        title={`خدمات الطباعة والتجهيزات الدعائية في ${settings.city}`}
        description="من اختيار الخامة إلى الطباعة والتشطيب والتركيب — كل خدمة تُنفَّذ داخل مصنعنا. اختر الخدمة التي تشبه مشروعك."
        breadcrumbs={[{ label: "الخدمات", href: "/services" }]}
        action={
          <ButtonLink href="/quote" variant="accent" size="lg" iconAfter="arrowLeft">
            اطلب عرض سعر
          </ButtonLink>
        }
      />

      <PageSection className="pt-12 md:pt-16">
        {services.length === 0 ? (
          <EmptyState
            icon="sparkles"
            title="نجهّز قائمة الخدمات"
            description="أخبرنا بما تحتاج طباعته وسنوجّهك للتقنية والخامة المناسبتين."
            action={
              <ButtonLink href="/quote" size="lg">
                اطلب عرض سعر
              </ButtonLink>
            }
          />
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service, index) => (
              <Reveal as="li" key={service.id} delay={Math.min((index % 3) * 70, 210)}>
                <ServiceCard service={service} index={index + 1} />
              </Reveal>
            ))}
          </ul>
        )}
      </PageSection>

      <PageSection
        tone="muted"
        eyebrow="كيف نبدأ"
        headingId="how-title"
        title="لا تعرف أي خدمة تناسبك؟ ابدأ بوصف فكرتك"
        description="لا يلزمك تحديد التقنية؛ صف ما تريد، ونقترح الأنسب جودةً وتكلفةً ومدة."
      >
        <ol className="grid gap-5 md:grid-cols-3">
          {HOW.map((step, index) => (
            <Reveal as="li" key={step.title} delay={index * 70}>
              <div className="border-border bg-surface h-full rounded-2xl border p-6">
                <span
                  aria-hidden="true"
                  className="bg-ink text-accent-400 mb-4 grid size-11 place-items-center rounded-xl"
                >
                  <Icon name={step.icon} className="size-5" />
                </span>
                <h3 className="text-base font-bold">
                  <span className="text-accent-700 me-2">{index + 1}.</span>
                  {step.title}
                </h3>
                <p className="text-primary-600 mt-2 text-sm leading-relaxed">{step.text}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </PageSection>

      <ClosingCta
        title="جاهز لتبدأ مشروعك؟"
        description="أرسل ما تحتاجه الآن ويصلك عرض سعر ومدة تنفيذ واضحة خلال يوم عمل."
        primary={{ label: "اطلب عرض سعر", href: "/quote", icon: "document" }}
        secondary={{
          label: "اسأل على واتساب",
          href: whatsappGeneralUrl("/services"),
          icon: "whatsapp",
          external: true,
        }}
      />
    </>
  );
}

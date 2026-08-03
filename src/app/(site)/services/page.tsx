import type { Metadata } from "next";

import { ServiceCard } from "@/components/services/ServiceCard";
import { PageHeader } from "@/components/site/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Reveal } from "@/components/ui/Reveal";
import { getServices } from "@/lib/queries";
import { breadcrumbJsonLd, JsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "خدمات الطباعة والتجهيزات الدعائية",
  description:
    "خدمات الطباعة الكاملة: طباعة البوكسات والتغليف، الأكواب الورقية والبلاستيكية، المطبوعات الورقية، الاستيكرات، طباعة UV، قص وطباعة الأكريليك، اللوحات الإعلانية والمضيئة، الفلكس والبنرات، الطباعة على الملابس، الهدايا الدعائية، والتصميم حسب الطلب.",
  alternates: { canonical: "/services" },
};

export default async function ServicesPage() {
  const services = await getServices();

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ label: "الخدمات", href: "/services" }])} />

      <PageHeader
        eyebrow="خدماتنا"
        title="حلول الطباعة والتجهيزات الدعائية تحت سقف واحد"
        description="نغطّي دورة الإنتاج كاملة — من دراسة المنتج واختيار الخامة، إلى التصميم والطباعة والتشطيب والتركيب. كل خدمة تُنفَّذ داخل مصنعنا لا عبر وسطاء."
        breadcrumbs={[{ label: "الخدمات", href: "/services" }]}
        action={
          <ButtonLink href="/quote" variant="accent" size="lg">
            طلب عرض سعر
          </ButtonLink>
        }
      />

      <div className="container-page py-10 md:py-14">
        {services.length === 0 ? (
          <EmptyState
            icon="sparkles"
            title="لم تُضَف خدمات بعد"
            description="تُضاف الخدمات وتُحرَّر من لوحة التحكم."
            action={
              <ButtonLink href="/contact" size="lg">
                تواصل معنا
              </ButtonLink>
            }
          />
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service, index) => (
              <Reveal as="li" key={service.id} delay={Math.min(index * 50, 300)}>
                <ServiceCard service={service} />
              </Reveal>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

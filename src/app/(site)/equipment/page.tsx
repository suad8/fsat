import type { Metadata } from "next";
import Link from "next/link";

import { ClosingCta } from "@/components/pages/ClosingCta";
import { MediaFrame } from "@/components/pages/MediaFrame";
import { PageSection } from "@/components/pages/PageSection";
import { insightFor } from "@/components/pages/insights";
import { PageHeader } from "@/components/site/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";
import { getEquipment, getServices } from "@/lib/queries";
import { breadcrumbJsonLd, JsonLd } from "@/lib/seo";
import { whatsappGeneralUrl } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "معدات وتقنيات الطباعة",
  description:
    "المكائن التي ننفّذ بها طلباتك: ماذا تُنتج كل ماكينة وما الذي يعنيه ذلك لمشروعك — أوفست، UV مسطّحة، قص ليزر، طباعة بعرض كبير، قص وتكسير، وتغليف حراري.",
  alternates: { canonical: "/equipment" },
};

type Spec = { label: string; value: string };

export default async function EquipmentPage() {
  const [equipment, services] = await Promise.all([getEquipment(), getServices()]);

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([{ label: "معدات وتقنيات الطباعة", href: "/equipment" }])}
      />

      <PageHeader
        eyebrow="الإمكانيات"
        title="المكائن التي تُنتج طلبك"
        description="لكل ماكينة وظيفة محددة. هنا ما تُنتجه كل منها، وكيف ينعكس ذلك على جودة مشروعك ومدته وتكلفته."
        breadcrumbs={[{ label: "معدات وتقنيات الطباعة", href: "/equipment" }]}
        action={
          <ButtonLink href="/quote" variant="accent" size="lg" iconAfter="arrowLeft">
            اطلب عرض سعر
          </ButtonLink>
        }
      />

      <PageSection className="pt-12 md:pt-16">
        {equipment.length === 0 ? (
          <EmptyState
            icon="settings"
            title="نجهّز عرض معداتنا"
            description="تواصل معنا وأخبرنا بمشروعك، وسنوضّح لك التقنية التي ستُنفَّذ بها."
            action={
              <ButtonLink href="/contact" size="lg">
                تواصل معنا
              </ButtonLink>
            }
          />
        ) : (
          <ul className="space-y-6 md:space-y-8">
            {equipment.map((machine, index) => {
              const specs = Array.isArray(machine.specs)
                ? (machine.specs as unknown as Spec[]).filter((spec) => spec?.label && spec?.value)
                : [];
              const insight = insightFor(machine.name, machine.description);
              const linked = insight
                ? services.filter((service) =>
                    insight.services.some((pattern) => pattern.test(service.title)),
                  )
                : [];

              return (
                <Reveal as="li" key={machine.id}>
                  <article className="border-border bg-surface shadow-card grid overflow-hidden rounded-3xl border md:grid-cols-5">
                    <div className="md:col-span-2">
                      <MediaFrame
                        src={machine.imageUrl}
                        alt={machine.imageAlt ?? machine.name}
                        icon="settings"
                        index={index + 1}
                        ratio="4/3"
                        className="h-full md:aspect-auto md:min-h-full"
                        sizes="(max-width: 768px) 100vw, 40vw"
                      />
                    </div>

                    <div className="p-6 md:col-span-3 md:p-9">
                      <h2 className="text-2xl leading-snug font-black md:text-[1.75rem]">
                        {machine.name}
                      </h2>

                      {machine.model ? (
                        <p className="text-primary-500 mt-1 text-sm" dir="ltr">
                          {machine.model}
                        </p>
                      ) : null}

                      {machine.description ? (
                        <p className="text-primary-700 mt-4 leading-[1.9]">
                          {machine.description}
                        </p>
                      ) : null}

                      {insight ? (
                        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                          <div className="bg-surface-muted border-border rounded-2xl border p-4">
                            <dt className="text-accent-700 flex items-center gap-2 text-xs font-bold">
                              <Icon name="package" className="size-4" />
                              ماذا نُنتج بها
                            </dt>
                            <dd className="text-primary-800 mt-2 text-sm leading-relaxed font-medium">
                              {insight.makes}
                            </dd>
                          </div>
                          <div className="bg-accent-50/60 border-accent-600/20 rounded-2xl border p-4">
                            <dt className="text-accent-700 flex items-center gap-2 text-xs font-bold">
                              <Icon name="award" className="size-4" />
                              ماذا يعني لك
                            </dt>
                            <dd className="text-primary-800 mt-2 text-sm leading-relaxed font-medium">
                              {insight.benefit}
                            </dd>
                          </div>
                        </dl>
                      ) : null}

                      {linked.length > 0 ? (
                        <p className="mt-5 flex flex-wrap items-center gap-2 text-sm">
                          <span className="text-primary-500">تُستخدم في:</span>
                          {linked.map((service) => (
                            <Link
                              key={service.id}
                              href={`/services/${service.slug}`}
                              className="border-border-strong text-primary-800 hover:border-accent-600 hover:text-accent-800 rounded-full border px-3 py-1 text-xs font-bold transition-colors"
                            >
                              {service.title}
                            </Link>
                          ))}
                        </p>
                      ) : null}

                      {specs.length > 0 ? (
                        <details className="group border-border mt-6 border-t pt-4">
                          <summary className="text-primary-700 hover:text-primary-950 flex cursor-pointer list-none items-center gap-2 text-sm font-bold">
                            <Icon
                              name="chevronDown"
                              className="size-4 transition-transform group-open:rotate-180"
                            />
                            المواصفات الفنية
                          </summary>
                          <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                            {specs.map((spec) => (
                              <div key={spec.label} className="min-w-0">
                                <dt className="text-primary-500 text-xs">{spec.label}</dt>
                                <dd className="text-primary-900 mt-0.5 text-sm font-bold">
                                  {spec.value}
                                </dd>
                              </div>
                            ))}
                          </dl>
                        </details>
                      ) : null}
                    </div>
                  </article>
                </Reveal>
              );
            })}
          </ul>
        )}
      </PageSection>

      <ClosingCta
        title="لست متأكدًا من التقنية المناسبة لمشروعك؟"
        description="اشرح لنا ما تريد تنفيذه، ونقترح الخامة والتقنية الأنسب من حيث الجودة والتكلفة والمدة."
        primary={{ label: "استشرنا في مشروعك", href: "/quote", icon: "document" }}
        secondary={{
          label: "واتساب",
          href: whatsappGeneralUrl("/equipment"),
          icon: "whatsapp",
          external: true,
        }}
      />
    </>
  );
}

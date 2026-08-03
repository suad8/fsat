import type { Metadata } from "next";

import { PageHeader } from "@/components/site/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { Section } from "@/components/ui/Section";
import { SmartImage } from "@/components/ui/SmartImage";
import { getEquipment } from "@/lib/queries";
import { breadcrumbJsonLd, JsonLd } from "@/lib/seo";
import { whatsappGeneralUrl } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "معدات وتقنيات الطباعة",
  description:
    "المكائن والتقنيات التي ننفّذ بها طلباتكم: طباعة أوفست، طباعة UV مسطّحة، قص ليزر، طباعة بعرض كبير، قص وتكسير، وتغليف حراري — بمواصفاتها وإمكانياتها.",
  alternates: { canonical: "/equipment" },
};

type Spec = { label: string; value: string };

export default async function EquipmentPage() {
  const equipment = await getEquipment();

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([{ label: "معدات وتقنيات الطباعة", href: "/equipment" }])}
      />

      <PageHeader
        eyebrow="الإمكانيات"
        title="معدات وتقنيات الطباعة"
        description="تنوّع المكائن يعني أن كل طلب يُنفَّذ بالتقنية الأنسب له لا بالمتاح فقط — وهذا ما يفرق بين نتيجة مقبولة ونتيجة تليق بعلامتك التجارية."
        breadcrumbs={[{ label: "معدات وتقنيات الطباعة", href: "/equipment" }]}
        action={
          <ButtonLink href="/quote" variant="accent" size="lg">
            اطلب عرض سعر
          </ButtonLink>
        }
      />

      <div className="container-page py-10 md:py-14">
        {equipment.length === 0 ? (
          <EmptyState
            icon="settings"
            title="لم تُضَف معدات بعد"
            description="تُضاف المكائن ومواصفاتها وصورها من لوحة التحكم."
            action={
              <ButtonLink href="/contact" size="lg">
                تواصل معنا
              </ButtonLink>
            }
          />
        ) : (
          <ul className="space-y-6">
            {equipment.map((machine, index) => {
              const specs = Array.isArray(machine.specs) ? (machine.specs as Spec[]) : [];
              const reversed = index % 2 === 1;

              return (
                <li
                  key={machine.id}
                  className="border-border bg-surface shadow-card overflow-hidden rounded-xl border"
                >
                  <div
                    className={`grid gap-0 md:grid-cols-5 ${reversed ? "md:[direction:ltr]" : ""}`}
                  >
                    <div className="md:col-span-2">
                      <SmartImage
                        src={machine.imageUrl}
                        alt={machine.imageAlt ?? machine.name}
                        ratio="4/3"
                        icon="settings"
                        placeholderLabel={machine.name}
                        className="h-full"
                        sizes="(max-width: 768px) 100vw, 40vw"
                      />
                    </div>

                    <div className="p-6 md:col-span-3 md:p-8 [direction:rtl]">
                      <h2 className="text-xl font-bold md:text-2xl">{machine.name}</h2>

                      {machine.model ? (
                        <p className="text-primary-500 mt-1 text-sm" dir="ltr">
                          {machine.model}
                        </p>
                      ) : null}

                      {machine.description ? (
                        <p className="text-primary-700 mt-4 leading-relaxed">
                          {machine.description}
                        </p>
                      ) : null}

                      {specs.length > 0 ? (
                        <dl className="border-border mt-6 grid gap-4 border-t pt-5 sm:grid-cols-2">
                          {specs.map((spec) => (
                            <div key={spec.label} className="flex gap-2.5">
                              <Icon
                                name="check"
                                className="text-accent-600 mt-0.5 size-4 shrink-0"
                                strokeWidth={2.5}
                              />
                              <div className="min-w-0">
                                <dt className="text-primary-500 text-xs">
                                  {spec.label}
                                </dt>
                                <dd className="text-primary-900 mt-0.5 text-sm font-bold">
                                  {spec.value}
                                </dd>
                              </div>
                            </div>
                          ))}
                        </dl>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Section tone="muted">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl md:text-3xl">لست متأكدًا من التقنية المناسبة لمشروعك؟</h2>
          <p className="text-primary-600 mt-4 leading-relaxed">
            اشرح لنا ما تريد تنفيذه، وسنقترح عليك التقنية والخامة الأنسب من حيث
            الجودة والتكلفة ومدة التنفيذ.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/quote" size="lg">
              استشرنا في مشروعك
            </ButtonLink>
            <ButtonLink
              href={whatsappGeneralUrl("/equipment")}
              external
              size="lg"
              variant="whatsapp"
              icon="whatsapp"
            >
              واتساب
            </ButtonLink>
          </div>
        </div>
      </Section>
    </>
  );
}

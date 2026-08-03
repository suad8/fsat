import type { Metadata } from "next";

import { PageHeader } from "@/components/site/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { getFaqs } from "@/lib/queries";
import { breadcrumbJsonLd, faqJsonLd, JsonLd } from "@/lib/seo";
import { whatsappGeneralUrl } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "الأسئلة الشائعة",
  description:
    "إجابات عن أكثر ما يسأل عنه عملاؤنا: كيفية الطلب، صيغ ملفات التصميم، مدد التنفيذ، طرق الدفع، الشحن داخل المملكة، وسياسة الاستبدال.",
  alternates: { canonical: "/faq" },
};

export default async function FaqPage() {
  const faqs = await getFaqs();

  // التجميع حسب التصنيف يساعد الزائر على القفز لقسمه مباشرة
  const grouped = faqs.reduce<Record<string, typeof faqs>>((accumulator, faq) => {
    const key = faq.category ?? "عام";
    (accumulator[key] ??= []).push(faq);
    return accumulator;
  }, {});

  const categories = Object.keys(grouped);

  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([{ label: "الأسئلة الشائعة", href: "/faq" }]),
          ...(faqs.length > 0
            ? [faqJsonLd(faqs.map((faq) => ({ question: faq.question, answer: faq.answer })))]
            : []),
        ]}
      />

      <PageHeader
        eyebrow="مركز المساعدة"
        title="الأسئلة الشائعة"
        description="جمعنا هنا أكثر ما يسأل عنه عملاؤنا. إن لم تجد إجابتك، نحن على واتساب."
        breadcrumbs={[{ label: "الأسئلة الشائعة", href: "/faq" }]}
      />

      <div className="container-page py-10 md:py-14">
        {faqs.length === 0 ? (
          <EmptyState
            icon="info"
            title="لم تُضَف أسئلة بعد"
            description="تُضاف الأسئلة الشائعة وتُحرَّر من لوحة التحكم."
            action={
              <ButtonLink href="/contact" size="lg">
                تواصل معنا
              </ButtonLink>
            }
          />
        ) : (
          <div className="grid gap-10 lg:grid-cols-4 lg:gap-12">
            {/* فهرس جانبي */}
            {categories.length > 1 ? (
              <nav aria-label="أقسام الأسئلة" className="lg:col-span-1">
                <div className="border-border bg-surface-muted sticky top-24 rounded-xl border p-5">
                  <h2 className="mb-3 text-sm font-bold">الأقسام</h2>
                  <ul className="space-y-2">
                    {categories.map((category) => (
                      <li key={category}>
                        <a
                          href={`#faq-${encodeURIComponent(category)}`}
                          className="text-primary-600 hover:text-accent-700 text-sm transition-colors"
                        >
                          {category}
                          <span className="text-primary-400 ms-1.5 text-xs">
                            ({grouped[category].length})
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </nav>
            ) : null}

            <div className={categories.length > 1 ? "lg:col-span-3" : "lg:col-span-4"}>
              {categories.map((category) => (
                <section
                  key={category}
                  id={`faq-${encodeURIComponent(category)}`}
                  className="mb-10 scroll-mt-28 last:mb-0"
                >
                  <h2 className="mb-4 text-xl font-bold">{category}</h2>

                  <ul className="space-y-3">
                    {grouped[category].map((faq) => (
                      <li key={faq.id}>
                        {/* <details> يعطي سلوك الطي أصلاً — يعمل بلا JavaScript */}
                        <details className="group border-border bg-surface hover:border-border-strong rounded-xl border transition-colors">
                          <summary className="focus-visible:outline-accent-600 flex cursor-pointer list-none items-center justify-between gap-4 p-5 font-bold focus-visible:outline-2 focus-visible:-outline-offset-2">
                            <span className="text-sm md:text-base">{faq.question}</span>
                            <Icon
                              name="chevronDown"
                              className="text-primary-400 size-5 shrink-0 transition-transform duration-300 group-open:rotate-180"
                            />
                          </summary>

                          <div className="border-border border-t px-5 py-4">
                            <p className="text-primary-700 text-sm leading-[1.9]">
                              {faq.answer}
                            </p>
                          </div>
                        </details>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}

              {/* دعوة للتواصل */}
              <div className="border-border bg-surface-muted mt-10 rounded-xl border p-6 text-center md:p-8">
                <h2 className="text-lg font-bold md:text-xl">لم تجد إجابتك؟</h2>
                <p className="text-primary-600 mx-auto mt-2.5 max-w-md text-sm leading-relaxed">
                  فريقنا جاهز للرد على أي استفسار حول المنتجات أو المواصفات أو الأسعار.
                </p>

                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <ButtonLink
                    href={whatsappGeneralUrl("/faq")}
                    external
                    variant="whatsapp"
                    icon="whatsapp"
                  >
                    اسألنا على واتساب
                  </ButtonLink>
                  <ButtonLink href="/contact" variant="outline">
                    صفحة اتصل بنا
                  </ButtonLink>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

import type { Metadata } from "next";

import { ClosingCta } from "@/components/pages/ClosingCta";
import { FaqExplorer } from "@/components/pages/FaqExplorer";
import { PageSection } from "@/components/pages/PageSection";
import { PageHeader } from "@/components/site/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { getFaqs } from "@/lib/queries";
import { breadcrumbJsonLd, faqJsonLd, JsonLd } from "@/lib/seo";
import { whatsappGeneralUrl } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "الأسئلة الشائعة",
  description:
    "إجابات عن أكثر ما يسأل عنه عملاؤنا: كيفية الطلب، ملفات التصميم، مدد التنفيذ، طرق الدفع، الشحن داخل المملكة، والاستبدال. ابحث عن سؤالك مباشرة.",
  alternates: { canonical: "/faq" },
};

export default async function FaqPage() {
  const faqs = await getFaqs();

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
        compact
        eyebrow="مركز المساعدة"
        title="الأسئلة الشائعة"
        description="ابحث عن سؤالك، أو تصفّح الأسئلة حسب مرحلتك: قبل الطلب، أثناء التنفيذ والدفع، أو بعد التسليم."
        breadcrumbs={[{ label: "الأسئلة الشائعة", href: "/faq" }]}
      />

      <PageSection className="pt-10 md:pt-14">
        {faqs.length === 0 ? (
          <EmptyState
            icon="info"
            title="نجهّز الأسئلة الشائعة"
            description="في الأثناء يسعدنا الرد على أي استفسار مباشرة."
            action={
              <ButtonLink
                href={whatsappGeneralUrl("/faq")}
                external
                size="lg"
                variant="whatsapp"
                icon="whatsapp"
              >
                اسألنا على واتساب
              </ButtonLink>
            }
          />
        ) : (
          <FaqExplorer
            faqs={faqs.map((faq) => ({
              id: faq.id,
              question: faq.question,
              answer: faq.answer,
              category: faq.category,
            }))}
          />
        )}
      </PageSection>

      {faqs.length > 0 ? (
        <ClosingCta
          title="لم تجد إجابتك؟"
          description="فريقنا يرد على استفساراتك حول المنتجات والمواصفات والأسعار."
          primary={{
            label: "اسألنا على واتساب",
            href: whatsappGeneralUrl("/faq"),
            icon: "whatsapp",
            external: true,
          }}
          secondary={{ label: "اطلب عرض سعر", href: "/quote", icon: "document" }}
        />
      ) : null}
    </>
  );
}

import type { Metadata } from "next";

import { QuoteWizard, type QuoteWizardDefaults } from "@/components/forms/QuoteWizard";
import { PageHeader } from "@/components/site/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";
import { getProductBySlug } from "@/lib/queries";
import { getQuoteFields } from "@/lib/quote-form";
import { breadcrumbJsonLd, JsonLd } from "@/lib/seo";
import { whatsappGeneralUrl } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "طلب عرض سعر",
  description:
    "طلب عرض سعر في ثلاث خطوات خفيفة: ما تحتاجه، المواصفات والملف، ثم بياناتك. يصلك السعر ومدة التنفيذ خلال يوم عمل.",
  alternates: { canonical: "/quote" },
};

type SearchParams = Promise<{
  product?: string;
  type?: string;
  size?: string;
  qty?: string;
  ref?: string;
  from?: string;
}>;

const AFTER: { icon: IconName; title: string; text: string }[] = [
  {
    icon: "search",
    title: "نراجع طلبك فنيًا",
    text: "نتحقق من الخامة والمقاس والملف قبل التسعير.",
  },
  {
    icon: "phone",
    title: "نتواصل معك خلال يوم عمل",
    text: "بعرض السعر ومدة التنفيذ عبر الطريقة التي تفضّلها.",
  },
  {
    icon: "check",
    title: "تعتمد ونبدأ",
    text: "نبدأ الإنتاج بعد اعتمادك ونبلغك عند الجاهزية.",
  },
];

export default async function QuotePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const fields = await getQuoteFields();

  // عند القدوم من صفحة خدمة أو منتج أو مشروع نعبّئ النموذج مسبقًا
  const product = params.product ? await getProductBySlug(params.product) : null;
  const typeOptions = fields.find((field) => field.key === "productType")?.options ?? [];

  let productType: string | undefined;
  const notes: string[] = [];

  const requested = params.type ?? product?.category.name;
  if (requested && typeOptions.includes(requested)) productType = requested;
  else if (requested) notes.push(`النوع المطلوب: ${requested}`);

  if (product) notes.push(`المنتج المطلوب: ${product.name}`);
  if (params.ref) notes.push(`مشروع مرجعي من معرض الأعمال: ${params.ref}`);

  const context = product
    ? `المنتج: ${product.name}`
    : params.ref
      ? `مشروع مرجعي: ${params.ref}`
      : productType
        ? `${params.from === "service" ? "الخدمة" : "النوع"}: ${productType}`
        : undefined;

  const defaults: QuoteWizardDefaults = {
    productType,
    productSlug: product?.slug ?? undefined,
    size: params.size,
    quantity: params.qty,
    description: notes.length > 0 ? `${notes.join("\n")}\n` : undefined,
    context,
  };

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ label: "طلب عرض سعر", href: "/quote" }])} />

      <PageHeader
        compact
        eyebrow="عرض سعر"
        title="اطلب عرض سعر في ثلاث خطوات"
        description="لا نطلب منك الكثير: ما تحتاجه، ثم المواصفات، ثم بياناتك. والتصميم اختياري."
        breadcrumbs={[{ label: "طلب عرض سعر", href: "/quote" }]}
      />

      <section className="bg-surface-muted py-10 md:py-16">
        <div className="container-page">
          <div className="grid gap-8 lg:grid-cols-3 lg:gap-12">
            {/* --- النموذج --- */}
            <div className="lg:col-span-2">
              <div className="border-border bg-surface shadow-card rounded-3xl border p-5 sm:p-8 md:p-10">
                <QuoteWizard fields={fields} defaults={defaults} />
              </div>
            </div>

            {/* --- ماذا بعد --- */}
            <aside className="space-y-5 lg:col-span-1">
              <div className="border-border bg-surface rounded-3xl border p-6 md:p-7">
                <h2 className="mb-5 text-lg font-black">ماذا يحدث بعد الإرسال؟</h2>

                <ol className="space-y-5">
                  {AFTER.map((item, index) => (
                    <li key={item.title} className="flex gap-3.5">
                      <span className="relative shrink-0">
                        <span
                          aria-hidden="true"
                          className="bg-ink text-accent-400 grid size-11 place-items-center rounded-xl"
                        >
                          <Icon name={item.icon} className="size-5" />
                        </span>
                        <span
                          aria-hidden="true"
                          className="bg-accent-500 text-accent-contrast absolute -top-1.5 -end-1.5 grid size-5 place-items-center rounded-full text-[0.65rem] font-black"
                        >
                          {index + 1}
                        </span>
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-bold">{item.title}</span>
                        <span className="text-primary-600 mt-1 block text-sm leading-relaxed">
                          {item.text}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="bg-ink grain relative overflow-hidden rounded-3xl p-6 text-white md:p-7">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-12 -end-12 size-40 rounded-full bg-[#25D366]/25 blur-[60px]"
                />
                <div className="relative">
                  <h2 className="text-lg font-black text-white">تفضّل أن تكتب لنا مباشرة؟</h2>
                  <p className="text-primary-300 mt-2 text-sm leading-relaxed">
                    أرسل ما تحتاجه على واتساب وسنكمل معك هناك.
                  </p>
                  <ButtonLink
                    href={whatsappGeneralUrl("/quote")}
                    external
                    variant="whatsapp"
                    icon="whatsapp"
                    fullWidth
                    className="mt-5"
                  >
                    تحدّث على واتساب
                  </ButtonLink>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}

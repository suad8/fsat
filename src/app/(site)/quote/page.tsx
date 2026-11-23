import type { Metadata } from "next";
import { Suspense } from "react";

import { QuoteForm } from "@/components/forms/QuoteForm";
import { PageHeader } from "@/components/site/PageHeader";
import { Icon, type IconName } from "@/components/ui/Icon";
import { getProductBySlug } from "@/lib/queries";
import { getQuoteFields } from "@/lib/quote-form";
import { breadcrumbJsonLd, JsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "طلب عرض سعر",
  description:
    "أرسل مواصفات طلبك — نوع المنتج، المقاس، الكمية، وملف التصميم — واستلم عرض سعر دقيقًا ومدة تنفيذ محددة خلال يوم عمل واحد.",
  alternates: { canonical: "/quote" },
};

type SearchParams = Promise<{
  product?: string;
  type?: string;
  size?: string;
  qty?: string;
  ref?: string;
}>;

const STEPS: { icon: IconName; title: string; description: string }[] = [
  {
    icon: "document",
    title: "أرسل المواصفات",
    description: "املأ النموذج بما تحتاجه وأرفق التصميم إن توفّر.",
  },
  {
    icon: "settings",
    title: "نراجع فنيًا",
    description: "نتحقق من الملف والخامة والمقاس ونحدّد أنسب طريقة تنفيذ.",
  },
  {
    icon: "whatsapp",
    title: "يصلك العرض",
    description: "سعر واضح ومدة تنفيذ محددة خلال يوم عمل واحد.",
  },
];

export default async function QuotePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const fields = await getQuoteFields();

  // عند القدوم من صفحة منتج نعبّئ النموذج مسبقًا حتى لا يعيد العميل الكتابة
  const product = params.product ? await getProductBySlug(params.product) : null;
  const defaultType = params.type ?? product?.name ?? undefined;

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ label: "طلب عرض سعر", href: "/quote" }])} />

      <PageHeader
        compact
        eyebrow="عرض سعر"
        title="أرسل مواصفات طلبك واستلم عرض السعر"
        description="كلما كانت التفاصيل أوضح، كان العرض أدقّ وأسرع. أرفق التصميم أو صورة توضيحية إن توفّرت."
        breadcrumbs={[{ label: "طلب عرض سعر", href: "/quote" }]}
      />

      <div className="container-page py-10 md:py-14">
        <div className="grid gap-10 lg:grid-cols-3 lg:gap-12">
          {/* --- النموذج --- */}
          <div className="lg:col-span-2">
            {product ? (
              <div className="border-accent-600/20 bg-accent-50 mb-6 flex items-start gap-3 rounded-xl border p-4">
                <Icon
                  name="package"
                  className="text-accent-700 mt-0.5 size-5 shrink-0"
                />
                <p className="text-primary-700 text-sm leading-relaxed">
                  طلب عرض سعر لمنتج{" "}
                  <span className="text-primary-950 font-bold">{product.name}</span> —
                  عبّأنا لك بعض الحقول، أكمل الباقي وأرسل.
                </p>
              </div>
            ) : null}

            {params.ref ? (
              <div className="border-border bg-surface-muted mb-6 flex items-start gap-3 rounded-xl border p-4">
                <Icon name="image" className="text-primary-500 mt-0.5 size-5 shrink-0" />
                <p className="text-primary-700 text-sm leading-relaxed">
                  مشروع مرجعي:{" "}
                  <span className="text-primary-950 font-bold">{params.ref}</span> —
                  اذكر في الوصف أي تعديلات تريدها عليه.
                </p>
              </div>
            ) : null}

            <div className="border-border bg-surface shadow-card rounded-xl border p-6 md:p-8">
              {/* Suspense لأن النموذج يُركّب على العميل ويقرأ القيم الابتدائية */}
              <Suspense fallback={<div className="h-96 animate-pulse" />}>
                <QuoteForm
                  fields={fields}
                  defaults={{
                    productType: defaultType,
                    productSlug: params.product,
                    size: params.size,
                    quantity: params.qty,
                  }}
                />
              </Suspense>
            </div>
          </div>

          {/* --- الشرح الجانبي --- */}
          <aside className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              <div className="border-border bg-surface-muted rounded-xl border p-6">
                <h2 className="mb-5 text-lg font-bold">كيف تسير العملية</h2>

                <ol className="space-y-5">
                  {STEPS.map((step, index) => (
                    <li key={step.title} className="flex gap-3.5">
                      <span className="relative shrink-0">
                        <span
                          aria-hidden="true"
                          className="bg-primary-950 grid size-10 place-items-center rounded-lg text-white"
                        >
                          <Icon name={step.icon} className="size-[1.15rem]" />
                        </span>
                        <span
                          aria-hidden="true"
                          className="bg-brand-600 absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full text-[0.65rem] font-bold text-white"
                        >
                          {index + 1}
                        </span>
                      </span>

                      <span className="min-w-0">
                        <span className="block text-sm font-bold">{step.title}</span>
                        <span className="text-primary-600 mt-1 block text-xs leading-relaxed">
                          {step.description}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="border-border bg-surface rounded-xl border p-6">
                <h2 className="mb-3 text-sm font-bold">نصائح لعرض سعر أدقّ</h2>
                <ul className="text-primary-600 space-y-2.5 text-xs leading-relaxed">
                  <li className="flex gap-2">
                    <Icon
                      name="check"
                      className="text-accent-600 mt-0.5 size-3.5 shrink-0"
                      strokeWidth={2.5}
                    />
                    اذكر المقاس بالسنتيمتر أو المتر بدقة.
                  </li>
                  <li className="flex gap-2">
                    <Icon
                      name="check"
                      className="text-accent-600 mt-0.5 size-3.5 shrink-0"
                      strokeWidth={2.5}
                    />
                    حدّد الكمية المطلوبة — السعر يتغيّر جوهريًا معها.
                  </li>
                  <li className="flex gap-2">
                    <Icon
                      name="check"
                      className="text-accent-600 mt-0.5 size-3.5 shrink-0"
                      strokeWidth={2.5}
                    />
                    أرفق ملف التصميم بصيغة PDF أو AI إن توفّر.
                  </li>
                  <li className="flex gap-2">
                    <Icon
                      name="check"
                      className="text-accent-600 mt-0.5 size-3.5 shrink-0"
                      strokeWidth={2.5}
                    />
                    وضّح موعد التسليم المطلوب إن كان الطلب مرتبطًا بمناسبة.
                  </li>
                </ul>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

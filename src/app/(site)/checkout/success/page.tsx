import type { Metadata } from "next";
import Link from "next/link";

import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Price } from "@/components/ui/Price";
import { getSettings } from "@/lib/settings";
import { whatsappReferenceUrl } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "تم استلام طلبك",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ order?: string; total?: string }>;

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const settings = await getSettings();

  const orderNumber = params.order?.trim();
  const total = Number.parseFloat(params.total ?? "");
  const hasTotal = Number.isFinite(total) && total > 0;

  return (
    <div className="container-page py-16 md:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <span className="bg-success-600 mx-auto mb-6 grid size-16 place-items-center rounded-full text-white">
          <Icon name="check" className="size-8" strokeWidth={2.5} />
        </span>

        <h1 className="text-2xl md:text-3xl">تم استلام طلبك بنجاح</h1>

        <p className="text-primary-600 mt-4 leading-relaxed">
          شكرًا لثقتك. سيراجع فريقنا تفاصيل طلبك ويتواصل معك خلال يوم عمل واحد
          لتأكيد المواصفات وبدء التنفيذ.
        </p>

        {orderNumber && orderNumber !== "—" ? (
          <div className="border-border bg-surface-muted mt-8 rounded-xl border p-6">
            <p className="text-primary-500 text-xs">رقم طلبك</p>
            <p
              className="text-primary-950 mt-1.5 font-mono text-2xl font-bold"
              dir="ltr"
            >
              {orderNumber}
            </p>

            {hasTotal ? (
              <div className="border-border mt-4 border-t pt-4">
                <p className="text-primary-500 mb-1 text-xs">إجمالي الطلب</p>
                <Price value={total} size="lg" />
              </div>
            ) : null}

            <p className="text-primary-500 mt-4 text-xs leading-relaxed">
              احتفظ بهذا الرقم — ستحتاجه عند متابعة طلبك معنا.
            </p>
          </div>
        ) : null}

        {/* الخطوات التالية — يقلّل اتصالات "ماذا بعد؟" */}
        <ol className="border-border mt-8 space-y-4 rounded-xl border p-6 text-right">
          <li className="flex gap-3">
            <span className="bg-primary-950 grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold text-white">
              ١
            </span>
            <span className="text-primary-700 text-sm leading-relaxed">
              نراجع مواصفات طلبك وملفات التصميم فنيًا.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="bg-primary-950 grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold text-white">
              ٢
            </span>
            <span className="text-primary-700 text-sm leading-relaxed">
              نتواصل معك على واتساب لتأكيد التفاصيل وطريقة السداد.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="bg-primary-950 grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold text-white">
              ٣
            </span>
            <span className="text-primary-700 text-sm leading-relaxed">
              يبدأ الإنتاج، ونبلّغك عند الجاهزية للاستلام أو الشحن.
            </span>
          </li>
        </ol>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {orderNumber && orderNumber !== "—" ? (
            <ButtonLink
              href={whatsappReferenceUrl(orderNumber, "order")}
              external
              size="lg"
              variant="whatsapp"
              icon="whatsapp"
            >
              متابعة الطلب على واتساب
            </ButtonLink>
          ) : null}

          <ButtonLink href="/shop" size="lg" variant="outline">
            متابعة التسوّق
          </ButtonLink>
        </div>

        <p className="text-primary-500 mt-8 text-sm">
          لأي استفسار:{" "}
          <a
            href={`tel:${settings.phone}`}
            className="text-accent-700 font-bold"
            dir="ltr"
          >
            {settings.phoneDisplay}
          </a>{" "}
          أو{" "}
          <Link href="/contact" className="text-accent-700 font-bold">
            صفحة اتصل بنا
          </Link>
        </p>
      </div>
    </div>
  );
}

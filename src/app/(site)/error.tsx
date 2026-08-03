"use client";

import { useEffect } from "react";

import { Button, ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { contact } from "@/config/brand";
import { whatsappGeneralUrl } from "@/lib/whatsapp";

/**
 * حدّ الخطأ للواجهة العامة.
 *
 * لا يعرض تفاصيل الخطأ التقنية للزائر — فهي بلا فائدة له وقد تكشف بنية
 * النظام. يُسجَّل الخطأ في الطرفية، ويُعطى الزائر طريقًا للخروج من الحالة.
 */
export default function SiteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[site] خطأ غير متوقع:", error);
  }, [error]);

  return (
    <div className="container-page flex min-h-[60dvh] items-center justify-center py-16">
      <div className="max-w-lg text-center">
        <span
          aria-hidden="true"
          className="bg-danger-50 text-danger-600 mx-auto mb-6 grid size-16 place-items-center rounded-full"
        >
          <Icon name="alert" className="size-8" strokeWidth={1.6} />
        </span>

        <h1 className="text-2xl md:text-3xl">حدث خطأ غير متوقع</h1>

        <p className="text-primary-600 mt-4 leading-relaxed">
          نعتذر عن ذلك. جرّب إعادة تحميل الصفحة — وإن تكرّر الأمر، تواصل معنا مباشرة
          وسنساعدك في إتمام طلبك.
        </p>

        {error.digest ? (
          <p className="text-primary-400 mt-4 font-mono text-xs" dir="ltr">
            {error.digest}
          </p>
        ) : null}

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button size="lg" onClick={reset}>
            إعادة المحاولة
          </Button>

          <ButtonLink
            href={whatsappGeneralUrl()}
            external
            size="lg"
            variant="whatsapp"
            icon="whatsapp"
          >
            تواصل معنا
          </ButtonLink>

          <ButtonLink href="/" size="lg" variant="outline">
            الصفحة الرئيسية
          </ButtonLink>
        </div>

        <p className="text-primary-500 mt-8 text-sm">
          أو اتصل بنا:{" "}
          <a href={`tel:${contact.phone}`} className="text-accent-700 font-bold" dir="ltr">
            {contact.phoneDisplay}
          </a>
        </p>
      </div>
    </div>
  );
}

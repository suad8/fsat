import { QuoteForm } from "@/components/forms/QuoteForm";
import type { QuoteField } from "@/lib/quote-form-types";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import type { Settings } from "@/lib/settings";
import { telUrl, whatsappGeneralUrl } from "@/lib/whatsapp";

/**
 * قسم التواصل السريع.
 *
 * يعرض النموذج المختصر مباشرة في الصفحة بدل الاكتفاء برابط، لأن كل خطوة
 * إضافية بين الزائر وإرسال طلبه تقلّل عدد الطلبات الواصلة فعليًا.
 */
export function ContactCta({
  fields,
  settings,
}: {
  fields: QuoteField[];
  settings: Settings;
}) {
  return (
    <section id="contact" className="bg-primary-950 grain relative overflow-hidden text-white">
      <div
        aria-hidden="true"
        className="halftone halftone-fade text-white/[0.07] pointer-events-none absolute inset-0"
      />
      <div
        aria-hidden="true"
        className="bg-accent-500/15 pointer-events-none absolute -top-40 -start-32 size-[30rem] rounded-full blur-[130px]"
      />
      <div className="container-page section-y relative">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          {/* الدعوة وطرق التواصل */}
          <div>
            <p className="text-accent-300 mb-4 text-xs font-bold tracking-[0.18em]">
              ابدأ مشروعك
            </p>

            <h2 className="text-3xl text-white md:text-4xl lg:text-[2.6rem]">
              أرسل مواصفات طلبك واستلم عرض السعر خلال يوم عمل
            </h2>

            <p className="text-primary-300 mt-5 max-w-lg leading-relaxed">
              اشرح لنا ما تحتاجه — نوع المنتج، الكمية، المقاس — وسيتواصل معك
              مختص بعرض سعر واضح ومدة تنفيذ محددة. وإن كنت تفضّل الحديث
              المباشر، نحن على واتساب.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink
                href={whatsappGeneralUrl()}
                external
                size="lg"
                variant="whatsapp"
                icon="whatsapp"
              >
                محادثة واتساب فورية
              </ButtonLink>

              <ButtonLink
                href={telUrl}
                size="lg"
                variant="outline"
                icon="phone"
                className="border-primary-700 bg-transparent text-white hover:border-primary-500 hover:bg-primary-900 hover:text-white"
              >
                اتصل بنا
              </ButtonLink>
            </div>

            <ul className="border-primary-800 mt-10 space-y-4 border-t pt-8 text-sm">
              <ContactRow icon="phone" label="الجوال">
                <a href={telUrl} className="hover:text-accent-300 transition-colors" dir="ltr">
                  {settings.phoneDisplay}
                </a>
              </ContactRow>

              <ContactRow icon="mail" label="البريد الإلكتروني">
                <a
                  href={`mailto:${settings.email}`}
                  className="hover:text-accent-300 break-all transition-colors"
                >
                  {settings.email}
                </a>
              </ContactRow>

              <ContactRow icon="location" label="الموقع">
                {settings.addressLine && settings.addressLine !== settings.city
                  ? `${settings.city} — ${settings.addressLine}`
                  : settings.city}
              </ContactRow>

              <ContactRow icon="clock" label="أوقات العمل">
                {settings.workingHours}
              </ContactRow>
            </ul>
          </div>

          {/* النموذج المختصر */}
          <div className="bg-surface text-primary-900 shadow-pop crop-marks rounded-3xl [--crop-color:var(--color-accent-500)] p-6 md:p-8">
            <h3 className="text-xl font-bold">طلب عرض سعر سريع</h3>
            <p className="text-primary-600 mt-2 mb-6 text-sm">
              تحتاج نموذجًا أوسع بخيارات رفع التصاميم؟{" "}
              <a
                href="/quote"
                className="text-accent-700 font-bold underline underline-offset-2"
              >
                افتح النموذج الكامل
              </a>
            </p>

            <QuoteForm fields={fields} variant="compact" />
          </div>
        </div>
      </div>
    </section>
  );
}

function ContactRow({
  icon,
  label,
  children,
}: {
  icon: "phone" | "mail" | "location" | "clock";
  label: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-3">
      <span
        aria-hidden="true"
        className="border-primary-800 text-accent-400 grid size-9 shrink-0 place-items-center rounded-lg border"
      >
        <Icon name={icon} className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="text-primary-500 block text-xs">{label}</span>
        <span className="text-primary-200 mt-0.5 block">{children}</span>
      </span>
    </li>
  );
}

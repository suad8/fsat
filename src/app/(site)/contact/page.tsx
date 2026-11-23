import type { Metadata } from "next";

import { ContactForm } from "@/components/forms/ContactForm";
import { PageHeader } from "@/components/site/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";
import { getSettings } from "@/lib/settings";
import { breadcrumbJsonLd, JsonLd, organizationJsonLd } from "@/lib/seo";
import { whatsappGeneralUrl } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "اتصل بنا",
  description:
    "تواصل معنا للاستفسار عن خدمات الطباعة والتجهيزات الدعائية أو لطلب عرض سعر — عبر واتساب أو الهاتف أو نموذج التواصل.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const settings = await getSettings();

  const channels: {
    icon: IconName;
    label: string;
    value: string;
    href?: string;
    ltr?: boolean;
    note?: string;
  }[] = [
    {
      icon: "whatsapp",
      label: "واتساب",
      value: settings.phoneDisplay,
      href: whatsappGeneralUrl("/contact"),
      ltr: true,
      note: "الأسرع للرد — أرسل استفسارك مباشرة",
    },
    {
      icon: "phone",
      label: "الجوال",
      value: settings.phoneDisplay,
      href: `tel:${settings.phone}`,
      ltr: true,
    },
    {
      icon: "mail",
      label: "البريد الإلكتروني",
      value: settings.email,
      href: `mailto:${settings.email}`,
    },
    {
      icon: "location",
      label: "الموقع",
      value:
        settings.addressLine && settings.addressLine !== settings.city
          ? `${settings.city} — ${settings.addressLine}`
          : settings.city,
      href: settings.mapUrl || undefined,
    },
    {
      icon: "clock",
      label: "أوقات العمل",
      value: settings.workingHours,
    },
  ];

  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([{ label: "اتصل بنا", href: "/contact" }]),
          organizationJsonLd(settings),
        ]}
      />

      <PageHeader
        compact
        eyebrow="تواصل معنا"
        title="نحن هنا للرد على استفسارك"
        description="اختر الطريقة الأنسب لك — واتساب للرد السريع، أو النموذج إن كان استفسارك يحتاج تفصيلاً."
        breadcrumbs={[{ label: "اتصل بنا", href: "/contact" }]}
        action={
          <ButtonLink
            href={whatsappGeneralUrl("/contact")}
            external
            variant="whatsapp"
            size="lg"
            icon="whatsapp"
          >
            محادثة فورية
          </ButtonLink>
        }
      />

      <div className="container-page py-10 md:py-14">
        <div className="grid gap-10 lg:grid-cols-5 lg:gap-14">
          {/* --- قنوات التواصل --- */}
          <div className="lg:col-span-2">
            <h2 className="mb-5 text-xl font-bold">طرق التواصل</h2>

            <ul className="space-y-3">
              {channels.map((channel) => {
                const content = (
                  <>
                    <span
                      aria-hidden="true"
                      className="bg-surface-sunken text-primary-600 group-hover:bg-primary-950 grid size-11 shrink-0 place-items-center rounded-lg transition-colors group-hover:text-white"
                    >
                      <Icon name={channel.icon} className="size-5" />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="text-primary-500 block text-xs">
                        {channel.label}
                      </span>
                      <span
                        className="text-primary-900 mt-0.5 block font-medium break-words"
                        dir={channel.ltr ? "ltr" : undefined}
                      >
                        {channel.value}
                      </span>
                      {channel.note ? (
                        <span className="text-accent-700 mt-1 block text-xs font-bold">
                          {channel.note}
                        </span>
                      ) : null}
                    </span>

                    {channel.href ? (
                      <Icon
                        name="chevronLeft"
                        className="text-primary-300 mt-3 size-4 shrink-0"
                      />
                    ) : null}
                  </>
                );

                return (
                  <li key={channel.label}>
                    {channel.href ? (
                      <a
                        href={channel.href}
                        {...(channel.href.startsWith("http")
                          ? { target: "_blank", rel: "noopener noreferrer" }
                          : {})}
                        className="group border-border bg-surface hover:border-border-strong hover:shadow-card focus-visible:outline-accent-600 flex gap-3.5 rounded-xl border p-4 transition-[border-color,box-shadow] focus-visible:outline-2 focus-visible:outline-offset-2"
                      >
                        {content}
                      </a>
                    ) : (
                      <div className="group border-border bg-surface flex gap-3.5 rounded-xl border p-4">
                        {content}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

            <div className="border-accent-600/20 bg-accent-50 mt-6 rounded-xl border p-5">
              <h3 className="text-sm font-bold">تحتاج عرض سعر؟</h3>
              <p className="text-primary-700 mt-2 text-sm leading-relaxed">
                استخدم نموذج عرض السعر المخصّص — يتيح لك رفع التصميم والشعار وتحديد
                المقاس والكمية وموعد التسليم.
              </p>
              <ButtonLink href="/quote" variant="accent" size="sm" className="mt-4">
                افتح نموذج عرض السعر
              </ButtonLink>
            </div>
          </div>

          {/* --- النموذج --- */}
          <div className="lg:col-span-3">
            <div className="border-border bg-surface shadow-card rounded-xl border p-6 md:p-8">
              <h2 className="text-xl font-bold">أرسل لنا رسالة</h2>
              <p className="text-primary-600 mt-2 mb-6 text-sm">
                املأ النموذج وسنرد عليك خلال يوم عمل واحد.
              </p>

              <ContactForm />
            </div>
          </div>
        </div>

        {/* --- الخريطة --- */}
        {settings.mapUrl ? (
          <div className="mt-12">
            <h2 className="mb-4 text-xl font-bold">موقعنا على الخريطة</h2>
            <a
              href={settings.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="border-border bg-surface-muted hover:border-border-strong flex items-center justify-center gap-3 rounded-xl border p-10 transition-colors"
            >
              <Icon name="location" className="text-accent-600 size-6" />
              <span className="font-bold">افتح الموقع في خرائط جوجل</span>
              <Icon name="externalLink" className="text-primary-400 size-4" />
            </a>
          </div>
        ) : null}
      </div>
    </>
  );
}

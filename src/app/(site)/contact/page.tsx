import type { Metadata } from "next";
import type { ReactNode } from "react";

import { ContactForm } from "@/components/forms/ContactForm";
import { ClosingCta } from "@/components/pages/ClosingCta";
import { OpenNowBadge } from "@/components/pages/OpenNowBadge";
import { getContactState } from "@/components/pages/contact-info";
import { parseWorkingHours } from "@/components/pages/hours";
import { PageHeader } from "@/components/site/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";
import { breadcrumbJsonLd, JsonLd, organizationJsonLd } from "@/lib/seo";
import { getSettings } from "@/lib/settings";
import { whatsappGeneralUrl } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "اتصل بنا",
  description:
    "تواصل معنا عبر واتساب أو الهاتف أو نموذج قصير. ساعات العمل بتوقيت الرياض وحالة «مفتوح الآن»، ونرد على الرسائل خلال يوم عمل.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const settings = await getSettings();
  const state = getContactState(settings);
  const schedule = parseWorkingHours(settings.workingHours);

  const place = state.hasStreetAddress
    ? `${settings.city} — ${settings.addressLine}`
    : settings.city;

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
        title="نرد عليك، وواتساب أسرع طريق"
        description="اختر الطريقة الأنسب لك: محادثة واتساب للرد السريع، أو نموذج قصير إن كان استفسارك يحتاج تفصيلاً."
        breadcrumbs={[{ label: "اتصل بنا", href: "/contact" }]}
      />

      <section className="bg-surface py-10 md:py-16">
        <div className="container-page">
          <div className="grid gap-8 lg:grid-cols-5 lg:gap-12">
            {/* --- القنوات: واتساب أولًا --- */}
            <div className="space-y-4 lg:col-span-2">
              <Reveal>
                <div className="bg-ink grain shadow-pop relative overflow-hidden rounded-3xl p-6 text-white md:p-7">
                  <div
                    aria-hidden="true"
                    className="halftone halftone-fade pointer-events-none absolute inset-0 text-white/[0.06]"
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -top-16 -end-16 size-48 rounded-full bg-[#25D366]/25 blur-[70px]"
                  />

                  <div className="relative">
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                      <span
                        aria-hidden="true"
                        className="grid size-12 place-items-center rounded-xl bg-[#25D366] text-white"
                      >
                        <Icon name="whatsapp" className="size-6" />
                      </span>
                      {schedule ? <OpenNowBadge schedule={schedule} tone="dark" /> : null}
                    </div>

                    <h2 className="text-xl font-black text-white">واتساب — الأسرع للرد</h2>
                    <p className="text-primary-300 mt-2 text-sm leading-relaxed">
                      أرسل استفسارك أو صورة لما تريد طباعته، ونردّ عليك بالتفاصيل.
                    </p>
                    {state.showWhatsappNumber ? (
                      <p className="mt-3 text-lg font-black text-white" dir="ltr">
                        {settings.phoneDisplay}
                      </p>
                    ) : null}

                    <ButtonLink
                      href={whatsappGeneralUrl("/contact")}
                      external
                      size="lg"
                      variant="whatsapp"
                      icon="whatsapp"
                      fullWidth
                      className="mt-6"
                    >
                      ابدأ محادثة الآن
                    </ButtonLink>
                  </div>
                </div>
              </Reveal>

              <ul className="space-y-3">
                {state.showPhone ? (
                  <Channel
                    icon="phone"
                    label="الاتصال الهاتفي"
                    href={`tel:${settings.phone}`}
                    ltr
                  >
                    {settings.phoneDisplay}
                  </Channel>
                ) : null}

                {state.showEmail ? (
                  <Channel icon="mail" label="البريد الإلكتروني" href={`mailto:${settings.email}`}>
                    {settings.email}
                  </Channel>
                ) : null}

                <Channel
                  icon="location"
                  label="الموقع"
                  href={state.mapUrl || undefined}
                  action={state.mapUrl ? "افتح في خرائط جوجل" : undefined}
                >
                  {place}
                </Channel>

                <Channel icon="clock" label="ساعات العمل (بتوقيت الرياض)">
                  {settings.workingHours}
                </Channel>
              </ul>
            </div>

            {/* --- النموذج القصير --- */}
            <div className="lg:col-span-3">
              <Reveal>
                <div className="border-border bg-surface shadow-card rounded-3xl border p-6 md:p-9">
                  <h2 className="text-2xl font-black">أرسل لنا رسالة</h2>
                  <p className="text-primary-600 mt-2 mb-7 text-sm leading-relaxed">
                    ثلاثة حقول فقط. نردّ خلال يوم عمل على الجوال الذي تكتبه.
                  </p>

                  <ContactForm />
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      <ClosingCta
        title="تحتاج سعرًا مفصّلاً لمشروعك؟"
        description="نموذج عرض السعر يتيح لك تحديد المقاس والكمية ورفع التصميم، ويصلك الرد خلال يوم عمل."
        primary={{ label: "افتح نموذج عرض السعر", href: "/quote", icon: "document" }}
      />
    </>
  );
}

function Channel({
  icon,
  label,
  href,
  ltr,
  action,
  children,
}: {
  icon: IconName;
  label: string;
  href?: string;
  ltr?: boolean;
  action?: string;
  children: ReactNode;
}) {
  const body = (
    <>
      <span
        aria-hidden="true"
        className="bg-surface-sunken text-primary-600 group-hover/ch:bg-ink group-hover/ch:text-accent-400 grid size-11 shrink-0 place-items-center rounded-xl transition-colors"
      >
        <Icon name={icon} className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-primary-500 block text-xs">{label}</span>
        <span
          className="text-primary-900 mt-0.5 block font-bold break-words"
          dir={ltr ? "ltr" : undefined}
        >
          {children}
        </span>
        {action ? (
          <span className="text-accent-700 mt-1 inline-flex items-center gap-1 text-xs font-bold">
            {action}
            <Icon name="externalLink" className="size-3.5" />
          </span>
        ) : null}
      </span>
    </>
  );

  const base =
    "group/ch border-border bg-surface flex items-center gap-3.5 rounded-2xl border p-4 transition-[border-color,box-shadow]";

  return (
    <li>
      {href ? (
        <a
          href={href}
          {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          className={`${base} hover:border-accent-500/60 hover:shadow-card focus-visible:outline-accent-600 focus-visible:outline-2 focus-visible:outline-offset-2`}
        >
          {body}
        </a>
      ) : (
        <div className={base}>{body}</div>
      )}
    </li>
  );
}

import Link from "next/link";

import { Logo } from "@/components/site/Logo";
import { ShopIcon } from "@/components/shop/ShopIcon";
import { TrustStrip } from "@/components/shop/TrustStrip";
import { ButtonLink } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";
import { brand } from "@/config/brand";
import { footerNav, type NavLink } from "@/config/nav";
import { getSettings } from "@/lib/settings";
import { listPaymentOptions } from "@/lib/shop/payments";
import { cn } from "@/lib/utils";

const SOCIAL_ICONS: { key: keyof Awaited<ReturnType<typeof getSettings>>["social"]; icon: IconName; label: string }[] =
  [
    { key: "instagram", icon: "instagram", label: "إنستقرام" },
    { key: "twitter", icon: "twitter", label: "منصة إكس" },
    { key: "tiktok", icon: "tiktok", label: "تيك توك" },
    { key: "snapchat", icon: "snapchat", label: "سناب شات" },
    { key: "linkedin", icon: "linkedin", label: "لينكدإن" },
    { key: "youtube", icon: "youtube", label: "يوتيوب" },
  ];

const LINK =
  "text-primary-300 hover:text-accent-300 focus-visible:outline-accent-500 inline-flex min-h-9 items-center rounded text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2";

/**
 * التذييل.
 *
 * ترتيب القراءة: شريط الثقة ← الهوية والتواصل ← أعمدة الروابط ← طرق الدفع
 * ← الحقوق. طرق الدفع تُقرأ من نفس سجلّ الدفع الذي تستخدمه صفحة الإتمام
 * (src/lib/shop/payments.ts) فتتطابق دائمًا، وما لم يُفعَّل بعد يظهر «قريبًا».
 */
export async function Footer() {
  const settings = await getSettings();
  const year = new Date().getFullYear();

  const activeSocial = SOCIAL_ICONS.filter(({ key }) => {
    const url = settings.social[key];
    return typeof url === "string" && url.trim().length > 0;
  });

  const whatsappHref = `https://wa.me/${settings.whatsapp.replace(/\D/g, "")}`;

  // التسوّق: نضيف تتبّع الطلب بجانب السلة دون تعديل ملف التنقّل المشترك
  const columns = footerNav.map((column) =>
    column.title === "التسوّق"
      ? { ...column, links: [...column.links, { label: "تتبّع طلبك", href: "/track" } satisfies NavLink] }
      : column,
  );

  const payments = listPaymentOptions(settings.payment);

  return (
    <footer className="bg-ink grain text-primary-300 relative mt-auto overflow-hidden">
      {/* شريط CMYK رفيع — توقيع طباعي */}
      <div aria-hidden="true" className="flex h-1.5">
        <span className="flex-1 bg-[#00AEEF]" />
        <span className="flex-1 bg-[#EC008C]" />
        <span className="flex-1 bg-[#FFF200]" />
        <span className="flex-1 bg-black" />
      </div>

      <div className="container-page relative">
        {/* شريط الثقة */}
        <div className="border-b border-white/10 py-8 md:py-10">
          <TrustStrip tone="dark" />
        </div>

        {/* الهوية والتواصل + الروابط */}
        <div className="grid gap-12 py-12 md:py-16 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-5">
            <Logo variant="light" />

            <p className="mt-5 max-w-md text-sm leading-[1.9]">{settings.description}</p>

            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink
                href={whatsappHref}
                external
                variant="whatsapp"
                icon="whatsapp"
                className="min-h-12"
              >
                تواصل عبر واتساب
              </ButtonLink>
              <ButtonLink
                href="/quote"
                variant="outline"
                className="min-h-12 border-white/25 bg-transparent text-white hover:border-white/60 hover:bg-white/10"
              >
                طلب عرض سعر
              </ButtonLink>
            </div>

            <ul className="mt-7 space-y-3 text-sm">
              <ContactRow icon="phone">
                <a href={`tel:${settings.phone}`} className="hover:text-accent-300 transition-colors" dir="ltr">
                  {settings.phoneDisplay}
                </a>
              </ContactRow>
              <ContactRow icon="mail">
                <a href={`mailto:${settings.email}`} className="hover:text-accent-300 break-all transition-colors">
                  {settings.email}
                </a>
              </ContactRow>
              <ContactRow icon="location">
                {settings.city}
                {settings.addressLine && settings.addressLine !== settings.city
                  ? ` — ${settings.addressLine}`
                  : ""}
              </ContactRow>
              <ContactRow icon="clock">{settings.workingHours}</ContactRow>
            </ul>

            {activeSocial.length > 0 ? (
              <ul className="mt-6 flex flex-wrap gap-2">
                {activeSocial.map(({ key, icon, label }) => (
                  <li key={key}>
                    <a
                      href={settings.social[key]}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      title={label}
                      className="text-primary-300 hover:border-accent-500 hover:bg-accent-500 hover:text-accent-contrast focus-visible:outline-accent-500 grid size-11 place-items-center rounded-xl border border-white/15 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
                    >
                      <Icon name={icon} className="size-[1.1rem]" />
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="grid gap-10 sm:grid-cols-3 lg:col-span-7">
            {columns.map((column) => (
              <nav key={column.title} aria-label={column.title}>
                <h2 className="mb-4 text-sm font-black text-white">{column.title}</h2>
                <ul className="space-y-1">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className={LINK}>
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        {/* طرق الدفع — مساحة جاهزة لأي بوابة تُضاف لاحقًا */}
        <div className="flex flex-col gap-4 border-t border-white/10 py-6 md:flex-row md:items-center md:justify-between">
          <p className="flex items-center gap-2 text-xs font-bold text-white">
            <ShopIcon name="lock" className="text-accent-400 size-4" />
            طرق الدفع
          </p>
          <ul className="flex flex-wrap gap-2">
            {payments.map((option) => (
              <li
                key={option.id}
                className={cn(
                  "inline-flex min-h-9 items-center gap-2 rounded-full border px-3.5 text-xs font-bold",
                  option.status === "available"
                    ? "border-white/20 text-white"
                    : "border-white/10 text-primary-400",
                )}
              >
                <ShopIcon name={option.icon} className="size-4" />
                {option.label}
                {option.status === "coming-soon" ? (
                  <span className="bg-white/10 text-primary-300 rounded-full px-2 py-0.5 text-[0.65rem]">
                    قريبًا
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>

        {/* الحقوق */}
        <div className="flex flex-col gap-3 border-t border-white/10 py-6 text-xs md:flex-row md:items-center md:justify-between">
          <p>
            © {year} {settings.companyName}. جميع الحقوق محفوظة.
          </p>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {settings.crNumber ? (
              <span>
                السجل التجاري: <span dir="ltr">{settings.crNumber}</span>
              </span>
            ) : null}
            {settings.vatNumber ? (
              <span>
                الرقم الضريبي: <span dir="ltr">{settings.vatNumber}</span>
              </span>
            ) : null}
            <span className="text-primary-400">
              الأسعار بالريال السعودي
              {settings.pricesIncludeVat ? " شاملة ضريبة القيمة المضافة" : " غير شاملة الضريبة"}
            </span>
          </div>
        </div>

        {/* اسم العلامة بحجم ضخم — زخرفة بخط مفرّغ */}
        <p
          aria-hidden="true"
          className="font-display pb-4 text-center text-[clamp(3rem,11vw,8.5rem)] leading-none font-black text-transparent select-none [-webkit-text-stroke:1.5px_rgb(255_255_255/0.08)]"
        >
          {brand.nameShort}
        </p>
      </div>
    </footer>
  );
}

function ContactRow({ icon, children }: { icon: IconName; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="text-accent-400 mt-0.5 grid size-5 shrink-0 place-items-center">
        <Icon name={icon} className="size-4.5" strokeWidth={1.7} />
      </span>
      <span className="min-w-0 leading-relaxed">{children}</span>
    </li>
  );
}

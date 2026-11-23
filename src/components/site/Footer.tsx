import Link from "next/link";

import { Logo } from "@/components/site/Logo";
import { Icon, type IconName } from "@/components/ui/Icon";
import { brand } from "@/config/brand";
import { footerNav } from "@/config/nav";
import { getSettings } from "@/lib/settings";
import { telUrl } from "@/lib/whatsapp";

const SOCIAL_ICONS: { key: keyof Awaited<ReturnType<typeof getSettings>>["social"]; icon: IconName; label: string }[] =
  [
    { key: "instagram", icon: "instagram", label: "إنستقرام" },
    { key: "twitter", icon: "twitter", label: "منصة إكس" },
    { key: "tiktok", icon: "tiktok", label: "تيك توك" },
    { key: "snapchat", icon: "snapchat", label: "سناب شات" },
    { key: "linkedin", icon: "linkedin", label: "لينكدإن" },
    { key: "youtube", icon: "youtube", label: "يوتيوب" },
  ];

export async function Footer() {
  const settings = await getSettings();
  const year = new Date().getFullYear();

  const activeSocial = SOCIAL_ICONS.filter(({ key }) => {
    const url = settings.social[key];
    return typeof url === "string" && url.trim().length > 0;
  });

  return (
    <footer className="bg-ink grain text-primary-300 relative mt-auto overflow-hidden">
      {/* شريط CMYK رفيع — توقيع طباعي */}
      <div aria-hidden="true" className="flex h-1.5">
        <span className="flex-1 bg-[#00AEEF]" />
        <span className="flex-1 bg-[#EC008C]" />
        <span className="flex-1 bg-[#FFF200]" />
        <span className="flex-1 bg-black" />
      </div>

      <div className="container-page relative py-16 md:py-20">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-12 lg:gap-8">
          {/* الهوية والوصف */}
          <div className="lg:col-span-4">
            <Logo variant="light" />

            <p className="mt-5 max-w-sm text-sm leading-relaxed">
              {settings.description}
            </p>

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
                      className="border-primary-800 text-primary-400 hover:border-accent-500 hover:bg-accent-500 hover:text-accent-contrast focus-visible:outline-accent-500 grid size-10 place-items-center rounded-xl border transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2"
                    >
                      <Icon name={icon} className="size-[1.1rem]" />
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {/* أعمدة الروابط */}
          {footerNav.map((column) => (
            <nav key={column.title} aria-label={column.title} className="lg:col-span-2">
              <h2 className="mb-4 text-sm font-bold text-white">{column.title}</h2>
              <ul className="space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="hover:text-accent-300 focus-visible:outline-accent-500 rounded text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          {/* التواصل */}
          <div className="lg:col-span-2">
            <h2 className="mb-4 text-sm font-bold text-white">تواصل معنا</h2>
            <ul className="space-y-3 text-sm">
              <li>
                <a
                  href={telUrl}
                  className="hover:text-accent-300 inline-flex items-start gap-2 transition-colors"
                >
                  <Icon name="phone" className="text-primary-500 mt-0.5 size-4" />
                  <span dir="ltr">{settings.phoneDisplay}</span>
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${settings.email}`}
                  className="hover:text-accent-300 inline-flex items-start gap-2 transition-colors"
                >
                  <Icon name="mail" className="text-primary-500 mt-0.5 size-4" />
                  <span className="break-all">{settings.email}</span>
                </a>
              </li>
              <li className="inline-flex items-start gap-2">
                <Icon name="location" className="text-primary-500 mt-0.5 size-4" />
                <span>
                  {settings.city}
                  {settings.addressLine && settings.addressLine !== settings.city ? (
                    <span className="block">{settings.addressLine}</span>
                  ) : null}
                </span>
              </li>
              <li className="inline-flex items-start gap-2">
                <Icon name="clock" className="text-primary-500 mt-0.5 size-4" />
                <span>{settings.workingHours}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* الشريط السفلي */}
        <div className="border-primary-800 mt-12 flex flex-col gap-4 border-t pt-7 text-xs md:flex-row md:items-center md:justify-between">
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
            <span className="text-primary-500">
              الأسعار بالريال السعودي
              {settings.pricesIncludeVat ? " شاملة ضريبة القيمة المضافة" : " غير شاملة الضريبة"}
            </span>
          </div>
        </div>

        {/* اسم العلامة بحجم ضخم — زخرفة بخط مفرّغ */}
        <p
          aria-hidden="true"
          className="font-display mt-14 text-center text-[clamp(3.5rem,14vw,11rem)] leading-none font-black tracking-tight text-transparent select-none [-webkit-text-stroke:1.5px_rgb(255_255_255/0.1)]"
        >
          {brand.nameShort}
        </p>
      </div>
    </footer>
  );
}

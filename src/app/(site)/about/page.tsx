import type { Metadata } from "next";
import Link from "next/link";

import { ClosingCta } from "@/components/pages/ClosingCta";
import { MediaFrame } from "@/components/pages/MediaFrame";
import { PageSection } from "@/components/pages/PageSection";
import { PageHeader } from "@/components/site/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { Icon, resolveIcon, type IconName } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";
import { brand } from "@/config/brand";
import { getCategories, getEquipment, getServices } from "@/lib/queries";
import { breadcrumbJsonLd, JsonLd, organizationJsonLd } from "@/lib/seo";
import { getSettings } from "@/lib/settings";
import { formatNumber, yearsOfExperience } from "@/lib/utils";
import { whatsappGeneralUrl } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "من نحن — مصنع طباعة وتجهيزات دعائية",
  description:
    "تعرّف على مصنعنا: ما نملكه من معدات، وكيف نراجع ملفك قبل الطباعة، ومن نخدم. طباعة وتغليف وتجهيزات دعائية في المملكة العربية السعودية.",
  alternates: { canonical: "/about" },
};

/** مراحل الجودة — كلها مأخوذة من وعود مذكورة فعلاً في صفحات الموقع والأسئلة الشائعة. */
const QUALITY_STEPS: { icon: IconName; title: string; text: string }[] = [
  {
    icon: "search",
    title: "مراجعة فنية للملف",
    text: "قبل أي إنتاج نفحص دقة الصور ونظام الألوان والهوامش وحدود القص. تصحيح الخطأ هنا يكلّف دقائق، لا طلبًا كاملاً.",
  },
  {
    icon: "check",
    title: "عيّنة قبل الكمية الكبيرة",
    text: "للكميات الكبيرة نوفّر عيّنة مطبوعة قبل بدء الإنتاج، وتُخصم تكلفتها من قيمة الطلب عند اعتماده.",
  },
  {
    icon: "factory",
    title: "إنتاج داخل المصنع",
    text: "الطباعة والقص والتشطيب على مكائننا نفسها، فلا نقاط تسليم بين أطراف تزيد احتمال التأخير أو اختلاف اللون.",
  },
  {
    icon: "truck",
    title: "إبلاغك عند الجاهزية",
    text: "نراسلك حين يجهز الطلب مع طريقة الاستلام أو الشحن، فلا تحتاج أن تسأل «وين طلبي؟».",
  },
];

/** أنواع العملاء الثلاثة ومسار كل منهم — مسارات موجودة فعلاً في الموقع. */
const PATHS: { icon: IconName; title: string; text: string; href: string; cta: string }[] = [
  {
    icon: "users",
    title: "فرد أو مشروع صغير",
    text: "تحتاج كمية محدودة؟ اطلب مباشرة من المتجر بسعر يظهر أمامك قبل التأكيد.",
    href: "/shop",
    cta: "تصفّح المتجر",
  },
  {
    icon: "package",
    title: "منشأة بمطبوعات متكررة",
    text: "مطبوعات وتغليف تتكرر شهريًا؟ نعتمد معك المواصفات مرة، ثم تعيد الطلب بسهولة.",
    href: "/quote",
    cta: "اطلب عرض سعر",
  },
  {
    icon: "factory",
    title: "شركة وكميات كبيرة",
    text: "عرض سعر مفصّل، عيّنة قبل الإنتاج، وفاتورة ضريبية نظامية مع الطلب.",
    href: "/quote",
    cta: "ابدأ بعرض سعر",
  },
];

export default async function AboutPage() {
  const [settings, services, categories, equipment] = await Promise.all([
    getSettings(),
    getServices(),
    getCategories(),
    getEquipment(),
  ]);

  const years = yearsOfExperience(brand.foundedYear);

  // نعرض فقط الأرقام الحقيقية الموجودة؛ الصفر لا يُعرض فخرًا
  const figures = [
    { value: `+${years}`, label: "سنة في السوق", note: `منذ ${brand.foundedYear}` },
    { value: formatNumber(services.length), label: "خدمة طباعة" },
    { value: formatNumber(categories.length), label: "قسم منتجات" },
    { value: formatNumber(equipment.length), label: "ماكينة إنتاج" },
  ].filter((figure) => figure.value !== "0");

  const featuredMachines = equipment.slice(0, 3);

  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([{ label: "من نحن", href: "/about" }]),
          organizationJsonLd(settings),
        ]}
      />

      <PageHeader
        eyebrow="من نحن"
        title="مصنع طباعة متكامل، لا وسيط بينك وبين المنتج"
        description={`نعمل في الطباعة والتجهيزات الدعائية منذ ${years} سنة. التصميم والطباعة والقص والتشطيب تمرّ داخل مصنعنا، فنتحكّم في الجودة والمدة بدل الاعتماد على موردين خارجيين.`}
        breadcrumbs={[{ label: "من نحن", href: "/about" }]}
        action={
          <ButtonLink href="/quote" variant="accent" size="lg" iconAfter="arrowLeft">
            اطلب عرض سعر
          </ButtonLink>
        }
      />

      {/* --- أرقام حقيقية فقط --- */}
      <section aria-label="أرقام عنا" className="bg-surface border-border border-b">
        <div className="container-page">
          <dl className="flex flex-wrap">
            {figures.map((figure) => (
              <div
                key={figure.label}
                className="border-border flex basis-1/2 flex-col-reverse border-b px-4 py-7 text-center even:border-s md:flex-1 md:basis-0 md:border-b-0 md:border-s md:px-8 md:py-10 md:first:border-s-0"
              >
                <dt className="text-primary-600 mt-1.5 text-sm font-medium">
                  {figure.label}
                  {figure.note ? (
                    <span className="text-primary-400 block text-xs">{figure.note}</span>
                  ) : null}
                </dt>
                <dd className="font-display text-primary-950 text-[clamp(2.2rem,4.4vw,3.4rem)] leading-none font-black">
                  {figure.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* --- ما نملكه --- */}
      {featuredMachines.length > 0 ? (
        <PageSection
          eyebrow="ما نملكه"
          headingId="own-title"
          title="مصنع بمكائنه، لا مكتب يوزّع الطلبات"
          description="كل تقنية تحتاجها مشاريعنا موجودة تحت سقف واحد، فيُنفَّذ كل طلب بالتقنية الأنسب له."
          action={
            <ButtonLink href="/equipment" variant="outline" iconAfter="arrowLeft">
              كل المعدات
            </ButtonLink>
          }
        >
          <ul className="grid gap-5 md:grid-cols-3">
            {featuredMachines.map((machine, index) => (
              <Reveal as="li" key={machine.id} delay={index * 80}>
                <article className="border-border bg-surface shadow-card h-full overflow-hidden rounded-2xl border">
                  <MediaFrame
                    src={machine.imageUrl}
                    alt={machine.imageAlt ?? machine.name}
                    icon="settings"
                    index={index + 1}
                    ratio="16/10"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  <div className="p-6">
                    <h3 className="text-lg leading-snug font-bold">{machine.name}</h3>
                    {machine.description ? (
                      <p className="text-primary-600 mt-2.5 line-clamp-3 text-sm leading-relaxed">
                        {machine.description}
                      </p>
                    ) : null}
                  </div>
                </article>
              </Reveal>
            ))}
          </ul>
        </PageSection>
      ) : null}

      {/* --- عملية الجودة --- */}
      <PageSection
        tone="muted"
        eyebrow="كيف نضمن الجودة"
        headingId="quality-title"
        title="أربع محطات يمرّ بها كل طلب"
        description="الجودة عندنا خطوات معلنة تعرفها قبل أن تطلب، لا وعد عام."
      >
        <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {QUALITY_STEPS.map((step, index) => (
            <Reveal as="li" key={step.title} delay={index * 70}>
              <div className="border-border bg-surface relative h-full rounded-2xl border p-6">
                <span
                  aria-hidden="true"
                  className="font-display text-primary-100 absolute end-5 top-3 text-5xl leading-none font-black select-none"
                >
                  {index + 1}
                </span>
                <span
                  aria-hidden="true"
                  className="bg-ink text-accent-400 mb-5 grid size-12 place-items-center rounded-xl"
                >
                  <Icon name={step.icon} className="size-5" />
                </span>
                <h3 className="text-base font-bold">{step.title}</h3>
                <p className="text-primary-600 mt-2.5 text-sm leading-relaxed">{step.text}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </PageSection>

      {/* --- ما نغطّيه --- */}
      {services.length > 0 ? (
        <PageSection
          eyebrow="ما نغطّيه"
          headingId="cover-title"
          title="دورة الطباعة كاملة في مكان واحد"
          description="اختر الخدمة لتعرف لمن تناسب وما تشمله والمدة المعتادة."
        >
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <li key={service.id}>
                <Link
                  href={`/services/${service.slug}`}
                  className="group border-border bg-surface hover:border-accent-500/60 hover:shadow-card flex items-center gap-3.5 rounded-xl border p-4 transition-[border-color,box-shadow]"
                >
                  <span
                    aria-hidden="true"
                    className="bg-surface-sunken text-primary-700 group-hover:bg-ink group-hover:text-accent-400 grid size-11 shrink-0 place-items-center rounded-lg transition-colors"
                  >
                    <Icon name={resolveIcon(service.iconKey)} className="size-5" />
                  </span>
                  <span className="text-primary-900 min-w-0 flex-1 text-sm leading-snug font-bold">
                    {service.title}
                  </span>
                  <Icon
                    name="arrowLeft"
                    className="text-primary-300 group-hover:text-accent-700 size-4 transition-transform group-hover:-translate-x-1"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </PageSection>
      ) : null}

      {/* --- من يناسبه --- */}
      <PageSection
        tone="muted"
        eyebrow="لمن نطبع"
        headingId="paths-title"
        title="ثلاثة مسارات، اختر ما يناسب حجم طلبك"
      >
        <ul className="grid gap-5 md:grid-cols-3">
          {PATHS.map((path, index) => (
            <Reveal as="li" key={path.title} delay={index * 70}>
              <div className="border-border bg-surface shadow-card flex h-full flex-col rounded-2xl border p-6 md:p-7">
                <span
                  aria-hidden="true"
                  className="bg-accent-50 text-accent-700 ring-accent-600/15 mb-5 grid size-12 place-items-center rounded-xl ring-1"
                >
                  <Icon name={path.icon} className="size-5" />
                </span>
                <h3 className="text-lg font-bold">{path.title}</h3>
                <p className="text-primary-600 mt-2.5 flex-1 text-sm leading-relaxed">
                  {path.text}
                </p>
                <Link
                  href={path.href}
                  className="text-accent-700 hover:text-accent-800 mt-6 inline-flex items-center gap-1.5 text-sm font-bold"
                >
                  {path.cta}
                  <Icon name="arrowLeft" className="size-4" strokeWidth={2} />
                </Link>
              </div>
            </Reveal>
          ))}
        </ul>

        {settings.crNumber || settings.vatNumber ? (
          <dl className="border-border mt-10 flex flex-wrap gap-x-10 gap-y-3 border-t pt-6 text-sm">
            {settings.crNumber ? (
              <div className="flex gap-2">
                <dt className="text-primary-500">السجل التجاري:</dt>
                <dd className="text-primary-900 font-bold" dir="ltr">
                  {settings.crNumber}
                </dd>
              </div>
            ) : null}
            {settings.vatNumber ? (
              <div className="flex gap-2">
                <dt className="text-primary-500">الرقم الضريبي:</dt>
                <dd className="text-primary-900 font-bold" dir="ltr">
                  {settings.vatNumber}
                </dd>
              </div>
            ) : null}
          </dl>
        ) : null}
      </PageSection>

      <ClosingCta
        title="أخبرنا بما تحتاجه، ونرد بعرض واضح"
        description="أرسل المواصفات التقريبية وسيراجعها مختص ويردّ عليك بالسعر والمدة خلال يوم عمل."
        primary={{ label: "اطلب عرض سعر", href: "/quote", icon: "document" }}
        secondary={{
          label: "تحدّث معنا على واتساب",
          href: whatsappGeneralUrl("/about"),
          icon: "whatsapp",
          external: true,
        }}
      />
    </>
  );
}

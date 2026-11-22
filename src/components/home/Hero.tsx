import Link from "next/link";

import { HeroMotion } from "@/components/home/HeroMotion";
import { ButtonLink } from "@/components/ui/Button";
import { Icon, resolveIcon } from "@/components/ui/Icon";
import { Magnetic } from "@/components/ui/Magnetic";
import { Marquee } from "@/components/ui/Marquee";
import { SmartImage } from "@/components/ui/SmartImage";
import { brand } from "@/config/brand";
import type { getProjects } from "@/lib/queries";
import type { Settings } from "@/lib/settings";
import { whatsappGeneralUrl } from "@/lib/whatsapp";

type Project = Awaited<ReturnType<typeof getProjects>>[number];

/**
 * القسم الرئيسي.
 *
 * لغة التصميم مأخوذة من عالم الطباعة: شبكة نقطية (halftone)، علامة تسجيل
 * ألوان CMYK تدور ببطء، علامات قص على صور الأعمال، وكلمات مفتاحية بتدرّج
 * ذهبي كالفويل. النص بالكامل HTML فيظهر أعلى الصفحة فورًا دون انتظار صورة
 * (وهو ما يقيسه LCP)، وصور الأعمال تُحمَّل بأولوية للأولى فقط.
 */
export function Hero({
  projects,
  categories,
  settings,
  stats,
}: {
  projects: Project[];
  /** تُعرض بدل الصور حين لا يوجد في معرض الأعمال ما يُعرض. */
  categories: { slug: string; name: string; iconKey: string | null; count: number }[];
  settings: Settings;
  stats: { services: number; products: number; projects: number };
}) {
  const showcase = projects.slice(0, 3);
  const hasShowcase = showcase.length > 0;

  // آخر كلمتين من الشعار بتدرّج ذهبي — يفصلها عن بقية النص دون تغيير المحتوى
  const words = settings.tagline.trim().split(/\s+/);
  const split = Math.max(words.length - 2, 0);
  const lead = words.slice(0, split).join(" ");
  const accent = words.slice(split).join(" ");

  return (
    <section className="bg-primary-950 grain relative overflow-hidden text-white">
      <HeroMotion>
        {/* شبكة نقطية تتلاشى نحو الأسفل */}
        <div
          aria-hidden="true"
          className="halftone halftone-fade text-white/[0.08] pointer-events-none absolute inset-0"
        />
        {/* توهّجان بلوني الهوية */}
        <div
          aria-hidden="true"
          data-parallax="35"
          className="bg-accent-500/20 pointer-events-none absolute -top-32 -start-32 size-[28rem] rounded-full blur-[120px]"
        />
        <div
          aria-hidden="true"
          data-parallax="-25"
          className="bg-brand-600/35 pointer-events-none absolute -bottom-40 -end-24 size-[32rem] rounded-full blur-[140px]"
        />

        {/* علامة تسجيل الألوان — عنصر زخرفي يدور ببطء */}
        <RegistrationMark
          data-spin
          className="text-white/15 pointer-events-none absolute -top-20 end-[8%] hidden size-72 lg:block"
        />

        <div className="container-page relative py-16 md:py-24 lg:py-28">
          <div className="grid items-center gap-14 lg:grid-cols-12 lg:gap-12">
            {/* النص */}
            <div className="lg:col-span-7">
              <p
                data-hero-text
                className="text-accent-300 mb-6 inline-flex items-center gap-3 text-xs font-bold tracking-[0.18em]"
              >
                <span className="bg-accent-400 size-2 rotate-45" aria-hidden="true" />
                {brand.taglineSecondary}
              </p>

              <h1
                data-hero-text
                className="text-[2.4rem] leading-[1.12] font-extrabold tracking-tight text-white sm:text-5xl lg:text-[4rem]"
              >
                {lead}
                {lead ? " " : null}
                <span className="foil-text">{accent}</span>
              </h1>

              <p
                data-hero-text
                className="text-primary-300 mt-7 max-w-xl text-base leading-relaxed md:text-lg"
              >
                من التصميم إلى التسليم — نطبع البوكسات والأكواب والمطبوعات
                والاستيكرات، ونصنّع اللوحات والأكريليك والهدايا الدعائية، بمكائن
                حديثة وخامات مختارة وفريق يتابع طلبك حتى يصل إليك.
              </p>

              <div data-hero-text className="mt-10 flex flex-wrap gap-3">
                <Magnetic>
                  <ButtonLink href="/shop" size="lg" variant="accent" iconAfter="arrowLeft">
                    تصفّح المنتجات
                  </ButtonLink>
                </Magnetic>

                <Magnetic>
                  <ButtonLink
                    href="/portfolio"
                    size="lg"
                    variant="outline"
                    className="border-white/20 bg-white/5 text-white backdrop-blur hover:border-white/40 hover:bg-white/10 hover:text-white"
                  >
                    شاهد أعمالنا
                  </ButtonLink>
                </Magnetic>

                <Magnetic>
                  <ButtonLink
                    href={whatsappGeneralUrl()}
                    external
                    size="lg"
                    variant="whatsapp"
                    icon="whatsapp"
                  >
                    واتساب
                  </ButtonLink>
                </Magnetic>
              </div>

              {/* مؤشرات سريعة */}
              <dl
                data-hero-text
                className="mt-14 grid max-w-xl grid-cols-3 divide-x divide-x-reverse divide-white/10 border-t border-white/10 pt-8"
              >
                <Stat value={stats.services} label="خدمة طباعة" />
                <Stat value={stats.products} label="منتج جاهز للطلب" />
                <Stat
                  value={new Date().getFullYear() - brand.foundedYear}
                  label="سنوات خبرة"
                />
              </dl>
            </div>

            {/* العرض البصري */}
            <div className="lg:col-span-5">
              {hasShowcase ? (
                <Showcase projects={showcase} />
              ) : (
                <CategoryShowcase categories={categories} />
              )}
            </div>
          </div>
        </div>

        {/* شريط الأقسام المتحرك */}
        {categories.length > 0 ? (
          <div
            data-hero-text
            className="relative border-y border-white/10 bg-black/20 py-4 backdrop-blur-sm"
          >
            <Marquee
              items={categories.map((category) => category.name)}
              className="text-primary-200 text-sm font-bold"
            />
          </div>
        ) : null}
      </HeroMotion>
    </section>
  );
}

/**
 * flex-col-reverse يبقي ترتيب الـ DOM صحيحًا (dt قبل dd) بينما يعرض الرقم
 * فوق التسمية بصريًا — فلا تتكرر التسمية على قارئ الشاشة.
 */
function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col-reverse px-4 first:ps-0 last:pe-0">
      <dt className="text-primary-400 mt-1.5 text-xs md:text-sm">{label}</dt>
      <dd
        data-count={value}
        data-prefix="+"
        className="font-display text-3xl font-extrabold text-white md:text-4xl"
      >
        +{value}
      </dd>
    </div>
  );
}

/** ثلاث صور متراكبة بزوايا مختلفة، تتحرك بسرعات متفاوتة مع التمرير. */
function Showcase({ projects }: { projects: Project[] }) {
  const layout = [
    "w-[62%] -rotate-3 self-start",
    "w-[56%] rotate-2 self-end -mt-[18%]",
    "w-[48%] -rotate-1 self-start -mt-[14%] ms-[8%]",
  ];
  const speeds = ["-6", "10", "-14"];

  return (
    <div className="relative mx-auto flex max-w-md flex-col">
      {projects.map((project, index) => (
        <div
          key={project.id}
          data-hero-visual
          data-parallax={speeds[index]}
          className={`${layout[index]} crop-marks text-accent-300`}
        >
          <SmartImage
            src={project.images[0]?.url}
            alt={project.images[0]?.alt ?? project.title}
            ratio={index === 0 ? "3/4" : "square"}
            icon="image"
            placeholderLabel={project.title}
            priority={index === 0}
            className="shadow-pop rounded-xl ring-1 ring-white/15"
            sizes="(max-width: 1024px) 60vw, 25vw"
          />
        </div>
      ))}
    </div>
  );
}

/**
 * البديل عند غياب صور الأعمال: أقسام المتجر الحقيقية بأعداد منتجاتها كروابط
 * عاملة — محتوى فعلي مفيد للزائر لا مساحة انتظار.
 */
function CategoryShowcase({
  categories,
}: {
  categories: { slug: string; name: string; iconKey: string | null; count: number }[];
}) {
  return (
    <div
      data-hero-visual
      className="crop-marks text-accent-300 rounded-3xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur md:p-6"
    >
      <p className="text-accent-300 mb-4 text-center text-xs font-bold tracking-widest">
        تصفّح حسب القسم
      </p>

      <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
        {categories.slice(0, 9).map((category) => (
          <li key={category.slug}>
            <Link
              href={`/shop/${category.slug}`}
              className="hover:border-accent-500/60 hover:bg-accent-500/10 focus-visible:outline-accent-500 group flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-black/20 p-3 text-white transition-[border-color,background-color,transform] duration-300 hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <Icon
                name={resolveIcon(category.iconKey)}
                className="text-accent-400 size-7 transition-transform duration-300 group-hover:scale-110"
                strokeWidth={1.3}
              />
              <span className="text-center text-[0.7rem] leading-tight font-medium">
                {category.name}
              </span>
              {category.count > 0 ? (
                <span className="text-primary-400 text-[0.62rem]">
                  {category.count} منتج
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** علامة تسجيل الألوان المعروفة في الطباعة: دائرة وتقاطع وأرباع CMYK. */
function RegistrationMark({
  className,
  ...props
}: { className?: string } & React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 100 100" fill="none" className={className} aria-hidden="true" {...props}>
      <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="50" cy="50" r="18" stroke="currentColor" strokeWidth="1.2" />
      <path d="M50 4v92M4 50h92" stroke="currentColor" strokeWidth="1.2" />
      <path d="M50 50V32a18 18 0 0 1 18 18z" fill="#00AEEF" opacity=".55" />
      <path d="M50 50h18a18 18 0 0 1-18 18z" fill="#EC008C" opacity=".55" />
      <path d="M50 50V68a18 18 0 0 1-18-18z" fill="#FFF200" opacity=".55" />
      <path d="M50 50H32a18 18 0 0 1 18-18z" fill="currentColor" opacity=".5" />
    </svg>
  );
}

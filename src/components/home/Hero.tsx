import Link from "next/link";

import { ButtonLink } from "@/components/ui/Button";
import { Icon, resolveIcon } from "@/components/ui/Icon";
import { SmartImage } from "@/components/ui/SmartImage";
import { brand } from "@/config/brand";
import type { getProjects } from "@/lib/queries";
import type { Settings } from "@/lib/settings";
import { whatsappGeneralUrl } from "@/lib/whatsapp";

type Project = Awaited<ReturnType<typeof getProjects>>[number];

/**
 * القسم الرئيسي.
 *
 * الخلفية داكنة والمحتوى نصّي بالكامل — لا صورة خلفية ثقيلة — فيظهر أعلى
 * الصفحة فورًا دون انتظار تحميل أي صورة، وهو ما يقيسه LCP.
 * الأعمال المعروضة إلى الجانب تُحمَّل كصور عادية بأولوية للأولى فقط.
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
  const showcase = projects.slice(0, 4);
  const hasShowcase = showcase.length > 0;

  return (
    <section className="bg-primary-950 relative overflow-hidden text-white">
      {/* نقشة خفيفة مرسومة بـ CSS — بلا ملفات صور */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.055]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgb(255 255 255) 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />
      {/* توهّجان بلوني الهوية: ذهبي من الأعلى وبنفسجي من الأسفل */}
      <div
        aria-hidden="true"
        className="bg-accent-500/15 pointer-events-none absolute -top-32 -start-32 size-[26rem] rounded-full blur-[110px]"
      />
      <div
        aria-hidden="true"
        className="bg-brand-600/25 pointer-events-none absolute -bottom-40 -end-24 size-[30rem] rounded-full blur-[130px]"
      />

      <div className="container-page relative py-16 md:py-20 lg:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
          {/* النص */}
          <div className="lg:col-span-6 xl:col-span-5">
            <p className="text-accent-300 animate-fade-up mb-5 inline-flex items-center gap-2 text-xs font-bold tracking-[0.15em]">
              <span className="bg-accent-400 size-1.5 rounded-full" aria-hidden="true" />
              {brand.taglineSecondary}
            </p>

            <h1 className="animate-fade-up text-3xl leading-[1.2] text-white md:text-4xl lg:text-[2.9rem]">
              {settings.tagline}
            </h1>

            <p className="text-primary-300 animate-fade-up mt-6 max-w-xl text-base leading-relaxed md:text-lg">
              من التصميم إلى التسليم — نطبع البوكسات والأكواب والمطبوعات
              والاستيكرات، ونصنّع اللوحات والأكريليك والهدايا الدعائية، بمكائن
              حديثة وخامات مختارة وفريق يتابع طلبك حتى يصل إليك.
            </p>

            <div className="animate-fade-up mt-9 flex flex-wrap gap-3">
              <ButtonLink href="/shop" size="lg" variant="accent" iconAfter="arrowLeft">
                تصفّح المنتجات
              </ButtonLink>

              <ButtonLink
                href="/portfolio"
                size="lg"
                variant="outline"
                className="border-primary-700 bg-transparent text-white hover:border-primary-500 hover:bg-primary-900 hover:text-white"
              >
                شاهد أعمالنا
              </ButtonLink>

              <ButtonLink
                href={whatsappGeneralUrl()}
                external
                size="lg"
                variant="whatsapp"
                icon="whatsapp"
              >
                واتساب
              </ButtonLink>
            </div>

            {/* مؤشرات سريعة */}
            <dl className="border-primary-800 mt-10 grid max-w-lg grid-cols-3 gap-4 border-t pt-7">
              <Stat value={`+${stats.services}`} label="خدمة طباعة" />
              <Stat value={`+${stats.products}`} label="منتج جاهز للطلب" />
              <Stat
                value={`+${new Date().getFullYear() - brand.foundedYear}`}
                label="سنوات خبرة"
              />
            </dl>
          </div>

          {/* العرض البصري للأعمال */}
          <div className="lg:col-span-6 xl:col-span-7">
            {hasShowcase ? (
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                {showcase.map((project, index) => (
                  <div
                    key={project.id}
                    className={
                      index === 0
                        ? "col-span-2 md:col-span-1 md:row-span-2"
                        : undefined
                    }
                  >
                    <SmartImage
                      src={project.images[0]?.url}
                      alt={project.images[0]?.alt ?? project.title}
                      ratio={index === 0 ? "3/4" : "square"}
                      icon="image"
                      placeholderLabel={project.title}
                      priority={index === 0}
                      className="ring-primary-800 rounded-xl ring-1"
                      sizes="(max-width: 1024px) 50vw, 30vw"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <CategoryShowcase categories={categories} />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * flex-col-reverse يبقي ترتيب الـ DOM صحيحًا (dt قبل dd) بينما يعرض الرقم
 * فوق التسمية بصريًا — فلا تتكرر التسمية على قارئ الشاشة.
 */
function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col-reverse">
      <dt className="text-primary-400 mt-1 text-xs md:text-sm">{label}</dt>
      <dd className="font-display text-2xl font-extrabold text-white md:text-3xl">
        {value}
      </dd>
    </div>
  );
}

/**
 * البديل عند غياب صور الأعمال.
 *
 * يعرض أقسام المتجر الحقيقية بأعداد منتجاتها كروابط عاملة — محتوى فعلي
 * مفيد للزائر لا مساحة انتظار. النسخة السابقة كانت تقول للعميل صراحةً إن
 * المساحة «تُضاف من لوحة التحكم»، أي تعترف له بأن الموقع غير جاهز.
 */
function CategoryShowcase({
  categories,
}: {
  categories: { slug: string; name: string; iconKey: string | null; count: number }[];
}) {
  return (
    <div className="border-primary-800 bg-primary-900/40 rounded-2xl border p-4 md:p-6">
      <p className="text-accent-300 mb-4 text-center text-xs font-bold">
        تصفّح حسب القسم
      </p>

      <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {categories.map((category) => (
          <li key={category.slug}>
            <Link
              href={`/shop/${category.slug}`}
              className="border-primary-800 bg-primary-950/60 hover:border-accent-500/50 hover:bg-primary-900 focus-visible:outline-accent-500 flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border p-3 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <Icon
                name={resolveIcon(category.iconKey)}
                className="text-accent-400 size-7"
                strokeWidth={1.3}
              />
              <span className="text-center text-[0.7rem] leading-tight font-medium text-white">
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

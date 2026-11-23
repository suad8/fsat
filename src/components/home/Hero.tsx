import Image from "next/image";
import Link from "next/link";

import { HeroMotion } from "@/components/home/HeroMotion";
import { ButtonLink } from "@/components/ui/Button";
import { Magnetic } from "@/components/ui/Magnetic";
import { SmartImage } from "@/components/ui/SmartImage";
import { brand, logo } from "@/config/brand";
import type { getProjects } from "@/lib/queries";
import type { Settings } from "@/lib/settings";
import { whatsappGeneralUrl } from "@/lib/whatsapp";

type Project = Awaited<ReturnType<typeof getProjects>>[number];

/**
 * القسم الرئيسي — «المطبعة الحيّة».
 *
 * شاشة كاملة داكنة بحبر ملوّن يطفو خلف عنوان ضخم. كل النص HTML فيظهر فورًا
 * (LCP)، والحركة طبقة فوقه: الكلمات تصعد من خلف قناع، والأقراص تتنفّس
 * وتتبع المؤشر، وشارة دائرية تدور. بلا حركة لمن يفضّل ذلك.
 */
export function Hero({
  projects,
  settings,
}: {
  projects: Project[];
  settings: Settings;
}) {
  const showcase = projects.slice(0, 3);
  const words = settings.tagline.trim().split(/\s+/);
  const accentFrom = Math.max(words.length - 2, 0);

  return (
    <section className="bg-ink grain relative isolate flex min-h-[calc(100svh-5rem)] flex-col overflow-hidden text-white">
      <HeroMotion>
        {/* أقراص الحبر: بنفسجي وذهبي وماجنتا تمتزج بـ screen */}
        <div
          aria-hidden="true"
          data-disc-layer
          className="pointer-events-none absolute inset-0 -z-10 mix-blend-screen"
        >
          <span
            data-disc
            className="bg-brand-600 absolute -top-[18%] -start-[8%] size-[58vw] max-h-[44rem] max-w-[44rem] rounded-full opacity-70 blur-[90px]"
          />
          <span
            data-disc
            className="bg-accent-500 absolute -bottom-[22%] start-[28%] size-[42vw] max-h-[34rem] max-w-[34rem] rounded-full opacity-45 blur-[100px]"
          />
          <span
            data-disc
            className="bg-magenta absolute -end-[10%] top-[8%] size-[34vw] max-h-[28rem] max-w-[28rem] rounded-full opacity-35 blur-[100px]"
          />
        </div>

        <div
          aria-hidden="true"
          className="halftone text-white/[0.09] pointer-events-none absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_at_70%_30%,#000,transparent_70%)]"
        />

        {/* تميمة الهوية: تطفو يسار الشاشة الكبيرة تحت سطور العنوان */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-8 end-[3%] z-0 hidden w-[min(17vw,16.5rem)] lg:block"
        >
          <div data-hero-visual className="relative">
            <span className="bg-accent-500/30 absolute inset-x-6 bottom-0 h-10 rounded-[50%] blur-2xl" />
            <Image
              src={logo.mascot}
              alt=""
              width={522}
              height={900}
              priority
              data-float
              className="relative h-auto w-full drop-shadow-[0_30px_40px_rgba(0,0,0,0.5)]"
            />
          </div>
        </div>

        <div className="container-page relative z-10 flex flex-1 flex-col justify-center pt-10 pb-10 md:pt-14 md:pb-12">
          <p
            data-hero-text
            className="mb-6 inline-flex w-fit items-center gap-3 rounded-full border border-white/15 bg-white/5 py-2 ps-3 pe-5 text-xs font-bold backdrop-blur"
          >
            <span className="bg-accent-500 relative grid size-5 place-items-center rounded-full">
              <span className="bg-accent-500 absolute inset-0 animate-ping rounded-full opacity-60" />
              <span className="bg-ink relative size-1.5 rounded-full" />
            </span>
            <span className="text-primary-100">{brand.taglineSecondary}</span>
          </p>

          <h1 className="text-[clamp(2.6rem,7.6vw,7.25rem)] leading-[1.04] font-black tracking-[-0.02em] text-white">
            {words.map((word, index) => (
              <span
                key={`${word}-${index}`}
                className="-mb-[0.3em] inline-block overflow-hidden pb-[0.3em] align-bottom"
              >
                <span
                  data-w
                  className={
                    index >= accentFrom ? "foil-text inline-block" : "inline-block"
                  }
                >
                  {word}
                  {index < words.length - 1 ? " " : ""}
                </span>
              </span>
            ))}
          </h1>

          <div className="mt-9 grid items-end gap-10 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <p
                data-hero-text
                className="text-primary-200 max-w-xl text-base leading-relaxed md:text-xl"
              >
                من التصميم إلى التسليم — نطبع البوكسات والأكواب والمطبوعات
                والاستيكرات، ونصنّع اللوحات والأكريليك والهدايا الدعائية، بمكائن
                حديثة وفريق يتابع طلبك حتى يصل إليك.
              </p>

              <div data-hero-text className="mt-9 flex flex-wrap gap-3">
                <Magnetic>
                  <ButtonLink href="/shop" size="lg" variant="accent" iconAfter="arrowLeft">
                    تصفّح المنتجات
                  </ButtonLink>
                </Magnetic>
                <Magnetic>
                  <ButtonLink
                    href="/quote"
                    size="lg"
                    variant="outline"
                    className="border-white/25 bg-white/5 text-white backdrop-blur hover:border-white/50 hover:bg-white/10 hover:text-white"
                  >
                    اطلب عرض سعر
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
            </div>

            <div className="flex items-end justify-between gap-6 lg:col-span-6 lg:justify-end lg:gap-10">
              {showcase.length > 0 ? (
                <ul className="flex gap-3">
                  {showcase.map((project, index) => (
                    <li
                      key={project.id}
                      data-hero-visual
                      className={`crop-marks text-accent-300 w-24 sm:w-32 lg:w-40 ${
                        index === 1 ? "-translate-y-6 rotate-2" : index === 2 ? "-rotate-3" : "-rotate-1"
                      }`}
                    >
                      <Link href={`/portfolio/${project.slug}`} aria-label={project.title}>
                        <SmartImage
                          src={project.images[0]?.url}
                          alt={project.images[0]?.alt ?? project.title}
                          ratio="3/4"
                          icon="image"
                          placeholderLabel={project.title}
                          priority={index === 0}
                          className="shadow-pop rounded-xl ring-1 ring-white/20"
                          sizes="160px"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </div>
      </HeroMotion>
    </section>
  );
}

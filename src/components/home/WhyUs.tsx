import { Icon, type IconName } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";
import { Section, SectionHeading } from "@/components/ui/Section";
import { Tilt } from "@/components/ui/Tilt";
import { cn } from "@/lib/utils";

const REASONS: { icon: IconName; title: string; description: string }[] = [
  {
    icon: "factory",
    title: "كل حلول الطباعة تحت سقف واحد",
    description:
      "من البوكسات والأكواب إلى اللوحات المضيئة والأكريليك — تتعامل مع جهة واحدة تتابع طلبك من التصميم حتى التسليم، بدل تفريقه بين عدة موردين.",
  },
  {
    icon: "award",
    title: "جودة عالية وخامات مختارة",
    description:
      "نختار الخامات حسب طبيعة الاستخدام لا حسب الأرخص، ونراجع كل تصميم فنيًا قبل الطباعة لنمنع أخطاء الألوان والقص قبل حدوثها.",
  },
  {
    icon: "rocket",
    title: "سرعة في التنفيذ",
    description:
      "مدة تنفيذ واضحة لكل منتج معلنة في صفحته، وخط إنتاج داخلي يقلّل الانتظار — الكروت الشخصية تُسلَّم خلال ٢ – ٣ أيام عمل.",
  },
  {
    icon: "palette",
    title: "تصميم وتنفيذ حسب الطلب",
    description:
      "ليس لديك تصميم؟ فريقنا يصمّمه من الصفر وفق هويتك. لديك ملف؟ نراجعه ونضبط ألوانه وهوامشه وحدود القص قبل الإنتاج.",
  },
  {
    icon: "settings",
    title: "معدات وتقنيات حديثة",
    description:
      "طباعة أوفست، UV مسطّحة، قص ليزر، وطباعة بعرض كبير — تنوّع المكائن يعني تنفيذ كل نوع بالتقنية الأنسب له لا بالمتاح فقط.",
  },
  {
    icon: "headset",
    title: "خدمة عملاء ومتابعة",
    description:
      "مسؤول يتابع طلبك ويحدّثك بحالته، وتصلك التحديثات على واتساب دون أن تضطر للسؤال أو المتابعة بنفسك.",
  },
  {
    icon: "shield",
    title: "خبرة في المشاريع التجارية",
    description:
      "نفّذنا مشاريع للمطاعم والمقاهي والمتاجر والجهات المؤسسية، ونعرف متطلبات كل قطاع وما يحتاجه من مواصفات ومدد تنفيذ.",
  },
];

/** العناوين قابلة للتعديل من /admin/theme — تسقط للافتراضي إن تُركت فارغة. */
export function WhyUs({
  heading,
}: {
  heading?: { eyebrow?: string; title?: string; description?: string };
} = {}) {
  return (
    <Section tone="muted" id="why-us">
      <SectionHeading
        eyebrow={heading?.eyebrow ?? "لماذا نحن"}
        title={heading?.title ?? "مصنع طباعة متكامل، لا وسيط"}
        description={heading?.description ?? "نملك خط الإنتاج بالكامل، فنتحكّم في الجودة والمدة والتكلفة — وهذا ما يظهر في النتيجة النهائية بين يديك."}
      />

      {/* شبكة غير متساوية (bento): الميزة الأولى بطاقة كبيرة داكنة */}
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12 lg:gap-5">
        {REASONS.map((reason, index) => {
          const hero = index === 0;
          const span = hero
            ? "lg:col-span-6 lg:row-span-2"
            : index < 3
              ? "lg:col-span-6"
              : "lg:col-span-3";

          return (
            <Reveal
              as="li"
              key={reason.title}
              delay={Math.min(index * 60, 300)}
              className={span}
            >
              <Tilt
                className={cn(
                  "rounded-3xl",
                  hero ? "bg-primary-950 grain text-white" : "border-border bg-surface border",
                )}
              >
                <div
                  className={cn(
                    "group relative flex h-full flex-col overflow-hidden rounded-3xl p-6 md:p-8",
                    hero && "justify-between",
                  )}
                >
                  {hero ? (
                    <div
                      aria-hidden="true"
                      className="halftone halftone-fade text-white/[0.09] pointer-events-none absolute inset-0"
                    />
                  ) : null}

                  <div className="relative flex items-start justify-between">
                    <span
                      aria-hidden="true"
                      className={cn(
                        "grid place-items-center rounded-2xl transition-colors duration-300",
                        hero
                          ? "bg-accent-500 text-accent-contrast size-16"
                          : "bg-primary-950 group-hover:bg-brand-600 size-12 text-white",
                      )}
                    >
                      <Icon name={reason.icon} className={hero ? "size-8" : "size-6"} />
                    </span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        "font-display text-sm font-bold tracking-widest",
                        hero ? "text-white/30" : "text-primary-300",
                      )}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>

                  <div className="relative mt-6">
                    <h3
                      className={cn(
                        "font-bold",
                        hero ? "text-2xl text-white md:text-3xl" : "text-base md:text-lg",
                      )}
                    >
                      {reason.title}
                    </h3>
                    <p
                      className={cn(
                        "mt-3 leading-relaxed",
                        hero ? "text-primary-300 text-base" : "text-primary-600 text-sm",
                      )}
                    >
                      {reason.description}
                    </p>
                  </div>
                </div>
              </Tilt>
            </Reveal>
          );
        })}
      </ul>
    </Section>
  );
}

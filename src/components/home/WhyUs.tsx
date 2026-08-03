import { Icon, type IconName } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";
import { Section, SectionHeading } from "@/components/ui/Section";

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

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
        {REASONS.map((reason, index) => (
          <Reveal
            as="li"
            key={reason.title}
            delay={Math.min(index * 60, 300)}
            className="border-border bg-surface hover:border-border-strong hover:shadow-card group rounded-xl border p-6 transition-[border-color,box-shadow] duration-300"
          >
            <span
              aria-hidden="true"
              className="bg-primary-950 group-hover:bg-brand-600 mb-4 grid size-11 place-items-center rounded-lg text-white transition-colors"
            >
              <Icon name={reason.icon} className="size-[1.35rem]" />
            </span>

            <h3 className="text-base font-bold md:text-lg">{reason.title}</h3>

            <p className="text-primary-600 mt-2.5 text-sm leading-relaxed">
              {reason.description}
            </p>
          </Reveal>
        ))}
      </ul>
    </Section>
  );
}

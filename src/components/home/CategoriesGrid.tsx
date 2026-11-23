import Link from "next/link";

import { Icon, resolveIcon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";
import { Section, SectionHeading } from "@/components/ui/Section";
import { ButtonLink } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type Category = { slug: string; name: string; iconKey: string | null; count: number };

/** ألوان البطاقات بالتناوب؛ لكل لون لون نص متباين. */
const TONES = [
  "bg-brand-600 text-white",
  "bg-accent-500 text-accent-contrast",
  "bg-ink text-white",
  "bg-magenta text-white",
  "bg-primary-800 text-white",
];

/**
 * «تسوّق حسب القسم» — كل الأقسام ظاهرة دفعة واحدة بلا تمرير جانبي ولا تثبيت.
 * هذا أول ما يبحث عنه العميل بعد الـ Hero، فيُعرض كشبكة واضحة: أيقونة،
 * اسم، وعدد المنتجات، والبطاقة كلها رابط.
 */
export function CategoriesGrid({ categories }: { categories: Category[] }) {
  const visible = categories.filter((category) => category.count > 0);
  if (visible.length === 0) return null;

  return (
    <Section id="categories" tone="muted">
      <SectionHeading
        align="start"
        eyebrow="الأقسام"
        title="تسوّق حسب القسم"
        description="اختر القسم الذي يناسب مشروعك وشاهد منتجاته وأسعاره مباشرة."
        action={
          <ButtonLink href="/shop" variant="outline" iconAfter="arrowLeft">
            كل المنتجات
          </ButtonLink>
        }
      />

      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5 lg:gap-4">
        {visible.map((category, index) => (
          <Reveal as="li" key={category.slug} delay={(index % 5) * 70}>
            <Link
              href={`/shop/${category.slug}`}
              className={cn(
                "group relative flex aspect-[4/5] flex-col justify-between overflow-hidden rounded-3xl p-4 transition-transform duration-500 hover:-translate-y-1.5 md:aspect-square md:p-5 lg:aspect-[4/5]",
                "focus-visible:outline-accent-600 focus-visible:outline-2 focus-visible:outline-offset-2",
                TONES[index % TONES.length],
              )}
            >
              <span
                aria-hidden="true"
                className="font-display text-outline pointer-events-none absolute inset-x-0 top-[26%] text-center text-[6rem] leading-none font-black opacity-25 transition-transform duration-700 group-hover:scale-110"
              >
                {String(index + 1).padStart(2, "0")}
              </span>

              <span className="relative flex items-start justify-between">
                <span className="grid size-12 place-items-center rounded-2xl bg-current/15">
                  <Icon name={resolveIcon(category.iconKey)} className="size-6" strokeWidth={1.5} />
                </span>
                <span className="grid size-9 place-items-center rounded-full border border-current/40 transition-transform duration-300 group-hover:-translate-x-1">
                  <Icon name="arrowLeft" className="size-4" strokeWidth={2} />
                </span>
              </span>

              <span className="relative">
                <span className="font-display block text-lg leading-snug font-black md:text-xl">
                  {category.name}
                </span>
                <span className="mt-1 block text-xs font-bold opacity-80">
                  {category.count} {category.count === 1 ? "منتج" : "منتجات"}
                </span>
              </span>
            </Link>
          </Reveal>
        ))}
      </ul>
    </Section>
  );
}

import Link from "next/link";

import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";

type Service = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  iconKey: string | null;
};

/**
 * الخدمات كقائمة تحريرية ضخمة: كل صف رابط كامل، وعند المرور يندفع لون
 * الذهب من الأسفل ويظهر الوصف ويدور السهم. على الجوال يبقى الوصف ظاهرًا.
 * كله CSS (group-hover) فلا يحتاج JavaScript إضافيًا.
 */
export function ServicesList({ services }: { services: Service[] }) {
  return (
    <ul className="border-border border-t-2">
      {services.map((service, index) => (
        <Reveal as="li" key={service.id} className="border-border border-b">
          <Link
            href={`/services/${service.slug}`}
            className="group relative flex items-center gap-4 overflow-hidden py-6 md:gap-8 md:py-9"
          >
            <span
              aria-hidden="true"
              className="bg-accent-500 absolute inset-0 origin-bottom scale-y-0 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-y-100 group-focus-visible:scale-y-100"
            />

            <span
              aria-hidden="true"
              className="font-display text-primary-300 group-hover:text-accent-contrast relative w-10 shrink-0 text-sm font-black transition-colors duration-300 md:w-16 md:text-xl"
            >
              {String(index + 1).padStart(2, "0")}
            </span>

            <span className="relative min-w-0 flex-1">
              <span className="font-display text-primary-950 group-hover:text-accent-contrast block text-2xl leading-tight font-black transition-[color,transform] duration-300 group-hover:-translate-x-2 md:text-5xl">
                {service.title}
              </span>
              <span className="text-primary-600 group-hover:text-accent-contrast/80 mt-2 line-clamp-2 block max-w-2xl text-sm leading-relaxed transition-colors duration-300 md:text-base">
                {service.shortDescription}
              </span>
            </span>

            <span
              aria-hidden="true"
              className="border-border-strong group-hover:border-accent-contrast group-hover:bg-accent-contrast group-hover:text-accent-500 text-primary-700 relative hidden size-14 shrink-0 place-items-center rounded-full border transition-[background-color,border-color,color,transform] duration-300 group-hover:-rotate-45 sm:grid md:size-20"
            >
              <Icon name="arrowLeft" className="size-6 md:size-8" strokeWidth={1.8} />
            </span>
          </Link>
        </Reveal>
      ))}
    </ul>
  );
}

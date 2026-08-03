import { Rating } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";
import { Section, SectionHeading } from "@/components/ui/Section";

type Testimonial = {
  id: string;
  authorName: string;
  authorTitle: string | null;
  companyName: string | null;
  city: string | null;
  rating: number;
  content: string;
};

/**
 * آراء العملاء.
 *
 * يظهر القسم فقط عند وجود تقييمات معتمدة من لوحة التحكم. آراء العملاء
 * تفقد قيمتها تمامًا إن كانت مُختلقة، لذا لا يعرض الموقع أي تقييم قبل أن
 * تستبدله الإدارة برأي حقيقي وتعتمده.
 */
export function Testimonials({ testimonials }: { testimonials: Testimonial[] }) {
  if (testimonials.length === 0) return null;

  return (
    <Section tone="muted" id="testimonials">
      <SectionHeading
        eyebrow="آراء العملاء"
        title="ما يقوله عملاؤنا"
        description="تقييمات من جهات تعاملت معنا فعليًا في مشاريع طباعة وتجهيزات دعائية."
      />

      <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {testimonials.map((testimonial, index) => (
          <Reveal
            as="li"
            key={testimonial.id}
            delay={Math.min(index * 80, 320)}
            className="border-border bg-surface shadow-card flex flex-col rounded-xl border p-6"
          >
            <Icon
              name="sparkles"
              className="text-accent-300 mb-4 size-7"
              strokeWidth={1.3}
            />

            <blockquote className="text-primary-700 flex-1 text-sm leading-relaxed">
              {testimonial.content}
            </blockquote>

            <footer className="border-border mt-5 border-t pt-4">
              <Rating value={testimonial.rating} className="mb-2.5" />

              <p className="text-primary-950 text-sm font-bold">
                {testimonial.authorName}
              </p>

              <p className="text-primary-500 mt-0.5 text-xs">
                {[testimonial.authorTitle, testimonial.companyName, testimonial.city]
                  .filter(Boolean)
                  .join(" — ")}
              </p>
            </footer>
          </Reveal>
        ))}
      </ul>
    </Section>
  );
}

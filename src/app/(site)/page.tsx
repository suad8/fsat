import { CategoriesRail } from "@/components/home/CategoriesRail";
import { StatsBand } from "@/components/home/StatsBand";
import { TickerBand } from "@/components/home/TickerBand";
import { brand } from "@/config/brand";
import { ContactCta } from "@/components/home/ContactCta";
import { Hero } from "@/components/home/Hero";
import { OrderSteps } from "@/components/home/OrderSteps";
import { Testimonials } from "@/components/home/Testimonials";
import { WhyUs } from "@/components/home/WhyUs";
import { ProjectCard } from "@/components/portfolio/ProjectCard";
import { ServicesList } from "@/components/home/ServicesList";
import { ProductCard } from "@/components/shop/ProductCard";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Reveal } from "@/components/ui/Reveal";
import { Section, SectionHeading } from "@/components/ui/Section";
import {
  getApprovedTestimonials,
  getCategories,
  getFeaturedProducts,
  getProducts,
  getProjects,
  getServices,
} from "@/lib/queries";
import { getQuoteFields } from "@/lib/quote-form";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo";
import { getSettings } from "@/lib/settings";
import { getHomeSections, sectionConfig } from "@/lib/theme-server";
import { cn } from "@/lib/utils";

/**
 * الصفحة الرئيسية.
 *
 * ترتيب الأقسام وإظهارها وعناوينها تُقرأ من جدول HomeSection الذي تتحكّم به
 * الإدارة من /admin/theme — لا من ترتيب ثابت في الكود.
 */
export default async function HomePage() {
  const [
    settings,
    services,
    products,
    allProducts,
    projects,
    testimonials,
    quoteFields,
    categories,
    sectionRows,
  ] = await Promise.all([
    getSettings(),
    getServices(),
    getFeaturedProducts(8),
    getProducts(),
    getProjects({ limit: 6 }),
    getApprovedTestimonials(6),
    getQuoteFields(),
    getCategories(),
    getHomeSections(),
  ]);

  const cfg = (key: string) => sectionConfig(sectionRows, key);

  // كل قسم يُبنى مرة واحدة ثم تُرتَّب القائمة حسب إعدادات الإدارة
  const sections: { order: number; node: React.ReactNode }[] = [];

  const push = (key: string, node: React.ReactNode) => {
    const config = cfg(key);
    if (!config.active) return;
    sections.push({ order: config.order, node });
  };

  push(
    "products",
    <Section key="products" id="products" tone="muted">
      <SectionHeading
        align="start"
        eyebrow={cfg("products").eyebrow ?? "المتجر"}
        title={cfg("products").title ?? "المنتجات الأكثر طلبًا"}
        description={
          cfg("products").description ??
          "أسعار واضحة تنخفض كلما زادت الكمية، وخيارات تحدّدها بنفسك قبل الطلب."
        }
        action={
          <ButtonLink href="/shop" variant="outline" iconAfter="arrowLeft">
            كل المنتجات
          </ButtonLink>
        }
      />

      {products.length === 0 ? (
        <EmptyState
          icon="package"
          title="لا توجد منتجات معروضة حاليًا"
          description="تُضاف المنتجات وأسعارها وخياراتها من لوحة التحكم."
          action={
            <ButtonLink href="/quote" variant="accent">
              اطلب عرض سعر
            </ButtonLink>
          }
        />
      ) : (
        /*
          على الجوال: شريط أفقي قابل للسحب مع محاذاة انزلاقية (snap). عرض
          البطاقة 63vw فيبقى طرف البطاقة التالية ظاهرًا — إشارة بصرية أن
          هناك المزيد دون الحاجة لسهم أو نقاط.
        */
        <ul
          className={cn(
            "no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2",
            "sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0",
            "lg:grid-cols-4",
          )}
        >
          {products.map((product, index) => (
            <Reveal
              as="li"
              key={product.id}
              delay={Math.min(index * 50, 300)}
              className="w-[63vw] shrink-0 snap-start sm:w-auto"
            >
              <ProductCard product={product} />
            </Reveal>
          ))}
        </ul>
      )}
    </Section>,
  );

  push(
    "services",
    <Section key="services" id="services" tone="default">
      <SectionHeading
        eyebrow={cfg("services").eyebrow ?? "خدماتنا"}
        title={cfg("services").title ?? "حلول الطباعة والتجهيزات الدعائية كاملة"}
        description={
          cfg("services").description ??
          "من التغليف والمطبوعات إلى اللوحات والهدايا الدعائية — كل ما تحتاجه علامتك التجارية في مكان واحد."
        }
      />

      {services.length === 0 ? (
        <EmptyState
          icon="sparkles"
          title="لم تُضَف خدمات بعد"
          description="تُضاف الخدمات وتُحرَّر من لوحة التحكم."
        />
      ) : (
        <ServicesList services={services} />
      )}
    </Section>,
  );

  push(
    "portfolio",
    <Section key="portfolio" id="portfolio" tone="default">
      <SectionHeading
        align="start"
        eyebrow={cfg("portfolio").eyebrow ?? "معرض الأعمال"}
        title={cfg("portfolio").title ?? "مشاريع نفّذناها"}
        description={
          cfg("portfolio").description ??
          "نماذج من أعمال حقيقية سلّمناها لعملائنا، بخاماتها ومقاساتها وتفاصيل تنفيذها."
        }
        action={
          <ButtonLink href="/portfolio" variant="outline" iconAfter="arrowLeft">
            كل الأعمال
          </ButtonLink>
        }
      />

      {projects.length === 0 ? (
        <EmptyState
          icon="image"
          title="معرض الأعمال قيد التجهيز"
          description="نجهّز حاليًا صور مشاريعنا المنفّذة. حتى ذلك الحين، تواصل معنا لعرض نماذج من أعمالنا مباشرة."
          action={
            <>
              <ButtonLink href="/quote" variant="primary">
                اطلب عرض سعر
              </ButtonLink>
              <ButtonLink href="/services" variant="outline">
                تصفّح الخدمات
              </ButtonLink>
            </>
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project, index) => (
            <Reveal as="li" key={project.id} delay={Math.min(index * 60, 300)}>
              <ProjectCard project={project} />
            </Reveal>
          ))}
        </ul>
      )}
    </Section>,
  );

  push("whyUs", <WhyUs key="whyUs" heading={cfg("whyUs")} />);
  push("orderSteps", <OrderSteps key="orderSteps" heading={cfg("orderSteps")} />);
  push("testimonials", <Testimonials key="testimonials" testimonials={testimonials} />);
  push("contact", <ContactCta key="contact" fields={quoteFields} settings={settings} />);

  sections.sort((a, b) => a.order - b.order);

  return (
    <>
      {/* البيانات المنظّمة — تُقرأ من محركات البحث ولا تظهر للزائر */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            organizationJsonLd(settings),
            websiteJsonLd(settings),
          ]),
        }}
      />

      <Hero projects={projects} settings={settings} />

      <div id="after-hero" />

      <TickerBand items={categories.map((category) => category.name)} />

      <CategoriesRail
        categories={categories.map((category) => ({
          slug: category.slug,
          name: category.name,
          iconKey: category.iconKey,
          count: category._count.products,
        }))}
      />

      <StatsBand
        stats={[
          { value: services.length, label: "خدمة طباعة وتجهيز" },
          { value: allProducts.length, label: "منتج جاهز للطلب" },
          { value: new Date().getFullYear() - brand.foundedYear, label: "سنة من الخبرة" },
          { value: 24, label: "ساعة لوصول عرض السعر", plus: false },
        ]}
      />

      {sections.map((section) => section.node)}
    </>
  );
}

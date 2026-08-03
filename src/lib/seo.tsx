import { contact, siteUrl } from "@/config/brand";
import type { Settings } from "@/lib/settings";
import { absoluteUrl, truncate } from "@/lib/utils";

/**
 * البيانات المنظّمة (JSON-LD).
 *
 * تساعد محركات البحث على فهم أن الموقع لمنشأة محلية تبيع منتجات، فتظهر
 * النتائج بمعلومات إضافية: السعر، التوفّر، التقييم، مسار التنقّل، والأسئلة.
 */

type JsonLd = Record<string, unknown>;

/** يستبعد الحقول الفارغة — Google يفضّل غياب الحقل على قيمة فارغة. */
function compact(input: JsonLd): JsonLd {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => {
      if (value === null || value === undefined) return false;
      if (typeof value === "string" && value.trim() === "") return false;
      if (Array.isArray(value) && value.length === 0) return false;
      return true;
    }),
  );
}

export function organizationJsonLd(settings: Settings): JsonLd {
  return compact({
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${siteUrl}/#organization`,
    name: settings.companyName,
    description: settings.description,
    url: siteUrl,
    telephone: settings.phone,
    email: settings.email,
    priceRange: "$$",
    address: compact({
      "@type": "PostalAddress",
      addressLocality: settings.city,
      addressRegion: contact.region,
      addressCountry: contact.countryCode,
      streetAddress:
        settings.addressLine !== settings.city ? settings.addressLine : undefined,
    }),
    geo: contact.geo
      ? {
          "@type": "GeoCoordinates",
          latitude: contact.geo.lat,
          longitude: contact.geo.lng,
        }
      : undefined,
    openingHours: contact.workingHoursSchema,
    areaServed: { "@type": "Country", name: "المملكة العربية السعودية" },
    sameAs: Object.values(settings.social).filter(
      (url): url is string => typeof url === "string" && url.length > 0,
    ),
    vatID: settings.vatNumber || undefined,
  });
}

export function websiteJsonLd(settings: Settings): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}/#website`,
    name: settings.companyName,
    url: siteUrl,
    inLanguage: "ar-SA",
    publisher: { "@id": `${siteUrl}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteUrl}/shop?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbJsonLd(items: { label: string; href: string }[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "الرئيسية",
        item: siteUrl,
      },
      ...items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 2,
        name: item.label,
        item: absoluteUrl(item.href),
      })),
    ],
  };
}

export function productJsonLd(input: {
  name: string;
  description: string | null;
  slug: string;
  categorySlug: string;
  imageUrl: string | null;
  price: number | null;
  currency: string;
  sku: string | null;
  brandName: string;
  inStock: boolean;
}): JsonLd {
  const url = absoluteUrl(`/shop/${input.categorySlug}/${input.slug}`);

  return compact({
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    description: input.description ? truncate(input.description, 300) : undefined,
    sku: input.sku || undefined,
    image: input.imageUrl ? absoluteUrl(input.imageUrl) : undefined,
    brand: { "@type": "Brand", name: input.brandName },
    url,
    offers: compact({
      "@type": "Offer",
      url,
      priceCurrency: input.currency,
      // بدون سعر يُعرض العرض كـ "بعرض سعر" — لا نلفّق رقمًا
      price: input.price !== null ? input.price.toFixed(2) : undefined,
      availability: input.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/PreOrder",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@id": `${siteUrl}/#organization` },
    }),
  });
}

export function faqJsonLd(faqs: { question: string; answer: string }[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

export function serviceJsonLd(input: {
  title: string;
  description: string;
  slug: string;
  settings: Settings;
}): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: input.title,
    description: truncate(input.description, 300),
    url: absoluteUrl(`/services/${input.slug}`),
    provider: { "@id": `${siteUrl}/#organization` },
    areaServed: { "@type": "Country", name: "المملكة العربية السعودية" },
    serviceType: input.title,
  };
}

export function creativeWorkJsonLd(input: {
  title: string;
  description: string | null;
  slug: string;
  imageUrl: string | null;
  completedAt: Date | null;
}): JsonLd {
  return compact({
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: input.title,
    description: input.description ? truncate(input.description, 300) : undefined,
    url: absoluteUrl(`/portfolio/${input.slug}`),
    image: input.imageUrl ? absoluteUrl(input.imageUrl) : undefined,
    dateCreated: input.completedAt?.toISOString(),
    creator: { "@id": `${siteUrl}/#organization` },
  });
}

/** مكوّن مختصر لإدراج البيانات المنظّمة في الصفحات. */
export function JsonLd({ data }: { data: JsonLd | JsonLd[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

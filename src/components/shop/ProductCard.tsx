import Link from "next/link";

import { QuickAddButton } from "@/components/shop/QuickAddButton";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Icon, resolveIcon } from "@/components/ui/Icon";
import { Tilt } from "@/components/ui/Tilt";
import { Price, QuoteOnlyLabel } from "@/components/ui/Price";
import { SmartImage } from "@/components/ui/SmartImage";
import type { ProductCard as ProductCardData } from "@/lib/queries";
import { cn, formatNumber } from "@/lib/utils";
import { whatsappProductUrl } from "@/lib/whatsapp";

/**
 * بطاقة منتج — مصمّمة للجوال أولاً.
 *
 * على الجوال تُعرض البطاقات في عمودين، فعرض البطاقة يقارب ١٧٠ بكسل. لذلك:
 *   • الوصف المختصر يختفي تحت 640px — لا مساحة له ولا يُقرأ فعليًا في عمودين.
 *   • مدة التنفيذ تظهر من 640px فأعلى؛ الحد الأدنى للكمية يبقى دائمًا لأنه
 *     أهم معلومة تمنع مفاجأة العميل في صفحة المنتج.
 *   • أحجام الخط والحشو تكبر تدريجيًا مع اتساع الشاشة.
 *
 * الأزرار تتبع نوع تسعير المنتج، فلا يظهر زر لا يؤدي عملاً:
 *   • FIXED / STARTS_FROM → "أضف للسلة" بالمواصفات الافتراضية.
 *   • QUOTE_ONLY          → "طلب عرض سعر" مع تعبئة اسم المنتج مسبقًا.
 * وفي الحالتين زر واتساب برسالة تحمل اسم المنتج ورابطه.
 */
export function ProductCard({
  product,
  className,
}: {
  product: ProductCardData;
  className?: string;
}) {
  const isQuoteOnly = product.priceMode === "QUOTE_ONLY";

  return (
    <Tilt className="rounded-2xl" max={3}>
    <article
      className={cn(
        "group border-border bg-surface flex h-full flex-col overflow-hidden rounded-2xl border",
        "shadow-card hover:shadow-card-hover hover:border-border-strong transition-[box-shadow,border-color] duration-300",
        className,
      )}
    >
      <Link
        href={product.href}
        // الرابط يغطّي الصورة والعنوان؛ الأزرار أسفله خارج نطاقه
        className="focus-visible:outline-accent-600 relative block focus-visible:outline-2 focus-visible:-outline-offset-2"
        tabIndex={-1}
        aria-hidden="true"
      >
        <SmartImage
          src={product.imageUrl}
          alt={product.imageAlt}
          ratio="4/3"
          icon={resolveIcon(product.categoryIcon)}
          placeholderLabel={product.name}
          zoomOnHover
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 25vw"
        />

        {product.isFeatured ? (
          <Badge
            tone="dark"
            className="absolute top-2 right-2 px-2 py-0.5 text-[0.6rem] shadow-sm md:top-3 md:right-3 md:px-2.5 md:py-1 md:text-xs"
          >
            الأكثر طلبًا
          </Badge>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col p-3 md:p-5">
        <Link
          href={`/shop/${product.categorySlug}`}
          className="text-accent-700 hover:text-accent-800 mb-1.5 inline-flex w-fit text-[0.62rem] font-bold transition-colors md:mb-2 md:text-[0.7rem]"
        >
          {product.categoryName}
        </Link>

        <h3 className="text-sm leading-snug font-bold md:text-base">
          <Link
            href={product.href}
            className="focus-visible:outline-accent-600 hover:text-accent-800 line-clamp-2 rounded transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {product.name}
          </Link>
        </h3>

        {/* الوصف يُخفى في عرض العمودين على الجوال — لا مساحة كافية لقراءته */}
        {product.shortDescription ? (
          <p className="text-primary-600 mt-2 hidden line-clamp-2 text-sm leading-relaxed sm:block">
            {product.shortDescription}
          </p>
        ) : null}

        {/* بيانات تشغيلية يسأل عنها العميل قبل الطلب */}
        <ul className="text-primary-500 mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[0.65rem] md:mt-3 md:gap-x-4 md:text-xs">
          {product.minQuantity > 1 ? (
            <li className="inline-flex items-center gap-1">
              <Icon name="package" className="size-3 md:size-3.5" strokeWidth={1.8} />
              من {formatNumber(product.minQuantity)} {product.unit}
            </li>
          ) : null}
          {product.leadTime ? (
            <li className="hidden items-center gap-1 sm:inline-flex">
              <Icon name="clock" className="size-3.5" strokeWidth={1.8} />
              {product.leadTime}
            </li>
          ) : null}
        </ul>

        {/* السعر والأزرار مثبّتان أسفل البطاقة لتتساوى البطاقات في الشبكة */}
        <div className="mt-auto pt-3 md:pt-4">
          <div className="mb-2.5 min-h-7 md:mb-3 md:min-h-8">
            {isQuoteOnly || product.startingPrice === null ? (
              <QuoteOnlyLabel className="text-xs md:text-sm" />
            ) : (
              <Price
                value={product.startingPrice}
                size="md"
                startsFrom={product.priceMode === "STARTS_FROM"}
                compareAt={product.compareAtPrice}
              />
            )}
          </div>

          <div className="flex gap-1.5 md:gap-2">
            {isQuoteOnly ? (
              <ButtonLink
                href={`/quote?product=${encodeURIComponent(product.slug)}`}
                variant="primary"
                size="sm"
                className="min-w-0 flex-1 px-2 text-xs md:px-3.5 md:text-sm"
              >
                عرض سعر
              </ButtonLink>
            ) : (
              <QuickAddButton
                productId={product.id}
                productName={product.name}
                className="min-w-0 flex-1"
              />
            )}

            <a
              href={whatsappProductUrl({
                productName: product.name,
                productPath: product.href,
              })}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`اطلب ${product.name} عبر واتساب`}
              title="اطلب عبر واتساب"
              className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#25D366] text-white transition-colors hover:bg-[#1EBE5A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1EBE5A]"
            >
              <Icon name="whatsapp" className="size-4 md:size-[1.15rem]" />
            </a>
          </div>
        </div>
      </div>
    </article>
    </Tilt>
  );
}

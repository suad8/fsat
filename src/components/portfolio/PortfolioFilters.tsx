"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * فلاتر معرض الأعمال.
 *
 * روابط حقيقية لا أزرار — فكل تصنيف له عنوان خاص قابل للمشاركة والفهرسة،
 * ويعمل مع زر الرجوع ومع تعطيل الـ JavaScript.
 */
export function PortfolioFilters({
  categories,
  activeSlug,
  totalCount,
}: {
  categories: { slug: string; name: string; count: number }[];
  activeSlug?: string;
  totalCount: number;
}) {
  return (
    <nav aria-label="تصنيفات الأعمال" className="mb-8">
      <ul className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <li>
          <Chip href="/portfolio" active={!activeSlug}>
            الكل
            <span className="text-[0.7rem] opacity-70">({totalCount})</span>
          </Chip>
        </li>

        {categories
          .filter((category) => category.count > 0 || category.slug === activeSlug)
          .map((category) => (
            <li key={category.slug}>
              <Chip
                href={`/portfolio?category=${encodeURIComponent(category.slug)}`}
                active={activeSlug === category.slug}
              >
                {category.name}
                <span className="text-[0.7rem] opacity-70">({category.count})</span>
              </Chip>
            </li>
          ))}
      </ul>
    </nav>
  );
}

function Chip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold whitespace-nowrap transition-colors",
        "focus-visible:outline-accent-600 focus-visible:outline-2 focus-visible:outline-offset-2",
        active
          ? "bg-primary-950 text-white"
          : "bg-surface-sunken text-primary-700 hover:bg-primary-200",
      )}
    >
      {children}
    </Link>
  );
}

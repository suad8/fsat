"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";

import { Icon, resolveIcon } from "@/components/ui/Icon";
import { gsap, MOTION_OK } from "@/lib/gsap";
import { cn } from "@/lib/utils";

const SORT_OPTIONS = [
  { value: "featured", label: "الأكثر طلبًا" },
  { value: "priceAsc", label: "السعر: من الأقل" },
  { value: "priceDesc", label: "السعر: من الأعلى" },
  { value: "newest", label: "الأحدث" },
] as const;

/**
 * فلاتر المتجر.
 *
 * الحالة كلها في عنوان الصفحة (searchParams) لا في حالة React، فيبقى الرابط
 * قابلاً للمشاركة والحفظ، ويعمل زر الرجوع في المتصفّح كما يتوقّع المستخدم.
 */
export function ShopFilters({
  categories,
  activeCategory,
  resultCount,
}: {
  categories: { slug: string; name: string; count: number; iconKey?: string | null }[];
  activeCategory?: string;
  resultCount: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentSort = searchParams.get("sort") ?? "featured";
  const currentSearch = searchParams.get("q") ?? "";

  /*
   * مزامنة حقل البحث عند تغيّر الرابط من الخارج (زر الرجوع مثلاً).
   * الضبط أثناء الرسم — لا داخل effect — هو النمط الذي يوصي به React
   * لتعديل الحالة عند تغيّر قيمة قادمة من الأعلى: React يعيد الرسم فورًا
   * قبل عرض أي شيء للمستخدم، فلا وميض ولا رسمة ضائعة.
   */
  const [searchValue, setSearchValue] = useState(currentSearch);
  const [syncedSearch, setSyncedSearch] = useState(currentSearch);

  if (syncedSearch !== currentSearch) {
    setSyncedSearch(currentSearch);
    setSearchValue(currentSearch);
  }

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="mb-8 space-y-6">
      {/* الأقسام أولًا: أول ما يراه العميل بلا نزول */}
      <CategoryTiles
        categories={categories}
        activeCategory={activeCategory}
        totalCount={categories.reduce((sum, category) => sum + category.count, 0)}
        href={(base) => buildHref(base, searchParams)}
      />

      {/* البحث والترتيب */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            updateParam("q", searchValue.trim() || null);
          }}
          className="relative flex-1"
        >
          <label htmlFor="shop-search" className="sr-only">
            ابحث في المنتجات
          </label>
          {/*
            الأيقونة في جهة البداية (يمين الواجهة العربية)، لذا الحشو الكبير
            يجب أن يكون ps لا pe — عكسهما يجعل النص يمرّ تحت الأيقونة.
          */}
          <Icon
            name="search"
            className="text-primary-400 pointer-events-none absolute inset-y-0 start-3.5 my-auto size-4.5"
          />
          <input
            id="shop-search"
            type="search"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="ابحث عن منتج…"
            className="border-border-strong bg-surface text-primary-900 placeholder:text-primary-400 hover:border-primary-400 focus-visible:outline-accent-600 w-full rounded-lg border py-2.5 ps-11 pe-4 text-sm transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1"
          />
        </form>

        <div className="flex items-center gap-2">
          <label htmlFor="shop-sort" className="text-primary-600 shrink-0 text-sm">
            ترتيب حسب
          </label>
          <div className="relative">
            <select
              id="shop-sort"
              value={currentSort}
              onChange={(event) => updateParam("sort", event.target.value)}
              className="border-border-strong bg-surface text-primary-900 hover:border-primary-400 focus-visible:outline-accent-600 appearance-none rounded-lg border py-2.5 ps-4 pe-10 text-sm font-medium transition-colors focus:outline-none focus-visible:outline-2"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Icon
              name="chevronDown"
              className="text-primary-400 pointer-events-none absolute inset-y-0 left-3 my-auto size-4"
            />
          </div>
        </div>
      </div>

      {/* عدد النتائج ومسح الفلاتر */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p aria-live="polite" className="text-primary-600 text-sm">
          {resultCount === 0
            ? "لا توجد نتائج"
            : `${resultCount} ${resultCount === 1 ? "منتج" : "منتجات"}`}
          {currentSearch ? (
            <>
              {" "}
              لكلمة <span className="text-primary-900 font-bold">«{currentSearch}»</span>
            </>
          ) : null}
        </p>

        {currentSearch || currentSort !== "featured" || activeCategory ? (
          <Link
            href="/shop"
            className="text-accent-700 hover:text-accent-800 inline-flex items-center gap-1 text-sm font-bold transition-colors"
          >
            <Icon name="close" className="size-3.5" strokeWidth={2.5} />
            مسح الفلاتر
          </Link>
        ) : null}
      </div>
    </div>
  );
}

/** يحافظ على البحث والترتيب عند التنقّل بين التصنيفات. */
function buildHref(base: string, params: URLSearchParams): string {
  const kept = new URLSearchParams();
  const q = params.get("q");
  const sort = params.get("sort");
  if (q) kept.set("q", q);
  if (sort && sort !== "featured") kept.set("sort", sort);
  const query = kept.toString();
  return query ? `${base}?${query}` : base;
}

function CategoryTiles({
  categories,
  activeCategory,
  totalCount,
  href,
}: {
  categories: { slug: string; name: string; count: number; iconKey?: string | null }[];
  activeCategory?: string;
  totalCount: number;
  href: (base: string) => string;
}) {
  const scope = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.fromTo(
          "[data-tile]",
          { autoAlpha: 0, y: 22, scale: 0.94 },
          { autoAlpha: 1, y: 0, scale: 1, duration: 0.7, ease: "power3.out", stagger: 0.05 },
        );
      });
      return () => mm.revert();
    },
    { scope },
  );

  const tiles = [
    { slug: "", name: "كل المنتجات", count: totalCount, icon: "package" as const },
    ...categories
      .filter((category) => category.count > 0 || category.slug === activeCategory)
      .map((category) => ({
      slug: category.slug,
      name: category.name,
      count: category.count,
      icon: resolveIcon(category.iconKey ?? null),
    })),
  ];

  return (
    <nav ref={scope} aria-label="أقسام المتجر">
      {/* جوال: صفّان قابلان للسحب أفقيًا — شاشات أكبر: شبكة مرئية بالكامل */}
      <ul className="no-scrollbar -mx-4 grid auto-cols-[11.5rem] grid-flow-col grid-rows-2 gap-2.5 overflow-x-auto px-4 pb-1 [scroll-snap-type:x_proximity] sm:mx-0 sm:auto-cols-auto sm:grid-flow-row sm:grid-cols-3 sm:grid-rows-none sm:overflow-visible sm:px-0 md:grid-cols-4 lg:grid-cols-5 lg:gap-3">
        {tiles.map((tile) => {
          const active = (activeCategory ?? "") === tile.slug;
          return (
            <li key={tile.slug || "all"} data-tile className="[scroll-snap-align:start]">
              <Link
                href={href(tile.slug ? `/shop/${tile.slug}` : "/shop")}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex h-full items-center gap-3 rounded-2xl border p-3 transition-[transform,box-shadow,background-color,border-color] duration-300",
                  "focus-visible:outline-accent-600 focus-visible:outline-2 focus-visible:outline-offset-2",
                  active
                    ? "bg-ink border-ink text-white shadow-card-hover"
                    : "border-border bg-surface hover:border-accent-500 hover:shadow-card-hover text-primary-900 hover:-translate-y-0.5",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid size-11 shrink-0 place-items-center rounded-xl transition-colors duration-300",
                    active
                      ? "bg-accent-500 text-accent-contrast"
                      : "bg-surface-sunken text-primary-700 group-hover:bg-accent-500 group-hover:text-accent-contrast",
                  )}
                >
                  <Icon name={tile.icon} className="size-5" strokeWidth={1.6} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-extrabold">{tile.name}</span>
                  <span
                    className={cn(
                      "block text-xs font-medium",
                      active ? "text-primary-300" : "text-primary-500",
                    )}
                  >
                    {tile.count} {tile.count === 1 ? "منتج" : "منتجات"}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

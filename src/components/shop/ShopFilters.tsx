"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";

import { Icon, resolveIcon } from "@/components/ui/Icon";
import { gsap, MOTION_OK } from "@/lib/gsap";
import { cn } from "@/lib/utils";

const SORT_OPTIONS = [
  { value: "featured", label: "المميّز أولًا" },
  { value: "priceAsc", label: "السعر: من الأقل" },
  { value: "priceDesc", label: "السعر: من الأعلى" },
  { value: "newest", label: "الأحدث" },
] as const;

const MODE_OPTIONS = [
  { value: "", label: "الكل" },
  { value: "direct", label: "شراء مباشر بسعر معروض" },
  { value: "quote", label: "بعرض سعر" },
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
  const currentMode = searchParams.get("mode") ?? "";
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
            if (typingTimer.current) clearTimeout(typingTimer.current);
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
            className="text-primary-400 pointer-events-none absolute inset-y-0 start-4 my-auto size-5"
          />
          <input
            id="shop-search"
            type="search"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            value={searchValue}
            onChange={(event) => {
              const next = event.target.value;
              setSearchValue(next);
              // بحث فوري: يُنفَّذ بعد توقف الكتابة لحظة
              if (typingTimer.current) clearTimeout(typingTimer.current);
              typingTimer.current = setTimeout(() => updateParam("q", next.trim() || null), 450);
            }}
            placeholder="ابحث عن منتج: كوب، بوكس، كروت…"
            className="border-border-strong bg-surface text-primary-900 placeholder:text-primary-400 hover:border-primary-400 h-12 w-full rounded-xl border ps-12 pe-4 text-base transition-[border-color,box-shadow] focus:outline-none focus-visible:border-accent-600 focus-visible:ring-2 focus-visible:ring-accent-500/50"
          />
        </form>

        <div className="flex items-center gap-2">
          <label htmlFor="shop-sort" className="text-primary-600 shrink-0 text-sm">
            ترتيب حسب
          </label>
          <div className="relative flex-1 sm:flex-none">
            <select
              id="shop-sort"
              value={currentSort}
              onChange={(event) => updateParam("sort", event.target.value)}
              className="border-border-strong bg-surface text-primary-900 hover:border-primary-400 h-12 w-full appearance-none rounded-xl border ps-4 pe-10 text-base font-medium transition-[border-color,box-shadow] focus:outline-none focus-visible:border-accent-600 focus-visible:ring-2 focus-visible:ring-accent-500/50"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Icon
              name="chevronDown"
              className="text-primary-400 pointer-events-none absolute inset-y-0 end-3 my-auto size-4"
            />
          </div>
        </div>
      </div>

      {/* نوع التسعير */}
      <div role="group" aria-label="نوع الطلب" className="flex flex-wrap gap-2">
        {MODE_OPTIONS.map((option) => {
          const active = currentMode === option.value;
          return (
            <button
              key={option.value || "all"}
              type="button"
              aria-pressed={active}
              onClick={() => updateParam("mode", option.value || null)}
              className={cn(
                "inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-bold transition-colors",
                "focus-visible:outline-accent-600 focus-visible:outline-2 focus-visible:outline-offset-2",
                active
                  ? "border-primary-950 bg-primary-950 text-white"
                  : "border-border-strong bg-surface text-primary-700 hover:border-primary-400",
              )}
            >
              {option.label}
            </button>
          );
        })}
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

        {currentSearch || currentSort !== "featured" || currentMode || activeCategory ? (
          <Link
            href="/shop"
            className="text-accent-800 hover:text-accent-900 inline-flex min-h-11 items-center gap-1 text-sm font-bold transition-colors"
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
  const mode = params.get("mode");
  if (mode) kept.set("mode", mode);
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

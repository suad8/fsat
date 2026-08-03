"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { useCart } from "@/components/cart/CartProvider";
import { ButtonLink, IconButton } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Logo } from "@/components/site/Logo";
import { contact } from "@/config/brand";
import { mainNav } from "@/config/nav";
import { cn } from "@/lib/utils";
import { telUrl, whatsappGeneralUrl } from "@/lib/whatsapp";

type HeaderProps = {
  categories: { slug: string; name: string }[];
};

export function Header({ categories }: HeaderProps) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  /*
   * القائمة تُخزَّن مع المسار الذي فُتحت فيه، ويُشتق كونها مفتوحة من مطابقة
   * المسار الحالي. هكذا تُغلق تلقائيًا عند الانتقال لصفحة أخرى دون effect
   * يستدعي setState ويسبب رسمة إضافية بعد كل تنقّل.
   */
  const [menu, setMenu] = useState({ open: false, path: pathname });
  const menuOpen = menu.open && menu.path === pathname;

  const setMenuOpen = useCallback(
    (open: boolean | ((previous: boolean) => boolean)) => {
      setMenu((current) => {
        const previous = current.open && current.path === pathname;
        return {
          open: typeof open === "function" ? open(previous) : open,
          path: pathname,
        };
      });
    },
    [pathname],
  );

  // ظل خفيف يظهر بعد التمرير ليفصل الترويسة عن المحتوى
  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // منع تمرير الصفحة خلف قائمة الجوال المفتوحة
  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [menuOpen]);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-shadow duration-300",
        scrolled ? "shadow-[0_1px_20px_rgb(18_17_16/0.08)]" : "",
      )}
    >
      {/* شريط علوي — معلومات تواصل سريعة، يختفي على الجوال لتوفير المساحة */}
      <div className="bg-primary-950 text-primary-300 hidden py-2 text-xs lg:block">
        <div className="container-page flex items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <a
              href={telUrl}
              className="hover:text-accent-300 inline-flex items-center gap-1.5 transition-colors"
            >
              <Icon name="phone" className="size-3.5" strokeWidth={1.8} />
              <span dir="ltr">{contact.phoneDisplay}</span>
            </a>
            <a
              href={`mailto:${contact.email}`}
              className="hover:text-accent-300 inline-flex items-center gap-1.5 transition-colors"
            >
              <Icon name="mail" className="size-3.5" strokeWidth={1.8} />
              {contact.email}
            </a>
          </div>

          <span className="inline-flex items-center gap-1.5">
            <Icon name="clock" className="size-3.5" strokeWidth={1.8} />
            {contact.workingHours}
          </span>
        </div>
      </div>

      {/* الشريط الرئيسي */}
      <div className="border-border bg-surface/95 border-b backdrop-blur-sm">
        <div className="container-page flex h-16 items-center justify-between gap-4 md:h-20">
          <Logo priority />

          <DesktopNav categories={categories} isActive={isActive} />

          <div className="flex items-center gap-1.5 md:gap-2">
            <CartButton />

            <ButtonLink
              href="/quote"
              variant="accent"
              size="sm"
              className="hidden md:inline-flex"
            >
              طلب عرض سعر
            </ButtonLink>

            <IconButton
              name={menuOpen ? "close" : "menu"}
              label={menuOpen ? "إغلاق القائمة" : "فتح القائمة"}
              variant="outline"
              size="sm"
              className="lg:hidden"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              onClick={() => setMenuOpen((open) => !open)}
            />
          </div>
        </div>
      </div>

      <MobileMenu
        open={menuOpen}
        categories={categories}
        isActive={isActive}
        onClose={() => setMenuOpen(false)}
      />
    </header>
  );
}

// ---------------------------------------------------------------------------

function DesktopNav({
  categories,
  isActive,
}: {
  categories: { slug: string; name: string }[];
  isActive: (href: string) => boolean;
}) {
  return (
    <nav aria-label="التنقّل الرئيسي" className="hidden lg:block">
      <ul className="flex items-center gap-1">
        {mainNav.map((item) => {
          const active = isActive(item.href);
          const hasDropdown = item.href === "/shop" && categories.length > 0;

          return (
            <li key={item.href} className={cn(hasDropdown && "group relative")}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-bold transition-colors",
                  active
                    ? "text-accent-700 bg-accent-50"
                    : "text-primary-700 hover:text-primary-950 hover:bg-surface-sunken",
                )}
              >
                {item.label}
                {hasDropdown ? (
                  <Icon
                    name="chevronDown"
                    className="size-3.5 transition-transform group-hover:rotate-180"
                    strokeWidth={2}
                  />
                ) : null}
              </Link>

              {hasDropdown ? (
                <div
                  className={cn(
                    "absolute top-full right-0 pt-2",
                    "pointer-events-none opacity-0 transition-opacity duration-200",
                    "group-hover:pointer-events-auto group-hover:opacity-100",
                    "group-focus-within:pointer-events-auto group-focus-within:opacity-100",
                  )}
                >
                  <ul className="border-border bg-surface shadow-pop w-64 rounded-xl border p-2">
                    {categories.map((category) => (
                      <li key={category.slug}>
                        <Link
                          href={`/shop/${category.slug}`}
                          className="text-primary-700 hover:bg-surface-sunken hover:text-primary-950 block rounded-md px-3 py-2 text-sm font-medium transition-colors"
                        >
                          {category.name}
                        </Link>
                      </li>
                    ))}
                    <li className="border-border mt-1 border-t pt-1">
                      <Link
                        href="/shop"
                        className="text-accent-700 hover:bg-accent-50 block rounded-md px-3 py-2 text-sm font-bold transition-colors"
                      >
                        عرض كل المنتجات
                      </Link>
                    </li>
                  </ul>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// ---------------------------------------------------------------------------

function CartButton() {
  const { itemCount, hydrated } = useCart();

  return (
    <Link
      href="/cart"
      aria-label={
        hydrated && itemCount > 0 ? `السلة، ${itemCount} منتج` : "السلة"
      }
      className="border-border-strong text-primary-700 hover:border-primary-400 hover:bg-surface-muted focus-visible:outline-accent-600 relative grid size-9 place-items-center rounded-lg border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 md:size-11"
    >
      <Icon name="cart" className="size-5" />

      {/* العدّاد لا يُعرض قبل قراءة السلة من التخزين، تفاديًا لاختلاف الترطيب */}
      {hydrated && itemCount > 0 ? (
        <span className="bg-brand-600 absolute -top-1.5 -left-1.5 grid min-w-5 place-items-center rounded-full px-1 text-[0.65rem] font-bold text-white tabular-nums">
          {itemCount > 99 ? "٩٩+" : itemCount}
        </span>
      ) : null}
    </Link>
  );
}

// ---------------------------------------------------------------------------

function MobileMenu({
  open,
  categories,
  isActive,
  onClose,
}: {
  open: boolean;
  categories: { slug: string; name: string }[];
  isActive: (href: string) => boolean;
  onClose: () => void;
}) {
  return (
    <>
      {/* طبقة تعتيم */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={cn(
          "bg-primary-950/50 fixed inset-0 top-16 z-40 transition-opacity duration-300 lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      <div
        id="mobile-menu"
        // inert يمنع الوصول للروابط بلوحة المفاتيح والقارئ عندما تكون القائمة مغلقة
        inert={!open}
        className={cn(
          "bg-surface fixed inset-x-0 top-16 z-40 max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain border-b lg:hidden",
          "border-border transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          open ? "translate-y-0 opacity-100" : "-translate-y-3 opacity-0",
        )}
      >
        <nav aria-label="قائمة الجوال" className="container-page py-5">
          <ul className="flex flex-col gap-1">
            {mainNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={cn(
                    "flex items-center justify-between rounded-lg px-4 py-3 text-[0.95rem] font-bold transition-colors",
                    isActive(item.href)
                      ? "bg-accent-50 text-accent-700"
                      : "text-primary-800 hover:bg-surface-sunken",
                  )}
                >
                  <span className="flex flex-col">
                    {item.label}
                    {item.description ? (
                      <span className="text-primary-500 mt-0.5 text-xs font-normal">
                        {item.description}
                      </span>
                    ) : null}
                  </span>
                  <Icon name="chevronLeft" className="text-primary-300 size-4" />
                </Link>
              </li>
            ))}
          </ul>

          {categories.length > 0 ? (
            <div className="border-border mt-5 border-t pt-5">
              <p className="text-primary-500 mb-3 px-4 text-xs font-bold tracking-wider">
                أقسام المتجر
              </p>
              <ul className="grid grid-cols-2 gap-1.5">
                {categories.map((category) => (
                  <li key={category.slug}>
                    <Link
                      href={`/shop/${category.slug}`}
                      className="text-primary-700 hover:bg-surface-sunken block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
                    >
                      {category.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="border-border mt-5 grid gap-2.5 border-t pt-5">
            <ButtonLink href="/quote" variant="accent" fullWidth>
              طلب عرض سعر
            </ButtonLink>
            <ButtonLink
              href={whatsappGeneralUrl()}
              external
              variant="whatsapp"
              icon="whatsapp"
              fullWidth
            >
              تواصل عبر واتساب
            </ButtonLink>
            <a
              href={telUrl}
              className="text-primary-600 hover:text-primary-900 inline-flex items-center justify-center gap-2 py-2 text-sm font-bold transition-colors"
            >
              <Icon name="phone" className="size-4" />
              <span dir="ltr">{contact.phoneDisplay}</span>
            </a>
          </div>
        </nav>
      </div>
    </>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { logoutAction } from "@/app/admin/actions/auth";
import { AdminIcon } from "@/components/admin/AdminIcon";
import { AdminEnter } from "@/components/admin/AdminMotion";
import { CommandPalette } from "@/components/admin/CommandPalette";
import { AdminFeedbackProvider } from "@/components/admin/Feedback";
import {
  adminNavGroups,
  mobileTabs,
  titleForPath,
  type AdminBadgeKey,
  type AdminNavLink,
} from "@/components/admin/nav";
import { brand } from "@/config/brand";
import { cn, formatNumber } from "@/lib/utils";

import "@/components/admin/admin.css";

/**
 * هيكل لوحة التحكم.
 *
 * شريط جانبي مجمَّع (عمليات / محتوى / إعدادات) بعدّادات تنبيه، وشريط علوي فيه
 * البحث السريع، وعلى الجوال شريط سفلي بأهم أربع شاشات + قائمة كاملة تنزلق من
 * الجانب. الإدارة من الجوال ليست حالة نادرة — فالتصميم يبدأ منه.
 */

type Counts = Record<AdminBadgeKey, number>;
type Theme = "light" | "dark";

const THEME_KEY = "adm-theme";
const THEME_EVENT = "adm:theme";

function subscribeTheme(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(THEME_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(THEME_EVENT, callback);
  };
}

function readTheme(): Theme {
  try {
    return window.localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function writeTheme(next: Theme) {
  try {
    window.localStorage.setItem(THEME_KEY, next);
  } catch {
    // التخزين محجوب (تصفّح خاص) — يبقى التبديل لهذه الجلسة عبر الحدث فقط
  }
  window.dispatchEvent(new Event(THEME_EVENT));
}

export function AdminShell({
  user,
  counts,
  children,
}: {
  user: { name: string; email: string; role: string };
  counts: Counts;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const theme = useSyncExternalStore<Theme>(subscribeTheme, readTheme, () => "light");

  const [menu, setMenu] = useState({ open: false, path: pathname });
  const [palette, setPalette] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  /* القائمة تُخزَّن مع مسارها فتُغلق تلقائيًا عند الانتقال دون effect إعادة ضبط */
  const drawerOpen = menu.open && menu.path === pathname;
  const setDrawer = useCallback(
    (next: boolean) => setMenu({ open: next, path: pathname }),
    [pathname],
  );

  // Ctrl/⌘+K من أي مكان
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPalette((current) => !current);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // القائمة الجانبية على الجوال: Esc يغلق، والتركيز ينتقل إليها ثم يعود للزر
  useEffect(() => {
    if (!drawerOpen) return;

    const trigger = menuButtonRef.current;
    closeButtonRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setDrawer(false);
    }
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      trigger?.focus();
    };
  }, [drawerOpen, setDrawer]);

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const badgeFor = (link: AdminNavLink) => (link.badge ? counts[link.badge] : 0);

  const sidebarLink = (link: AdminNavLink) => {
    const active = isActive(link.href);
    const badge = badgeFor(link);

    return (
      <li key={link.href}>
        <Link
          href={link.href}
          aria-current={active ? "page" : undefined}
          className={cn(
            "relative flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm transition-colors",
            active
              ? "bg-white/10 font-bold text-white"
              : "text-(--adm-ink-text) hover:bg-white/5 hover:text-white",
          )}
        >
          {active ? (
            <span
              aria-hidden="true"
              className="absolute inset-y-2 -end-0 w-1 rounded-s bg-(--adm-gold) max-lg:hidden"
              style={{ insetInlineStart: 0 }}
            />
          ) : null}
          <AdminIcon
            name={link.icon}
            className={cn("size-[1.1rem]", active && "text-(--adm-gold)")}
            strokeWidth={active ? 1.9 : 1.6}
          />
          <span className="min-w-0 flex-1 truncate">{link.label}</span>
          {badge > 0 ? (
            <span
              className="min-w-6 rounded-full bg-(--adm-gold) px-1.5 py-0.5 text-center text-[0.68rem] leading-none font-extrabold text-[#261747] tabular-nums"
              aria-label={`${badge} جديد`}
            >
              {formatNumber(badge)}
            </span>
          ) : null}
        </Link>
      </li>
    );
  };

  const moreBadge = counts.testimonials;

  return (
    <div
      className="adm bg-surface-sunken text-primary-900 min-h-dvh"
      data-adm-theme={theme}
      style={{ ["--adm-max" as string]: "90rem" }}
    >
      <AdminFeedbackProvider>
        <a
          href="#main"
          className="adm-chrome bg-primary-950 sr-only text-white focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[100] focus:rounded-md focus:px-4 focus:py-2 focus:text-sm focus:font-bold"
        >
          تخطّي إلى المحتوى
        </a>

        <div className="flex min-h-dvh">
          {/* ---------- الغطاء خلف القائمة (جوال) ---------- */}
          <div
            onClick={() => setDrawer(false)}
            aria-hidden="true"
            className={cn(
              "adm-chrome fixed inset-0 z-40 bg-black/55 transition-opacity lg:hidden",
              drawerOpen ? "opacity-100" : "pointer-events-none opacity-0",
            )}
          />

          {/* ---------- الشريط الجانبي ---------- */}
          <aside
            aria-label="القائمة الرئيسية"
            className={cn(
              "adm-chrome adm-on-ink fixed inset-y-0 start-0 z-50 flex w-72 flex-col bg-(--adm-ink) text-white",
              "transition-[transform,visibility] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
              "lg:sticky lg:top-0 lg:h-dvh lg:w-64 lg:shrink-0 lg:translate-x-0 lg:visible",
              drawerOpen ? "visible translate-x-0" : "invisible translate-x-full lg:translate-x-0",
            )}
            style={{ insetInlineStart: 0 }}
          >
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-5">
              <Link href="/admin" className="flex items-center gap-2.5">
                <span
                  aria-hidden="true"
                  className="grid size-8 place-items-center rounded-lg bg-(--adm-gold) text-sm font-black text-[#261747]"
                >
                  {brand.nameShort.charAt(0)}
                </span>
                <span className="leading-tight">
                  <span className="font-display block text-sm font-bold">{brand.nameShort}</span>
                  <span className="block text-[0.68rem] text-(--adm-ink-text)">لوحة التحكم</span>
                </span>
              </Link>

              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setDrawer(false)}
                aria-label="إغلاق القائمة"
                className="grid size-10 place-items-center rounded-lg text-(--adm-ink-text) transition-colors hover:bg-white/10 hover:text-white lg:hidden"
              >
                <AdminIcon name="close" className="size-5" />
              </button>
            </div>

            <nav aria-label="تنقّل لوحة التحكم" className="flex-1 overflow-y-auto px-3 py-4">
              {adminNavGroups.map((group) => (
                <div key={group.id} className="mb-5 last:mb-0">
                  <p className="mb-1.5 px-3 text-[0.7rem] font-bold tracking-normal text-[#9a90c2]">
                    {group.title}
                  </p>
                  <ul className="space-y-0.5">{group.links.map(sidebarLink)}</ul>
                </div>
              ))}
            </nav>

            <div className="shrink-0 border-t border-white/10 p-3">
              <div className="mb-2 px-3">
                <p className="truncate text-sm font-bold">{user.name}</p>
                <p className="truncate text-xs text-[#9a90c2]">
                  {user.role} · <span dir="ltr">{user.email}</span>
                </p>
              </div>

              <Link
                href="/"
                target="_blank"
                rel="noopener"
                className="flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm text-(--adm-ink-text) transition-colors hover:bg-white/5 hover:text-white"
              >
                <AdminIcon name="externalLink" className="size-4" />
                عرض الموقع
              </Link>

              <form action={logoutAction}>
                <button
                  type="submit"
                  className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-sm text-(--adm-ink-text) transition-colors hover:bg-red-500/15 hover:text-red-200"
                >
                  <AdminIcon name="logout" className="size-4" />
                  تسجيل الخروج
                </button>
              </form>
            </div>
          </aside>

          {/* ---------- المحتوى ---------- */}
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="adm-chrome border-border bg-surface/90 sticky top-0 z-30 flex h-14 items-center gap-2 border-b px-3 backdrop-blur sm:px-5 lg:h-16 lg:px-8">
              <button
                ref={menuButtonRef}
                type="button"
                onClick={() => setDrawer(true)}
                aria-label="فتح القائمة"
                aria-expanded={drawerOpen}
                className="border-border-strong text-primary-700 hover:bg-surface-muted grid size-10 shrink-0 place-items-center rounded-lg border transition-colors lg:hidden"
              >
                <AdminIcon name="menu" className="size-5" />
              </button>

              <p className="font-display min-w-0 flex-1 truncate text-base font-bold lg:hidden">
                {titleForPath(pathname)}
              </p>

              <button
                type="button"
                onClick={() => setPalette(true)}
                aria-label="البحث السريع"
                aria-keyshortcuts="Control+K Meta+K"
                className="border-border-strong bg-surface text-primary-500 hover:border-primary-400 hover:text-primary-800 hidden h-10 w-full max-w-md items-center gap-2.5 rounded-lg border px-3.5 text-sm transition-colors lg:flex"
              >
                <AdminIcon name="search" className="size-4" />
                <span className="flex-1 text-start">ابحث عن طلب، عميل، جوال، منتج…</span>
                <kbd className="border-border rounded border px-1.5 font-mono text-[0.68rem]" dir="ltr">
                  Ctrl K
                </kbd>
              </button>

              <div className="ms-auto flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPalette(true)}
                  aria-label="البحث السريع"
                  className="text-primary-700 hover:bg-surface-sunken grid size-10 place-items-center rounded-lg lg:hidden"
                >
                  <AdminIcon name="search" className="size-5" />
                </button>

                <button
                  type="button"
                  onClick={() => writeTheme(theme === "dark" ? "light" : "dark")}
                  aria-label={theme === "dark" ? "التبديل إلى الوضع الفاتح" : "التبديل إلى الوضع الداكن"}
                  aria-pressed={theme === "dark"}
                  className="text-primary-700 hover:bg-surface-sunken grid size-10 place-items-center rounded-lg transition-colors"
                >
                  <AdminIcon name={theme === "dark" ? "sun" : "moon"} className="size-5" />
                </button>

                <Link
                  href="/"
                  target="_blank"
                  rel="noopener"
                  className="text-primary-700 hover:bg-surface-sunken hidden min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-bold transition-colors lg:inline-flex"
                >
                  <AdminIcon name="externalLink" className="size-4" />
                  الموقع
                </Link>
              </div>
            </header>

            <main
              id="main"
              tabIndex={-1}
              className="adm-main min-w-0 flex-1 px-4 pt-5 pb-[calc(var(--adm-bnav-h,0px)+1.5rem)] outline-none sm:px-6 sm:pt-6 lg:px-8 lg:pt-8"
            >
              <div className="mx-auto w-full max-w-[var(--adm-max,90rem)]">{children}</div>
            </main>
          </div>
        </div>

        {/* ---------- شريط الجوال السفلي ---------- */}
        <nav
          aria-label="تنقّل سريع"
          className="adm-chrome border-border bg-surface/95 fixed inset-x-0 bottom-0 z-30 border-t backdrop-blur lg:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          <ul className="grid grid-cols-5">
            {mobileTabs.map((tab) => {
              const active = isActive(tab.href);
              const badge = badgeFor(tab);

              return (
                <li key={tab.href}>
                  <Link
                    href={tab.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex h-[3.75rem] flex-col items-center justify-center gap-0.5 text-[0.68rem] font-bold transition-colors",
                      active ? "text-primary-950" : "text-primary-500",
                    )}
                  >
                    {active ? (
                      <span aria-hidden="true" className="absolute inset-x-5 top-0 h-0.5 rounded-b bg-(--adm-gold)" />
                    ) : null}
                    <span className="relative">
                      <AdminIcon name={tab.icon} className="size-[1.35rem]" strokeWidth={active ? 1.9 : 1.6} />
                      {badge > 0 ? (
                        <span
                          className="absolute -top-1.5 -end-2.5 min-w-4 rounded-full bg-(--adm-gold) px-1 text-center text-[0.6rem] leading-4 font-extrabold text-[#261747]"
                          aria-label={`${badge} جديد`}
                        >
                          {formatNumber(badge)}
                        </span>
                      ) : null}
                    </span>
                    {tab.label === "لوحة المعلومات" ? "الرئيسية" : tab.label.replace("رسائل الموقع", "الرسائل").replace("عروض الأسعار", "العروض")}
                  </Link>
                </li>
              );
            })}
            <li>
              <button
                type="button"
                onClick={() => setDrawer(true)}
                className="text-primary-500 relative flex h-[3.75rem] w-full flex-col items-center justify-center gap-0.5 text-[0.68rem] font-bold"
                aria-label="كل الأقسام"
              >
                <span className="relative">
                  <AdminIcon name="menu" className="size-[1.35rem]" />
                  {moreBadge > 0 ? (
                    <span aria-hidden="true" className="absolute -top-0.5 -end-1 size-2 rounded-full bg-(--adm-gold)" />
                  ) : null}
                </span>
                المزيد
              </button>
            </li>
          </ul>
        </nav>

        <CommandPalette open={palette} onClose={() => setPalette(false)} />
        <AdminEnter trigger={pathname} />
      </AdminFeedbackProvider>
    </div>
  );
}

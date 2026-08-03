"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useState, type ReactNode } from "react";

import { logoutAction } from "@/app/admin/actions/auth";
import { Icon } from "@/components/ui/Icon";
import { brand } from "@/config/brand";
import { adminNav } from "@/config/nav";
import { cn } from "@/lib/utils";

/**
 * هيكل لوحة التحكم.
 *
 * القائمة الجانبية ثابتة على الشاشات الكبيرة، وتنزلق من الجانب على الجوال.
 * الإدارة من الجوال ليست حالة نادرة — كثير من أصحاب المنشآت يتابعون الطلبات
 * من هواتفهم، لذا اللوحة متجاوبة بالكامل لا نسخة مصغّرة من واجهة مكتبية.
 */
export function AdminShell({
  user,
  children,
}: {
  user: { name: string; email: string; role: string };
  children: ReactNode;
}) {
  const pathname = usePathname();

  /*
   * القائمة تُخزَّن مع المسار الذي فُتحت فيه، فتُغلق تلقائيًا عند الانتقال
   * لصفحة أخرى دون effect يستدعي setState بعد كل تنقّل.
   */
  const [menu, setMenu] = useState({ open: false, path: pathname });
  const open = menu.open && menu.path === pathname;

  const setOpen = useCallback(
    (next: boolean) => setMenu({ open: next, path: pathname }),
    [pathname],
  );

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className="bg-surface-sunken flex min-h-dvh">
      {/* --- القائمة الجانبية --- */}
      <div
        onClick={() => setOpen(false)}
        aria-hidden="true"
        className={cn(
          "bg-primary-950/50 fixed inset-0 z-40 transition-opacity lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      <aside
        inert={!open ? undefined : undefined}
        className={cn(
          "bg-primary-950 fixed inset-y-0 right-0 z-50 flex w-72 flex-col text-white",
          "transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          "lg:sticky lg:top-0 lg:h-dvh lg:translate-x-0",
          open ? "translate-x-0" : "translate-x-full lg:translate-x-0",
        )}
      >
        <div className="border-primary-800 flex h-16 shrink-0 items-center justify-between border-b px-5">
          <Link href="/admin" className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="text-primary-950 grid size-8 place-items-center rounded-lg bg-white text-sm font-black"
            >
              {brand.nameShort.charAt(0)}
            </span>
            <span className="font-display text-sm font-bold">لوحة التحكم</span>
          </Link>

          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="إغلاق القائمة"
            className="text-primary-400 hover:bg-primary-900 grid size-9 place-items-center rounded-lg transition-colors hover:text-white lg:hidden"
          >
            <Icon name="close" className="size-5" />
          </button>
        </div>

        <nav aria-label="تنقّل لوحة التحكم" className="flex-1 overflow-y-auto p-4">
          {adminNav.map((group) => (
            <div key={group.title} className="mb-6 last:mb-0">
              <p className="text-primary-500 mb-2 px-3 text-[0.68rem] font-bold tracking-wider">
                {group.title}
              </p>

              <ul className="space-y-0.5">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      aria-current={isActive(link.href) ? "page" : undefined}
                      className={cn(
                        "flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
                        isActive(link.href)
                          ? "bg-brand-600 font-bold text-white"
                          : "text-primary-300 hover:bg-primary-900 hover:text-white",
                      )}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-primary-800 shrink-0 border-t p-4">
          <div className="mb-3 px-3">
            <p className="truncate text-sm font-bold">{user.name}</p>
            <p className="text-primary-500 truncate text-xs">{user.email}</p>
          </div>

          <Link
            href="/"
            target="_blank"
            className="text-primary-300 hover:bg-primary-900 flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:text-white"
          >
            <Icon name="externalLink" className="size-4" />
            عرض الموقع
          </Link>

          <form action={logoutAction}>
            <button
              type="submit"
              className="text-primary-300 hover:bg-danger-600 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:text-white"
            >
              <Icon name="logout" className="size-4" />
              تسجيل الخروج
            </button>
          </form>
        </div>
      </aside>

      {/* --- المحتوى --- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-border bg-surface sticky top-0 z-30 flex h-16 items-center gap-3 border-b px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="فتح القائمة"
            aria-expanded={open}
            className="border-border-strong text-primary-700 hover:bg-surface-muted grid size-10 place-items-center rounded-lg border transition-colors"
          >
            <Icon name="menu" className="size-5" />
          </button>

          <span className="font-display font-bold">لوحة التحكم</span>
        </header>

        <main className="min-w-0 flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

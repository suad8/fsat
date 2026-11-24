"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { AdminIcon } from "@/components/admin/AdminIcon";
import { cn } from "@/lib/utils";

/**
 * شريط بحث وترتيب للقوائم.
 *
 * الحالة كلها في الرابط (q, sort) فتُحفظ مع التحديث وتُشارَك وتعمل مع زر الرجوع،
 * والخادم هو من يفلتر. الكتابة تُؤجَّل 300ms كي لا يُطلب الخادم مع كل حرف،
 * والمفتاح «/» يضع المؤشر في الحقل من أي مكان.
 */
export function ListToolbar({
  placeholder = "ابحث…",
  sortOptions,
  defaultSort,
  className,
}: {
  placeholder?: string;
  sortOptions?: { value: string; label: string }[];
  defaultSort?: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const urlQuery = searchParams.get("q") ?? "";
  const sort = searchParams.get("sort") ?? defaultSort ?? "";

  const [text, setText] = useState(urlQuery);
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // مزامنة الحقل عند تغيّر الرابط من الخارج (مسح الفلاتر مثلاً) — أثناء الرسم
  // لا داخل effect، وهو النمط الموصى به لمشتقّات الحالة من الخصائص
  const [syncedQuery, setSyncedQuery] = useState(urlQuery);
  if (syncedQuery !== urlQuery) {
    setSyncedQuery(urlQuery);
    setText(urlQuery);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);
      if (typing) return;

      event.preventDefault();
      inputRef.current?.focus();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function push(next: { q?: string; sort?: string }) {
    const params = new URLSearchParams(searchParams.toString());

    if (next.q !== undefined) {
      if (next.q) params.set("q", next.q);
      else params.delete("q");
    }
    if (next.sort !== undefined) {
      if (next.sort && next.sort !== defaultSort) params.set("sort", next.sort);
      else params.delete("sort");
    }
    params.delete("page");

    const query = params.toString();
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false }));
  }

  function onChange(value: string) {
    setText(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => push({ q: value.trim() }), 300);
  }

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return (
    <div className={cn("flex flex-wrap items-center gap-2.5", className)} role="search">
      <div className="relative min-w-0 flex-1 basis-56">
        <label htmlFor="adm-list-search" className="sr-only">
          {placeholder}
        </label>
        <AdminIcon
          name="search"
          className="text-primary-400 pointer-events-none absolute inset-y-0 start-3 my-auto size-4"
        />
        <input
          ref={inputRef}
          id="adm-list-search"
          type="search"
          value={text}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              if (timer.current) clearTimeout(timer.current);
              push({ q: text.trim() });
            }
          }}
          placeholder={placeholder}
          autoComplete="off"
          enterKeyHint="search"
          className="border-border-strong bg-surface text-primary-900 placeholder:text-primary-400 hover:border-primary-400 min-h-10 w-full rounded-lg border ps-9 pe-14 text-sm"
          style={{ direction: "rtl", textAlign: "start" }}
        />
        <span className="absolute inset-y-0 end-2 flex items-center gap-1">
          {pending ? (
            <span
              aria-hidden="true"
              className="border-primary-300 size-3.5 animate-spin rounded-full border-2 border-t-transparent"
            />
          ) : text ? (
            <button
              type="button"
              onClick={() => {
                setText("");
                push({ q: "" });
                inputRef.current?.focus();
              }}
              aria-label="مسح البحث"
              className="text-primary-400 hover:bg-surface-sunken hover:text-primary-900 grid size-6 place-items-center rounded-md"
            >
              <AdminIcon name="close" className="size-3.5" strokeWidth={2} />
            </button>
          ) : (
            <kbd
              aria-hidden="true"
              className="border-border text-primary-400 hidden rounded border px-1.5 font-mono text-[0.65rem] sm:block"
            >
              /
            </kbd>
          )}
        </span>
      </div>

      {sortOptions && sortOptions.length > 0 ? (
        <div className="flex items-center gap-2">
          <label htmlFor="adm-list-sort" className="text-primary-600 text-xs font-bold">
            الترتيب
          </label>
          <select
            id="adm-list-sort"
            value={sort}
            onChange={(event) => push({ sort: event.target.value })}
            className="border-border-strong bg-surface text-primary-900 hover:border-primary-400 min-h-10 rounded-lg border px-3 text-sm"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </div>
  );
}

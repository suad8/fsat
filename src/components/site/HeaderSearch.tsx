"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";

import { Icon } from "@/components/ui/Icon";
import { SmartImage } from "@/components/ui/SmartImage";
import { commerce } from "@/config/brand";
import type { Suggestions } from "@/lib/shop/suggest";
import { whatsappGeneralUrl } from "@/lib/whatsapp";
import { cn, formatPrice } from "@/lib/utils";

type Row =
  | { kind: "product"; id: string; href: string; node: Suggestions["products"][number] }
  | { kind: "category"; id: string; href: string; node: Suggestions["categories"][number] }
  | { kind: "all"; id: string; href: string };

/**
 * بحث سريع في الترويسة: اقتراحات فورية بعد حرفين، بحث عربي متسامح
 * (أكواب = اكواب، مطبعة = مطبعه)، ولوحة مفاتيح كاملة (أسهم/Enter/Esc).
 * الطلبات مؤجَّلة ٢٠٠ms وتُلغى عند الكتابة التالية، ولا يُحمَّل شيء قبل الفتح.
 */
export function HeaderSearch({
  onOpenChange,
}: {
  /** يُخطَر به الأب كي لا يخفي الترويسة أثناء البحث. */
  onOpenChange?: (open: boolean) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const listId = useId();

  const [state, setState] = useState({ open: false, path: pathname });
  const open = state.open && state.path === pathname;
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ q: string; data: Suggestions } | null>(null);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const cache = useRef(new Map<string, Suggestions>());

  const trimmed = query.trim();
  const wanted = trimmed.length >= 2 ? trimmed : "";

  function setOpen(next: boolean) {
    setState({ open: next, path: pathname });
    setActive(-1);
    onOpenChange?.(next);
  }

  // جلب الاقتراحات (بعد التأجيل) — الضبط داخل رد غير متزامن لا داخل جسم الـ effect
  useEffect(() => {
    if (!open) return;

    const cached = cache.current.get(wanted);
    const controller = new AbortController();

    const timer = setTimeout(
      async () => {
        if (cached) {
          setResults({ q: wanted, data: cached });
          setFailed(false);
          return;
        }
        try {
          const response = await fetch(`/api/shop/search?q=${encodeURIComponent(wanted)}`, {
            signal: controller.signal,
          });
          if (!response.ok) throw new Error("search failed");
          const data = (await response.json()) as Suggestions;
          cache.current.set(wanted, data);
          setResults({ q: wanted, data });
          setFailed(false);
        } catch (error) {
          if ((error as Error).name === "AbortError") return;
          setFailed(true);
        }
      },
      cached ? 0 : wanted ? 200 : 0,
    );

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [open, wanted]);

  // Esc يغلق ويعيد التركيز لزر البحث
  useEffect(() => {
    if (!open) return;
    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setState((current) => ({ ...current, open: false }));
        onOpenChange?.(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const loading = open && results?.q !== wanted && !failed;
  const data = results?.q === wanted ? results.data : null;

  const rows = useMemo<Row[]>(() => {
    if (!data) return [];
    const list: Row[] = [
      ...data.products.map<Row>((node, index) => ({
        kind: "product",
        id: `${listId}-p${index}`,
        href: node.href,
        node,
      })),
      ...data.categories.map<Row>((node, index) => ({
        kind: "category",
        id: `${listId}-c${index}`,
        href: node.href,
        node,
      })),
    ];
    if (wanted) {
      list.push({ kind: "all", id: `${listId}-all`, href: `/shop?q=${encodeURIComponent(trimmed)}` });
    }
    return list;
  }, [data, listId, trimmed, wanted]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  function onInputKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((current) => (rows.length === 0 ? -1 : (current + 1) % rows.length));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((current) => (rows.length === 0 ? -1 : (current <= 0 ? rows.length : current) - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (active >= 0 && rows[active]) go(rows[active].href);
      else if (trimmed) go(`/shop?q=${encodeURIComponent(trimmed)}`);
    }
  }

  const noResults = data && wanted && data.products.length === 0 && data.categories.length === 0;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          setOpen(!open);
          if (!open) requestAnimationFrame(() => inputRef.current?.focus());
        }}
        aria-label="بحث في المتجر"
        aria-expanded={open}
        aria-haspopup="dialog"
        className="text-primary-100 focus-visible:outline-accent-500 relative z-50 grid size-11 place-items-center rounded-xl border border-white/20 transition-colors hover:border-white/50 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <Icon name={open ? "close" : "search"} className="size-5" />
      </button>

      {/* لوحة البحث — تُثبَّت أسفل الترويسة بعرض الصفحة */}
      <div
        inert={!open}
        className={cn(
          "bg-surface absolute inset-x-0 top-full z-50 border-b shadow-pop",
          "transition-[opacity,transform] duration-200 ease-out",
          open ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0",
        )}
      >
        <div className="container-page py-4 md:py-5">
          <form
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              if (active < 0 && trimmed) go(`/shop?q=${encodeURIComponent(trimmed)}`);
            }}
            className="relative"
          >
            <label htmlFor={`${listId}-input`} className="sr-only">
              ابحث عن منتج أو قسم
            </label>
            <Icon
              name="search"
              className="text-primary-400 pointer-events-none absolute inset-y-0 start-4 my-auto size-5"
            />
            <input
              ref={inputRef}
              id={`${listId}-input`}
              type="search"
              inputMode="search"
              enterKeyHint="search"
              autoComplete="off"
              spellCheck={false}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(-1);
              }}
              onKeyDown={onInputKey}
              role="combobox"
              aria-expanded={open}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={active >= 0 ? rows[active]?.id : undefined}
              placeholder="ابحث: كوب ورقي، بوكس، كروت شخصية…"
              className="border-border-strong bg-surface text-primary-900 placeholder:text-primary-400 h-13 w-full rounded-xl border ps-12 pe-4 text-base focus:outline-none focus-visible:border-accent-600 focus-visible:ring-2 focus-visible:ring-accent-500/50"
            />
          </form>

          <div
            id={listId}
            role="listbox"
            aria-label="اقتراحات البحث"
            aria-busy={loading}
            className="mt-3 max-h-[60vh] overflow-y-auto"
          >
            {failed ? (
              <p className="text-primary-600 px-1 py-3 text-sm">
                تعذّر جلب الاقتراحات. اضغط Enter للبحث في المتجر.
              </p>
            ) : null}

            {loading && !data ? (
              <div className="space-y-2 py-1" aria-hidden="true">
                {[0, 1, 2].map((index) => (
                  <div key={index} className="bg-surface-sunken h-14 animate-pulse rounded-xl" />
                ))}
              </div>
            ) : null}

            {data && !wanted && data.categories.length > 0 ? (
              <div>
                <p className="text-primary-500 mb-2 px-1 text-xs font-bold">تصفّح الأقسام</p>
                <ul className="flex flex-wrap gap-2">
                  {rows.map((row) =>
                    row.kind === "category" ? (
                      <li key={row.id} role="presentation">
                        <Link
                          id={row.id}
                          role="option"
                          aria-selected={rows[active]?.id === row.id}
                          href={row.href}
                          onClick={() => setOpen(false)}
                          className={cn(
                            "border-border-strong text-primary-800 hover:border-accent-600 hover:bg-surface-muted inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-bold transition-colors",
                            rows[active]?.id === row.id && "border-accent-600 bg-surface-muted",
                          )}
                        >
                          {row.node.name}
                        </Link>
                      </li>
                    ) : null,
                  )}
                </ul>
              </div>
            ) : null}

            {data && wanted && rows.length > 0 ? (
              <ul className="space-y-1">
                {rows.map((row) => (
                  <li key={row.id} role="presentation">
                    <Link
                      id={row.id}
                      role="option"
                      aria-selected={rows[active]?.id === row.id}
                      href={row.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "hover:bg-surface-muted flex min-h-14 items-center gap-3 rounded-xl px-2.5 py-2 transition-colors",
                        rows[active]?.id === row.id && "bg-surface-muted ring-accent-500/50 ring-2",
                      )}
                    >
                      {row.kind === "product" ? (
                        <>
                          <span className="w-12 shrink-0">
                            <SmartImage
                              src={row.node.imageUrl}
                              alt=""
                              ratio="square"
                              icon="package"
                              className="rounded-lg"
                              sizes="48px"
                            />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-bold">{row.node.name}</span>
                            <span className="text-primary-500 block truncate text-xs">
                              {row.node.category}
                            </span>
                          </span>
                          <span className="text-primary-900 shrink-0 text-xs font-bold tabular-nums">
                            {row.node.startingPrice === null ? (
                              <span className="text-accent-800">بعرض سعر</span>
                            ) : (
                              <>
                                {row.node.startsFrom ? (
                                  <span className="text-primary-500 font-medium">من </span>
                                ) : null}
                                {formatPrice(row.node.startingPrice)} {commerce.currencySymbol}
                              </>
                            )}
                          </span>
                        </>
                      ) : row.kind === "category" ? (
                        <>
                          <span className="bg-surface-sunken text-primary-700 grid size-12 shrink-0 place-items-center rounded-lg">
                            <Icon name="package" className="size-5" />
                          </span>
                          <span className="min-w-0 flex-1 text-sm font-bold">
                            {row.node.name}
                            <span className="text-primary-500 ms-2 text-xs font-medium">قسم</span>
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="bg-ink text-accent-400 grid size-12 shrink-0 place-items-center rounded-lg">
                            <Icon name="search" className="size-5" />
                          </span>
                          <span className="min-w-0 flex-1 text-sm font-bold">
                            عرض كل النتائج لـ «{trimmed}»
                          </span>
                          <Icon name="chevronLeft" className="text-primary-400 size-4" />
                        </>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}

            {noResults ? (
              <div className="border-border bg-surface-muted rounded-xl border border-dashed p-5 text-center">
                <p className="text-sm font-bold">لا نتائج لـ «{trimmed}»</p>
                <p className="text-primary-600 mt-1 text-xs leading-relaxed">
                  جرّب كلمة أخرى، أو أخبرنا بما تحتاجه ونوفّره لك بعرض سعر.
                </p>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  <Link
                    href="/quote"
                    onClick={() => setOpen(false)}
                    className="bg-accent-500 text-accent-contrast inline-flex min-h-11 items-center rounded-xl px-5 text-sm font-bold"
                  >
                    اطلب عرض سعر
                  </Link>
                  <a
                    href={whatsappGeneralUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center rounded-xl bg-[#25D366] px-5 text-sm font-bold text-white"
                  >
                    اسأل على واتساب
                  </a>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* خلفية تعتيم تغلق اللوحة عند الضغط خارجها */}
      <div
        aria-hidden="true"
        onClick={() => setOpen(false)}
        className={cn(
          "bg-primary-950/40 fixed inset-0 z-40 transition-opacity duration-200",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
    </>
  );
}

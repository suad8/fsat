"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { AdminIcon, type AdminIconName } from "@/components/admin/AdminIcon";
import { adminNavGroups, adminQuickActions } from "@/components/admin/nav";
import { normalizeDigits } from "@/lib/admin/url";
import { searchAdminAction, type SearchHit } from "@/lib/admin/search-actions";
import { cn } from "@/lib/utils";

/**
 * البحث السريع (Ctrl/⌘ + K).
 *
 * يجمع ثلاثة أشياء في قائمة واحدة: صفحات اللوحة، إجراءات الإنشاء السريعة،
 * ونتائج حيّة من القاعدة (طلبات، عروض، عملاء، منتجات، رسائل). نمط combobox +
 * listbox: التركيز يبقى في الحقل والأسهم تحرّك الخيار النشط (aria-activedescendant).
 */

type Entry = {
  id: string;
  group: string;
  title: string;
  subtitle?: string;
  href: string;
  icon: AdminIconName;
};

const HIT_META: Record<SearchHit["kind"], { group: string; icon: AdminIconName }> = {
  order: { group: "طلبات", icon: "cart" },
  quote: { group: "عروض أسعار", icon: "document" },
  customer: { group: "عملاء", icon: "users" },
  product: { group: "منتجات", icon: "package" },
  message: { group: "رسائل", icon: "mail" },
};

const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ["Ctrl", "K"], label: "فتح البحث السريع" },
  { keys: ["/"], label: "الانتقال إلى بحث القائمة" },
  { keys: ["Ctrl", "S"], label: "حفظ النموذج" },
  { keys: ["Esc"], label: "إغلاق النوافذ" },
];

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  // المكوّن الداخلي يُنشأ عند الفتح فقط — فتبدأ حالته نظيفة في كل مرة بلا effect إعادة ضبط
  return <PaletteDialog onClose={onClose} />;
}

function PaletteDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const restoreRef = useRef<Element | null>(null);
  const requestRef = useRef(0);

  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [remote, setRemote] = useState<{ query: string; hits: SearchHit[] }>({
    query: "",
    hits: [],
  });
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    restoreRef.current = document.activeElement;
    inputRef.current?.focus();
    return () => {
      if (restoreRef.current instanceof HTMLElement) restoreRef.current.focus();
    };
  }, []);

  // بحث القاعدة — مؤجَّل، وتُهمَل الردود المتأخرة
  useEffect(() => {
    const q = normalizeDigits(query).trim();
    if (q.length < 2) return;

    const ticket = ++requestRef.current;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const hits = await searchAdminAction(q);
        if (requestRef.current === ticket) setRemote({ query: q, hits });
      } catch {
        if (requestRef.current === ticket) setRemote({ query: q, hits: [] });
      } finally {
        if (requestRef.current === ticket) setSearching(false);
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [query]);

  const entries = useMemo<Entry[]>(() => {
    const q = normalizeDigits(query).trim().toLowerCase();

    const local: Entry[] = [
      ...adminNavGroups.flatMap((group) =>
        group.links.map<Entry>((link) => ({
          id: `nav-${link.href}`,
          group: "الصفحات",
          title: link.label,
          subtitle: group.title,
          href: link.href,
          icon: link.icon,
        })),
      ),
      ...adminQuickActions.map<Entry>((action) => ({
        id: `act-${action.href}`,
        group: "إجراءات سريعة",
        title: action.label,
        href: action.href,
        icon: action.icon,
      })),
    ];

    const haystack = (entry: Entry) => {
      const source =
        adminNavGroups.flatMap((group) => group.links).find((link) => `nav-${link.href}` === entry.id)
          ?.keywords ??
        adminQuickActions.find((action) => `act-${action.href}` === entry.id)?.keywords ??
        "";
      return `${entry.title} ${entry.subtitle ?? ""} ${source}`.toLowerCase();
    };

    const filteredLocal = q
      ? local.filter((entry) => haystack(entry).includes(q))
      : // بلا استعلام: الإجراءات السريعة أولاً ثم أهم صفحات العمليات
        [...local.filter((entry) => entry.group === "إجراءات سريعة"), ...local.slice(0, 5)];

    // نتائج القاعدة تظهر فقط إن كانت لنفس الاستعلام الحالي
    const current = normalizeDigits(query).trim();
    const hits =
      remote.query === current
        ? remote.hits.map<Entry>((hit, index) => ({
            id: `hit-${hit.kind}-${index}`,
            group: HIT_META[hit.kind].group,
            title: hit.title,
            subtitle: hit.subtitle,
            href: hit.href,
            icon: HIT_META[hit.kind].icon,
          }))
        : [];

    return [...hits, ...filteredLocal];
  }, [query, remote]);

  const activeIndex = Math.min(active, Math.max(0, entries.length - 1));

  function go(entry: Entry | undefined) {
    if (!entry) return;
    onClose();
    router.push(entry.href);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    switch (event.key) {
      case "Escape":
        event.preventDefault();
        onClose();
        break;
      case "ArrowDown":
        event.preventDefault();
        setActive((activeIndex + 1) % Math.max(1, entries.length));
        break;
      case "ArrowUp":
        event.preventDefault();
        setActive((activeIndex - 1 + entries.length) % Math.max(1, entries.length));
        break;
      case "Enter":
        event.preventDefault();
        go(entries[activeIndex]);
        break;
      case "Tab":
        // التركيز محبوس داخل الحقل — القائمة تُقاد بالأسهم
        event.preventDefault();
        break;
    }
  }

  // تمرير الخيار النشط إلى مجال الرؤية
  useEffect(() => {
    document.getElementById(`${listId}-${activeIndex}`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, listId, entries]);

  let lastGroup = "";

  return (
    <div
      className="no-print fixed inset-0 z-[85] flex items-start justify-center px-3 pt-[8vh] sm:pt-[12vh]"
      onKeyDown={onKeyDown}
    >
      <div className="adm-fade absolute inset-0 bg-black/55" aria-hidden="true" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="البحث السريع"
        className="adm-pop bg-surface border-border relative flex max-h-[min(34rem,80dvh)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border shadow-2xl"
      >
        <div className="adm-palette-input border-border flex items-center gap-3 border-b px-4">
          <AdminIcon name="search" className="text-primary-400 size-5" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={entries.length > 0 ? `${listId}-${activeIndex}` : undefined}
            aria-autocomplete="list"
            aria-label="ابحث عن طلب أو عميل أو منتج أو صفحة"
            placeholder="ابحث عن طلب، عميل، جوال، منتج، أو صفحة…"
            autoComplete="off"
            spellCheck={false}
            className="text-primary-950 placeholder:text-primary-400 h-14 min-w-0 flex-1 bg-transparent text-base outline-none"
            style={{ outline: "none" }}
          />
          {searching ? (
            <span
              aria-hidden="true"
              className="border-primary-300 size-4 animate-spin rounded-full border-2 border-t-transparent"
            />
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="text-primary-500 hover:bg-surface-sunken min-h-8 rounded-md px-2 text-xs font-bold"
          >
            Esc
          </button>
        </div>

        <ul id={listId} role="listbox" aria-label="النتائج" className="min-h-0 flex-1 overflow-y-auto p-2">
          {entries.length === 0 ? (
            <li className="text-primary-500 px-3 py-10 text-center text-sm" role="presentation">
              {searching ? "جارٍ البحث…" : "لا نتائج مطابقة. جرّب رقم الطلب أو الجوال أو اسم العميل."}
            </li>
          ) : null}

          {entries.map((entry, index) => {
            const showGroup = entry.group !== lastGroup;
            lastGroup = entry.group;
            const isActive = index === activeIndex;

            return (
              <li key={entry.id} role="presentation">
                {showGroup ? (
                  <p className="text-primary-500 px-3 pt-2.5 pb-1 text-[0.7rem] font-bold" role="presentation">
                    {entry.group}
                  </p>
                ) : null}
                <div
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={isActive}
                  onMouseMove={() => setActive(index)}
                  onClick={() => go(entry)}
                  className={cn(
                    "flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3 py-2",
                    isActive ? "bg-primary-950 text-white" : "text-primary-900",
                  )}
                >
                  <AdminIcon
                    name={entry.icon}
                    className={cn("size-[1.1rem]", isActive ? "text-accent-300" : "text-primary-400")}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{entry.title}</span>
                    {entry.subtitle ? (
                      <span
                        className={cn(
                          "block truncate text-xs",
                          isActive ? "text-white/70" : "text-primary-500",
                        )}
                      >
                        {entry.subtitle}
                      </span>
                    ) : null}
                  </span>
                  {isActive ? (
                    <kbd className="rounded border border-white/25 px-1.5 font-mono text-[0.65rem] text-white/80">
                      ↵
                    </kbd>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>

        <div className="border-border bg-surface-muted text-primary-600 flex flex-wrap items-center gap-x-4 gap-y-1 border-t px-4 py-2.5 text-[0.7rem]">
          {SHORTCUTS.map((shortcut) => (
            <span key={shortcut.label} className="inline-flex items-center gap-1.5">
              <span className="inline-flex items-center gap-0.5" dir="ltr">
                {shortcut.keys.map((key) => (
                  <kbd key={key} className="border-border bg-surface rounded border px-1.5 font-mono">
                    {key}
                  </kbd>
                ))}
              </span>
              {shortcut.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

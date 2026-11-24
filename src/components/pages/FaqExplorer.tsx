"use client";

import { Fragment, useMemo, useState, type ReactNode } from "react";

import { normalizeArabic } from "@/components/pages/arabic";
import { whatsappMessageUrl } from "@/components/pages/links";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
  category: string | null;
};

/**
 * مراحل رحلة العميل — تُجمَّع فيها أقسام الأسئلة:
 * ما يسأله قبل أن يطلب، ثم أثناء التنفيذ والدفع، ثم عند التسليم وبعده.
 * أي قسم تضيفه الإدارة خارج هذه القوائم يظهر تحت «أسئلة أخرى» فلا يضيع.
 */
const STAGES = [
  {
    key: "prepare",
    title: "قبل أن تطلب",
    hint: "الطلب والتصميم والكميات",
    categories: ["الطلب", "التصميم", "الكميات", "الأسعار"],
  },
  {
    key: "produce",
    title: "التنفيذ والدفع",
    hint: "المدة والعيّنات وطرق الدفع",
    categories: ["التنفيذ", "الدفع"],
  },
  {
    key: "deliver",
    title: "التسليم وما بعده",
    hint: "الشحن والاستلام والاسترجاع",
    categories: ["الشحن", "الاسترجاع", "الاستبدال"],
  },
] as const;

const OTHER = { key: "other", title: "أسئلة أخرى", hint: "", categories: [] as string[] };

function stageOf(category: string | null): string {
  if (!category) return OTHER.key;
  return STAGES.find((stage) => (stage.categories as readonly string[]).includes(category))?.key ?? OTHER.key;
}

// ---------------------------------------------------------------------------
// البحث والتظليل
// ---------------------------------------------------------------------------

/** يحوّل كلمة بحث إلى تعبير يتسامح مع الهمزات والتاء المربوطة والتشكيل. */
function tokenPattern(token: string): string {
  const MARKS = "[\\u064B-\\u065F\\u0640]*";
  return [...normalizeArabic(token)]
    .map((char) => {
      const group =
        char === "ا"
          ? "[اأإآٱ]"
          : char === "ه"
            ? "[هة]"
            : char === "ي"
              ? "[يى]"
              : char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return group + MARKS;
    })
    .join("");
}

function Highlight({ text, tokens }: { text: string; tokens: string[] }): ReactNode {
  if (tokens.length === 0) return text;

  const regex = new RegExp(`(${tokens.map(tokenPattern).join("|")})`, "gi");
  const parts = text.split(regex);

  return parts.map((part, index) =>
    index % 2 === 1 ? (
      <mark key={index} className="bg-accent-200 text-primary-950 rounded px-0.5">
        {part}
      </mark>
    ) : (
      <Fragment key={index}>{part}</Fragment>
    ),
  );
}

export function FaqExplorer({ faqs }: { faqs: FaqItem[] }) {
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState<string>("all");
  const [opened, setOpened] = useState<Set<string>>(() => new Set());

  const tokens = useMemo(
    () => normalizeArabic(query).split(" ").filter((token) => token.length > 0),
    [query],
  );
  const searching = tokens.length > 0;

  const indexed = useMemo(
    () =>
      faqs.map((faq) => ({
        faq,
        stage: stageOf(faq.category),
        haystack: normalizeArabic(`${faq.question} ${faq.answer} ${faq.category ?? ""}`),
      })),
    [faqs],
  );

  const matched = indexed.filter(
    (entry) => tokens.every((token) => entry.haystack.includes(token)),
  );

  const stageDefs = useMemo(() => {
    const present = new Set(indexed.map((entry) => entry.stage));
    return [...STAGES, OTHER].filter((def) => present.has(def.key));
  }, [indexed]);

  const countFor = (key: string) =>
    matched.filter((entry) => key === "all" || entry.stage === key).length;

  const visibleStages = stageDefs.filter(
    (def) => (stage === "all" || stage === def.key) && countFor(def.key) > 0,
  );

  function toggle(id: string, open: boolean) {
    setOpened((current) => {
      const next = new Set(current);
      if (open) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  const total = countFor(stage);

  return (
    <div>
      {/* --- بحث --- */}
      <div role="search" className="mx-auto max-w-2xl">
        <label htmlFor="faq-search" className="sr-only">
          ابحث في الأسئلة الشائعة
        </label>
        <div className="relative">
          <Icon
            name="search"
            className="text-primary-400 pointer-events-none absolute inset-y-0 start-4 my-auto size-5"
          />
          <input
            id="faq-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ابحث عن سؤالك: المدة، الدفع، الملفات…"
            autoComplete="off"
            enterKeyHint="search"
            className="border-border-strong bg-surface text-primary-900 placeholder:text-primary-400 focus-visible:outline-accent-600 shadow-card w-full rounded-2xl border py-4 ps-12 pe-12 text-base transition-colors hover:border-primary-400 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ direction: "rtl", textAlign: "start" }}
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="مسح البحث"
              className="text-primary-400 hover:bg-surface-sunken hover:text-primary-900 absolute inset-y-0 end-3 my-auto grid size-9 place-items-center rounded-lg transition-colors"
            >
              <Icon name="close" className="size-4" />
            </button>
          ) : null}
        </div>
      </div>

      {/* --- مراحل العميل --- */}
      {stageDefs.length > 1 ? (
        <nav aria-label="مراحل الأسئلة" className="mt-7">
          <ul className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:justify-center md:px-0">
            <li>
              <StageChip active={stage === "all"} onClick={() => setStage("all")}>
                الكل <span className="text-[0.7rem] opacity-70">({countFor("all")})</span>
              </StageChip>
            </li>
            {stageDefs.map((def) => (
              <li key={def.key}>
                <StageChip active={stage === def.key} onClick={() => setStage(def.key)}>
                  {def.title}{" "}
                  <span className="text-[0.7rem] opacity-70">({countFor(def.key)})</span>
                </StageChip>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      <p className="sr-only" role="status" aria-live="polite">
        {searching ? `${total} نتيجة` : ""}
      </p>

      {/* --- النتائج --- */}
      <div className="mx-auto mt-10 max-w-3xl space-y-12">
        {visibleStages.map((def) => (
          <section key={def.key} aria-labelledby={`faq-stage-${def.key}`}>
            <header className="mb-4 flex items-baseline justify-between gap-4">
              <h2 id={`faq-stage-${def.key}`} className="text-xl font-black md:text-2xl">
                {def.title}
              </h2>
              {def.hint ? (
                <p className="text-primary-500 hidden text-sm sm:block">{def.hint}</p>
              ) : null}
            </header>

            <ul className="space-y-3">
              {matched
                .filter((entry) => entry.stage === def.key)
                .map(({ faq }) => {
                  const isOpen = searching || opened.has(faq.id);

                  return (
                    <li key={faq.id}>
                      <details
                        open={isOpen}
                        onToggle={(event) => {
                          // أثناء البحث تُفتح كل النتائج تلقائيًا؛ لا نسجّل ذلك كاختيار
                          if (!searching) toggle(faq.id, event.currentTarget.open);
                        }}
                        className="group border-border bg-surface hover:border-border-strong open:shadow-card rounded-2xl border transition-[border-color,box-shadow]"
                      >
                        <summary className="focus-visible:outline-accent-600 flex cursor-pointer list-none items-start justify-between gap-4 p-5 focus-visible:outline-2 focus-visible:-outline-offset-2 md:p-6">
                          <span className="min-w-0">
                            {faq.category ? (
                              <span className="text-accent-700 mb-1 block text-xs font-bold">
                                {faq.category}
                              </span>
                            ) : null}
                            <span className="text-primary-950 block text-base leading-snug font-bold md:text-lg">
                              <Highlight text={faq.question} tokens={tokens} />
                            </span>
                          </span>
                          <Icon
                            name="chevronDown"
                            className="text-primary-400 mt-1 size-5 shrink-0 transition-transform duration-300 group-open:rotate-180"
                          />
                        </summary>

                        <div className="border-border border-t px-5 py-4 md:px-6 md:py-5">
                          <p className="text-primary-700 leading-[1.95]">
                            <Highlight text={faq.answer} tokens={tokens} />
                          </p>
                        </div>
                      </details>
                    </li>
                  );
                })}
            </ul>
          </section>
        ))}

        {total === 0 ? (
          <div className="border-border bg-surface-muted rounded-3xl border border-dashed px-6 py-12 text-center">
            <span
              aria-hidden="true"
              className="bg-surface ring-border mx-auto mb-4 grid size-14 place-items-center rounded-full shadow-sm ring-1"
            >
              <Icon name="search" className="text-primary-400 size-6" strokeWidth={1.4} />
            </span>
            <h2 className="text-lg font-black">لم نجد سؤالاً مطابقًا</h2>
            <p className="text-primary-600 mx-auto mt-2 max-w-sm text-sm leading-relaxed">
              جرّب كلمة أبسط، أو اسألنا مباشرة ونردّ عليك على واتساب.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <ButtonLink
                href={whatsappMessageUrl([
                  "السلام عليكم،",
                  query.trim() ? `لدي سؤال: ${query.trim()}` : "لدي سؤال عن خدماتكم.",
                ])}
                external
                variant="whatsapp"
                icon="whatsapp"
              >
                اسأل على واتساب
              </ButtonLink>
              {searching ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setStage("all");
                  }}
                  className={cn(
                    "border-border-strong text-primary-900 hover:bg-surface inline-flex min-h-11 items-center rounded-xl border px-5 text-sm font-bold transition-colors",
                  )}
                >
                  عرض كل الأسئلة
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StageChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex min-h-10 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-bold whitespace-nowrap transition-colors",
        active
          ? "border-ink bg-ink text-white"
          : "border-border-strong bg-surface text-primary-700 hover:border-primary-400 hover:bg-surface-muted",
      )}
    >
      {children}
    </button>
  );
}

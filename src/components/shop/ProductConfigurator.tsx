"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { useCart, type CartItemFile } from "@/components/cart/CartProvider";
import { DesignUpload } from "@/components/shop/DesignUpload";
import { QuantityStepper } from "@/components/shop/QuantityStepper";
import { ShopIcon } from "@/components/shop/ShopIcon";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Price, QuoteOnlyLabel } from "@/components/ui/Price";
import { commerce } from "@/config/brand";
import { CHOICE_OPTION_TYPES, type PriceMode } from "@/lib/constants";
import {
  calculatePrice,
  defaultSelection,
  describeSelection,
  normalizeQuantity,
  type OptionSelection,
  type PricingOptionGroup,
  type PricingOptionValue,
  type PricingQuantityTier,
} from "@/lib/pricing";
import {
  clearSaved,
  decodeConfig,
  readHashRaw,
  readSavedRaw,
  shareUrl,
  subscribeConfig,
  writeSaved,
  type SavedConfig,
} from "@/lib/shop/saved-config";
import { cn, formatNumber, formatPrice } from "@/lib/utils";
import { whatsappProductUrl } from "@/lib/whatsapp";

export type ConfiguratorValue = PricingOptionValue & {
  swatchHex: string | null;
  imageUrl: string | null;
};

/**
 * Omit ثم إعادة تعريف `values` — التقاطع المباشر مع PricingOptionGroup كان
 * يُبقي نوع العنصر على PricingOptionValue فيختفي swatchHex عند القراءة.
 */
export type ConfiguratorGroup = Omit<PricingOptionGroup, "values"> & {
  helpText: string | null;
  values: ConfiguratorValue[];
};

export type ConfiguratorProduct = {
  id: string;
  slug: string;
  name: string;
  unit: string;
  categorySlug: string;
  imageUrl: string | null;
  priceMode: PriceMode;
  basePrice: number;
  compareAtPrice: number | null;
  minQuantity: number;
  quantityStep: number;
  leadTime: string | null;
  optionGroups: ConfiguratorGroup[];
  quantityTiers: PricingQuantityTier[];
};

type Problem = { key: string; message: string };

/**
 * مُهيّئ المنتج — اختيار المواصفات مع تحديث السعر لحظيًا.
 *
 * الحساب يستخدم نفس وحدة التسعير التي يستخدمها الخادم (src/lib/pricing.ts)،
 * فما يراه العميل هنا هو ما سيُحتسب عند حفظ الطلب — والخادم يعيد الحساب
 * مجددًا قبل الحفظ فلا أثر لأي تلاعب من المتصفّح.
 *
 * ما يميّز التجربة:
 *  - الأخطاء تظهر عند المجموعة نفسها (لا زر معطّل بلا تفسير) ويقفز التركيز إليها.
 *  - شريط سفلي ثابت على الجوال يختفي حين تظهر أزرار الصفحة الأصلية.
 *  - «احفظ تهيئتي» و«شارك» اختياريان؛ ونقل المواصفات كاملة إلى واتساب.
 */
export function ProductConfigurator({ product }: { product: ConfiguratorProduct }) {
  const { addItem } = useCart();

  const [selection, setSelection] = useState<OptionSelection>(() =>
    defaultSelection(product.optionGroups),
  );
  const [quantity, setQuantity] = useState(product.minQuantity);
  const [notes, setNotes] = useState("");
  const [designs, setDesigns] = useState<CartItemFile[]>([]);
  const [added, setAdded] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [barVisible, setBarVisible] = useState(false);

  const actionsRef = useRef<HTMLDivElement>(null);

  const isQuoteOnly = product.priceMode === "QUOTE_ONLY";
  const hasNotesGroup = product.optionGroups.some(
    (group) => group.key === "notes" && group.type === "TEXTAREA",
  );

  const breakdown = useMemo(
    () =>
      calculatePrice(
        {
          priceMode: product.priceMode,
          basePrice: product.basePrice,
          minQuantity: product.minQuantity,
          quantityStep: product.quantityStep,
          quantityTiers: product.quantityTiers,
          optionGroups: product.optionGroups,
        },
        selection,
        quantity,
      ),
    [product, selection, quantity],
  );

  const described = useMemo(
    () => describeSelection(product.optionGroups, selection),
    [product.optionGroups, selection],
  );

  // --- الأخطاء: كل ما يمنع الإضافة، مع رسالة بجوار المجموعة المعنيّة ---
  const problems = useMemo<Problem[]>(() => {
    if (isQuoteOnly) return [];
    const list: Problem[] = [];

    for (const group of product.optionGroups) {
      if (!group.isRequired) continue;

      if (group.type === "FILE") {
        if (designs.length === 0) {
          list.push({ key: group.key, message: `ارفع ${group.name} للمتابعة.` });
        }
        continue;
      }

      if (CHOICE_OPTION_TYPES.includes(group.type)) {
        if (breakdown.missingRequired.includes(group.key)) {
          list.push({ key: group.key, message: `اختر ${group.name} للمتابعة.` });
        }
        continue;
      }

      const value = selection[group.key];
      if (typeof value !== "string" || value.trim().length === 0) {
        list.push({ key: group.key, message: `اكتب ${group.name} للمتابعة.` });
      }
    }
    return list;
  }, [isQuoteOnly, product.optionGroups, designs.length, breakdown.missingRequired, selection]);

  const problemFor = (key: string) =>
    attempted ? problems.find((problem) => problem.key === key)?.message : undefined;

  // --- التهيئة المحفوظة/المشتركة (مصدر خارجي: الرابط + التخزين المحلي) ---
  const configRaw = useSyncExternalStore(
    subscribeConfig,
    () => `${readHashRaw()}|${readSavedRaw(product.id)}`,
    () => "|",
  );
  const [hashRaw, savedRaw] = configRaw.split("|");
  const shared = useMemo(() => (hashRaw ? decodeConfig(hashRaw) : null), [hashRaw]);
  const saved = useMemo(() => (savedRaw ? decodeConfig(savedRaw) : null), [savedRaw]);
  const offered = shared ?? saved;
  const [dismissed, setDismissed] = useState<string | null>(null);

  const currentConfig: SavedConfig = useMemo(
    () => ({ v: 1, s: selection, q: breakdown.quantity }),
    [selection, breakdown.quantity],
  );
  const isSavedNow = saved !== null && JSON.stringify(saved) === JSON.stringify(currentConfig);

  function applyConfig(config: SavedConfig) {
    const next: OptionSelection = {};
    for (const group of product.optionGroups) {
      const raw = config.s[group.key];
      if (raw === undefined) continue;
      const ids = new Set(group.values.map((value) => value.id));

      if (CHOICE_OPTION_TYPES.includes(group.type)) {
        if (Array.isArray(raw)) {
          const valid = raw.filter((id) => ids.has(id));
          if (valid.length > 0) next[group.key] = valid;
        } else if (ids.has(raw)) {
          next[group.key] = raw;
        }
      } else if (typeof raw === "string") {
        next[group.key] = raw.slice(0, 500);
      }
    }
    setSelection({ ...defaultSelection(product.optionGroups), ...next });
    setQuantity(normalizeQuantity(product, config.q));
    setAdded(false);
    setDismissed(shared ? hashRaw : savedRaw);
  }

  // --- الشريط السفلي: يختفي حين تكون أزرار الصفحة الأصلية على الشاشة ---
  useEffect(() => {
    const target = actionsRef.current;
    if (!target || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setBarVisible(!entry.isIntersecting),
      { threshold: 0.15 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  function flash(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2600);
  }

  function touch() {
    setAdded(false);
  }

  function setValue(key: string, value: string | string[]) {
    setSelection((current) => ({ ...current, [key]: value }));
    touch();
  }

  function toggleCheckbox(key: string, valueId: string) {
    setSelection((current) => {
      const existing = current[key];
      const list = Array.isArray(existing) ? existing : existing ? [existing] : [];
      const next = list.includes(valueId)
        ? list.filter((id) => id !== valueId)
        : [...list, valueId];
      return { ...current, [key]: next };
    });
    touch();
  }

  function focusProblem(problem: Problem) {
    const element = document.getElementById(`group-${problem.key}`);
    if (!element) return;
    element.scrollIntoView({ behavior: "smooth", block: "center" });
    const control = element.querySelector<HTMLElement>("input, select, textarea, button");
    window.setTimeout(() => control?.focus({ preventScroll: true }), 350);
  }

  function handleAddToCart() {
    if (isQuoteOnly || !breakdown.priceable) return;

    if (problems.length > 0) {
      setAttempted(true);
      focusProblem(problems[0]);
      return;
    }

    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      imageUrl: product.imageUrl,
      unit: product.unit,
      quantity: breakdown.quantity,
      unitPrice: breakdown.unitPrice,
      flatFees: breakdown.flatFees,
      total: breakdown.total,
      options: described,
      selection,
      minQuantity: product.minQuantity,
      quantityStep: product.quantityStep,
      href: `/shop/${product.categorySlug}/${product.slug}`,
      files: designs.length > 0 ? designs : undefined,
      notes: notes.trim() || undefined,
    });

    setAdded(true);
  }

  function handleSave() {
    try {
      if (isSavedNow) {
        clearSaved(product.id);
        flash("أُزيلت التهيئة المحفوظة");
      } else {
        writeSaved(product.id, currentConfig);
        flash("حُفظت تهيئتك في هذا المتصفّح");
      }
    } catch {
      flash("تعذّر الحفظ — التخزين معطّل في متصفّحك");
    }
  }

  async function handleShare() {
    const url = shareUrl(currentConfig);
    try {
      if (navigator.share) {
        await navigator.share({ title: product.name, url });
        return;
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(url);
      flash("نُسخ رابط التهيئة");
    } catch {
      flash("تعذّر النسخ — انسخ الرابط من شريط العنوان");
    }
  }

  const whatsappOptions = [
    ...described.map((item) => ({ label: item.label, value: item.valueLabel })),
    ...(designs.length > 0
      ? [{ label: "ملفات التصميم", value: `${designs.map((file) => file.name).join("، ")} (سأرسلها هنا)` }]
      : []),
  ];

  const whatsappUrl = whatsappProductUrl({
    productName: product.name,
    productPath: `/shop/${product.categorySlug}/${product.slug}`,
    options: whatsappOptions,
    size: described.find((item) => item.key === "size")?.valueLabel ?? null,
    quantity: breakdown.quantity,
    estimatedPrice: breakdown.priceable
      ? `${formatPrice(breakdown.total)} ${commerce.currencySymbol}`
      : null,
    notes: notes.trim() || null,
  });

  const quoteHref = `/quote?product=${encodeURIComponent(product.slug)}&type=${encodeURIComponent(
    product.name,
  )}&size=${encodeURIComponent(
    described.find((item) => item.key === "size")?.valueLabel ?? "",
  )}&qty=${encodeURIComponent(String(breakdown.quantity))}`;

  return (
    <div className="space-y-8">
      {offered && dismissed !== (shared ? hashRaw : savedRaw) ? (
        <div className="border-accent-500/40 bg-accent-50/70 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 text-sm">
          <p className="text-primary-900 font-bold">
            {shared ? "وصلتك تهيئة محدّدة لهذا المنتج." : "لديك تهيئة محفوظة لهذا المنتج."}
          </p>
          <div className="flex gap-2">
            <Button size="md" variant="accent" onClick={() => applyConfig(offered)}>
              تطبيقها
            </Button>
            <Button
              size="md"
              variant="ghost"
              onClick={() => setDismissed(shared ? hashRaw : savedRaw)}
            >
              تجاهل
            </Button>
          </div>
        </div>
      ) : null}

      {/* --- مجموعات الخيارات --- */}
      {product.optionGroups.map((group) => (
        <OptionGroupField
          key={group.id}
          group={group}
          selection={selection}
          onSelect={setValue}
          onToggle={toggleCheckbox}
          designs={designs}
          onDesignsChange={(files) => {
            setDesigns(files);
            touch();
          }}
          error={problemFor(group.key)}
        />
      ))}

      {/* --- الكمية --- */}
      <div id="group-quantity">
        <label htmlFor="quantity" className="text-primary-800 mb-2 block text-sm font-bold">
          الكمية
          <span className="text-primary-500 ms-1.5 text-xs font-medium">({product.unit})</span>
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <QuantityStepper
            id="quantity"
            value={quantity}
            min={product.minQuantity}
            step={product.quantityStep}
            onChange={(next) => {
              setQuantity(next);
              touch();
            }}
            label="الكمية"
            size="lg"
            describedBy="quantity-help"
          />

          {breakdown.tierLabel ? (
            <span className="bg-accent-50 text-accent-800 ring-accent-600/15 rounded-lg px-3 py-2 text-xs font-bold ring-1 ring-inset">
              شريحة: {breakdown.tierLabel}
            </span>
          ) : null}
        </div>

        <p id="quantity-help" className="text-primary-500 mt-2 text-xs">
          الحد الأدنى {formatNumber(product.minQuantity)} {product.unit}
          {product.quantityStep > 1
            ? ` — الزيادة بمضاعفات ${formatNumber(product.quantityStep)}`
            : ""}
        </p>
      </div>

      {/* --- شرائح الأسعار --- */}
      {product.quantityTiers.length > 1 && !isQuoteOnly ? (
        <TierTable tiers={product.quantityTiers} currentQty={quantity} unit={product.unit} />
      ) : null}

      {/* --- الملاحظات (مرة واحدة فقط) --- */}
      {!hasNotesGroup ? (
        <div>
          <label htmlFor="notes" className="text-primary-800 mb-2 block text-sm font-bold">
            ملاحظات على الطلب
            <span className="text-primary-400 ms-1.5 text-xs font-medium">(اختياري)</span>
          </label>
          <textarea
            id="notes"
            rows={3}
            value={notes}
            onChange={(event) => {
              setNotes(event.target.value);
              touch();
            }}
            placeholder="أي تفاصيل تودّ أن يراعيها قسم الإنتاج."
            className={CONTROL_CLASS}
          />
        </div>
      ) : null}

      {/* --- السعر والأزرار --- */}
      <div
        ref={actionsRef}
        className="border-border bg-surface shadow-card rounded-2xl border p-5 md:p-6"
      >
        {isQuoteOnly ? (
          <div className="mb-5">
            <QuoteOnlyLabel className="text-base" />
            <p className="text-primary-600 mt-2 text-sm leading-relaxed">
              يعتمد سعر هذا المنتج على التصميم والمقاس وطريقة التنفيذ. أرسل مواصفاتك
              ونرسل لك عرض سعر دقيقًا خلال يوم عمل.
            </p>
          </div>
        ) : (
          <PriceSummary breakdown={breakdown} unit={product.unit} described={described} />
        )}

        {attempted && problems.length > 0 && !isQuoteOnly ? (
          <div
            role="alert"
            className="bg-danger-50 border-danger-500/30 text-danger-700 mb-4 rounded-xl border p-3.5 text-sm"
          >
            <p className="font-bold">أكمل الخيارات التالية قبل الإضافة:</p>
            <ul className="mt-1.5 space-y-1">
              {problems.map((problem) => (
                <li key={problem.key}>
                  <button
                    type="button"
                    onClick={() => focusProblem(problem)}
                    className="min-h-8 text-start underline underline-offset-2"
                  >
                    {problem.message}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {added ? (
          <div
            role="status"
            className="bg-success-50 border-success-500/30 mb-4 rounded-xl border p-4"
          >
            <p className="text-success-700 flex items-center gap-2 text-sm font-bold">
              <Icon name="check" className="size-4.5" strokeWidth={2.5} />
              أُضيف إلى السلة
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <ButtonLink href="/checkout" size="md" iconAfter="arrowLeft" className="min-h-11 flex-1">
                إتمام الطلب
              </ButtonLink>
              <ButtonLink href="/cart" size="md" variant="outline" className="min-h-11 flex-1">
                عرض السلة
              </ButtonLink>
            </div>
          </div>
        ) : null}

        <div className="grid gap-2.5">
          {isQuoteOnly ? (
            <ButtonLink href={quoteHref} size="lg" fullWidth icon="document" className="min-h-14">
              طلب عرض سعر
            </ButtonLink>
          ) : (
            <>
              <Button
                size="lg"
                fullWidth
                icon="cart"
                onClick={handleAddToCart}
                className="min-h-14"
              >
                أضف إلى السلة
              </Button>

              <ButtonLink href={quoteHref} size="md" variant="outline" fullWidth className="min-h-12">
                أو اطلب عرض سعر لهذه المواصفات
              </ButtonLink>
            </>
          )}

          <ButtonLink
            href={whatsappUrl}
            external
            size="lg"
            variant="whatsapp"
            icon="whatsapp"
            fullWidth
            className="min-h-13"
          >
            اطلب عبر واتساب
          </ButtonLink>
        </div>

        <p className="text-primary-500 mt-4 text-center text-xs leading-relaxed">
          رسالة واتساب تحمل مواصفاتك كاملة — لن تحتاج لإعادة كتابتها.
        </p>

        {/* حفظ ومشاركة — اختياريان */}
        <div className="border-border mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 border-t pt-3">
          <button
            type="button"
            onClick={handleSave}
            aria-pressed={isSavedNow}
            className="text-primary-700 hover:text-primary-950 focus-visible:outline-accent-600 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-bold transition-colors focus-visible:outline-2"
          >
            <ShopIcon name="bookmark" className={cn("size-4.5", isSavedNow && "fill-accent-500 text-accent-700")} />
            {isSavedNow ? "تهيئتي محفوظة" : "احفظ تهيئتي للاحقًا"}
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="text-primary-700 hover:text-primary-950 focus-visible:outline-accent-600 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-bold transition-colors focus-visible:outline-2"
          >
            <ShopIcon name="share" className="size-4.5" />
            شارك التهيئة
          </button>
        </div>
      </div>

      {/* رسالة قصيرة (حفظ/نسخ) */}
      <p
        role="status"
        aria-live="polite"
        className={cn(
          "bg-ink fixed left-1/2 bottom-24 z-50 -translate-x-1/2 rounded-full px-5 py-2.5 text-sm font-bold text-white shadow-pop transition-opacity duration-300 md:bottom-8",
          toast ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        {toast ?? ""}
      </p>

      {/* --- شريط ثابت أسفل الجوال --- */}
      <MobileBar
        visible={barVisible}
        breakdown={breakdown}
        isQuoteOnly={isQuoteOnly}
        onAdd={handleAddToCart}
        quoteHref={quoteHref}
        whatsappUrl={whatsappUrl}
        added={added}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------

const CONTROL_CLASS =
  "border-border-strong bg-surface text-primary-900 placeholder:text-primary-400 hover:border-primary-400 w-full rounded-xl border px-4 py-3 text-base transition-[border-color,box-shadow] focus:outline-none focus-visible:border-accent-600 focus-visible:ring-2 focus-visible:ring-accent-500/50";

function OptionGroupField({
  group,
  selection,
  onSelect,
  onToggle,
  designs,
  onDesignsChange,
  error,
}: {
  group: ConfiguratorGroup;
  selection: OptionSelection;
  onSelect: (key: string, value: string) => void;
  onToggle: (key: string, valueId: string) => void;
  designs: CartItemFile[];
  onDesignsChange: (files: CartItemFile[]) => void;
  error?: string;
}) {
  const fieldId = `option-${group.key}`;
  const wrapId = `group-${group.key}`;
  const current = selection[group.key];

  // --- رفع الملفات ---
  if (group.type === "FILE") {
    return (
      <div id={wrapId}>
        <DesignUpload
          label={group.name}
          help={group.helpText}
          required={group.isRequired}
          files={designs}
          onChange={onDesignsChange}
          maxFiles={3}
          error={error}
        />
      </div>
    );
  }

  // --- الحقول الحرّة ---
  if (!CHOICE_OPTION_TYPES.includes(group.type)) {
    const inputType = group.type === "DATE" ? "date" : group.type === "NUMBER" ? "number" : "text";
    const value = typeof current === "string" ? current : "";

    return (
      <div id={wrapId}>
        <label htmlFor={fieldId} className="text-primary-800 mb-2 block text-sm font-bold">
          {group.name}
          {group.isRequired ? (
            <span className="text-danger-600 ms-1" aria-hidden="true">
              *
            </span>
          ) : (
            <span className="text-primary-400 ms-1.5 text-xs font-medium">(اختياري)</span>
          )}
        </label>

        {group.type === "TEXTAREA" ? (
          <textarea
            id={fieldId}
            rows={3}
            value={value}
            onChange={(event) => onSelect(group.key, event.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={describe(fieldId, group, error)}
            placeholder="أي تفاصيل تودّ أن يراعيها قسم الإنتاج."
            className={cn(CONTROL_CLASS, "resize-y", error && "border-danger-500")}
          />
        ) : (
          <input
            id={fieldId}
            type={inputType}
            inputMode={group.type === "NUMBER" ? "numeric" : undefined}
            value={value}
            onChange={(event) => onSelect(group.key, event.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={describe(fieldId, group, error)}
            className={cn(CONTROL_CLASS, "h-12", error && "border-danger-500")}
          />
        )}

        <FieldNote id={fieldId} group={group} error={error} />
      </div>
    );
  }

  if (group.values.length === 0) return null;

  // --- عيّنات الألوان ---
  if (group.type === "COLOR") {
    return (
      <fieldset id={wrapId}>
        <Legend group={group} selected={labelOf(group, current)} />

        <div className="flex flex-wrap gap-2.5">
          {group.values.map((value) => {
            const checked = current === value.id;
            return (
              <label
                key={value.id}
                className={cn(
                  "relative flex min-h-11 min-w-16 cursor-pointer flex-col items-center gap-1.5 rounded-xl border p-2 transition-all",
                  "has-focus-visible:outline-accent-600 has-focus-visible:outline-2 has-focus-visible:outline-offset-2",
                  checked
                    ? "border-accent-600 ring-accent-600/20 ring-2"
                    : "border-border-strong hover:border-primary-400",
                )}
              >
                <input
                  type="radio"
                  name={group.key}
                  value={value.id}
                  checked={checked}
                  onChange={() => onSelect(group.key, value.id)}
                  className="sr-only"
                />
                <span
                  aria-hidden="true"
                  style={{ backgroundColor: value.swatchHex ?? "#ccc" }}
                  className="ring-border-strong size-9 rounded-lg ring-1 ring-inset"
                />
                <span className="text-primary-700 text-[0.7rem] font-medium">{value.label}</span>
              </label>
            );
          })}
        </div>

        <FieldNote id={fieldId} group={group} error={error} />
      </fieldset>
    );
  }

  // --- اختيارات متعددة ---
  if (group.type === "CHECKBOX") {
    const selected = Array.isArray(current) ? current : current ? [current] : [];

    return (
      <fieldset id={wrapId}>
        <Legend
          group={group}
          selected={
            selected
              .map((id) => group.values.find((value) => value.id === id)?.label)
              .filter(Boolean)
              .join("، ") || undefined
          }
        />

        <div className="grid gap-2.5 sm:grid-cols-2">
          {group.values.map((value) => (
            <ChoiceTile
              key={value.id}
              type="checkbox"
              name={group.key}
              value={value}
              checked={selected.includes(value.id)}
              onChange={() => onToggle(group.key, value.id)}
            />
          ))}
        </div>

        <FieldNote id={fieldId} group={group} error={error} />
      </fieldset>
    );
  }

  // --- قائمة منسدلة عند كثرة الخيارات ---
  if (group.type === "SELECT" && group.values.length > 5) {
    return (
      <div id={wrapId}>
        <label htmlFor={fieldId} className="text-primary-800 mb-2 block text-sm font-bold">
          {group.name}
          {group.isRequired ? (
            <span className="text-danger-600 ms-1" aria-hidden="true">
              *
            </span>
          ) : null}
        </label>
        <div className="relative">
          <select
            id={fieldId}
            value={typeof current === "string" ? current : ""}
            onChange={(event) => onSelect(group.key, event.target.value)}
            aria-invalid={error ? true : undefined}
            className={cn(CONTROL_CLASS, "h-12 appearance-none py-0 pe-11", error && "border-danger-500")}
          >
            {!group.isRequired || !current ? <option value="">{group.isRequired ? "اختر…" : "بدون"}</option> : null}
            {group.values.map((value) => (
              <option key={value.id} value={value.id}>
                {value.label}
                {value.priceModifier !== 0 ? ` (${priceHint(value)})` : ""}
              </option>
            ))}
          </select>
          <Icon
            name="chevronDown"
            className="text-primary-400 pointer-events-none absolute inset-y-0 end-4 my-auto size-4"
          />
        </div>
        <FieldNote id={fieldId} group={group} error={error} />
      </div>
    );
  }

  // --- بطاقات اختيار واحد ---
  return (
    <fieldset id={wrapId}>
      <Legend group={group} selected={labelOf(group, current)} />

      <div className="grid gap-2.5 sm:grid-cols-2">
        {group.values.map((value) => (
          <ChoiceTile
            key={value.id}
            type="radio"
            name={group.key}
            value={value}
            checked={current === value.id}
            onChange={() => onSelect(group.key, value.id)}
          />
        ))}
      </div>

      <FieldNote id={fieldId} group={group} error={error} />
    </fieldset>
  );
}

function describe(id: string, group: ConfiguratorGroup, error?: string) {
  if (error) return `${id}-error`;
  return group.helpText ? `${id}-help` : undefined;
}

function Legend({ group, selected }: { group: ConfiguratorGroup; selected?: string }) {
  return (
    <legend className="text-primary-800 mb-2.5 flex w-full flex-wrap items-baseline justify-between gap-2 text-sm font-bold">
      <span>
        {group.name}
        {group.isRequired ? (
          <span className="text-danger-600 ms-1" aria-hidden="true">
            *
          </span>
        ) : (
          <span className="text-primary-400 ms-1.5 text-xs font-medium">(اختياري)</span>
        )}
      </span>
      {selected ? <span className="text-primary-500 text-xs font-medium">{selected}</span> : null}
    </legend>
  );
}

/** نص المساعدة أو رسالة الخطأ تحت المجموعة. */
function FieldNote({ id, group, error }: { id: string; group: ConfiguratorGroup; error?: string }) {
  if (error) {
    return (
      <p
        id={`${id}-error`}
        role="alert"
        className="text-danger-600 mt-2 flex items-center gap-1.5 text-xs font-bold"
      >
        <Icon name="alert" className="size-3.5" strokeWidth={2} />
        {error}
      </p>
    );
  }
  if (!group.helpText) return null;
  return (
    <p id={`${id}-help`} className="text-primary-500 mt-2 text-xs leading-relaxed">
      {group.helpText}
    </p>
  );
}

function labelOf(group: ConfiguratorGroup, current: string | string[] | undefined) {
  if (typeof current !== "string") return undefined;
  return group.values.find((value) => value.id === current)?.label;
}

/** نص مختصر يوضّح أثر الخيار على السعر. */
function priceHint(value: ConfiguratorGroup["values"][number]): string {
  if (value.priceModifier === 0) return "";

  switch (value.priceMode) {
    case "MULTIPLY":
      return `${value.priceModifier > 1 ? "+" : ""}${Math.round(
        (value.priceModifier - 1) * 100,
      )}٪`;
    case "ADD":
      return `${value.priceModifier > 0 ? "+" : ""}${formatPrice(
        value.priceModifier,
      )} ${commerce.currencySymbol} للطلب`;
    case "OVERRIDE_UNIT":
      return `${formatPrice(value.priceModifier)} ${commerce.currencySymbol}/وحدة`;
    default:
      return `${value.priceModifier > 0 ? "+" : ""}${formatPrice(
        value.priceModifier,
      )} ${commerce.currencySymbol}`;
  }
}

function ChoiceTile({
  type,
  name,
  value,
  checked,
  onChange,
}: {
  type: "radio" | "checkbox";
  name: string;
  value: ConfiguratorGroup["values"][number];
  checked: boolean;
  onChange: () => void;
}) {
  const hint = priceHint(value);

  return (
    <label
      className={cn(
        "relative flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition-[border-color,background-color,box-shadow]",
        "has-focus-visible:outline-accent-600 has-focus-visible:outline-2 has-focus-visible:outline-offset-2",
        checked
          ? "border-accent-600 bg-accent-50/60 ring-accent-600/25 ring-1"
          : "border-border-strong bg-surface hover:border-primary-400 hover:bg-surface-muted",
      )}
    >
      <input
        type={type}
        name={name}
        value={value.id}
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />

      <span
        aria-hidden="true"
        className={cn(
          "grid size-5 shrink-0 place-items-center border-2 transition-colors",
          checked ? "border-accent-600" : "border-border-strong",
          type === "radio" ? "rounded-full" : "rounded-md",
        )}
      >
        <span
          className={cn(
            "bg-accent-600 size-2.5 transition-transform",
            checked ? "scale-100" : "scale-0",
            type === "radio" ? "rounded-full" : "rounded-xs",
          )}
        />
      </span>

      <span className="min-w-0 flex-1">
        <span className="text-primary-900 block text-sm font-bold">{value.label}</span>
        {hint ? (
          <span className="text-accent-800 mt-0.5 block text-xs font-bold">{hint}</span>
        ) : null}
      </span>
    </label>
  );
}

// ---------------------------------------------------------------------------

function PriceSummary({
  breakdown,
  unit,
  described,
}: {
  breakdown: ReturnType<typeof calculatePrice>;
  unit: string;
  described: ReturnType<typeof describeSelection>;
}) {
  return (
    <div className="mb-5" aria-live="polite">
      <p className="text-primary-500 mb-1 text-xs font-bold">ملخّص طلبك</p>

      <div className="flex flex-wrap items-end justify-between gap-3">
        {/* key يعيد تشغيل الحركة القصيرة عند كل تغيّر في السعر */}
        <span key={breakdown.total} className="animate-scale-in inline-block origin-right">
          <Price value={breakdown.total} size="xl" />
        </span>

        <p className="text-primary-600 text-sm">
          <span className="font-bold tabular-nums">{formatPrice(breakdown.unitPrice)}</span>{" "}
          {commerce.currencySymbol} / {unit}
          <span className="text-primary-400"> × {formatNumber(breakdown.quantity)}</span>
        </p>
      </div>

      {described.length > 0 ? (
        <ul className="text-primary-600 mt-3 flex flex-wrap gap-1.5 text-xs">
          {described.slice(0, 6).map((item) => (
            <li key={item.key} className="bg-surface-sunken rounded-md px-2.5 py-1">
              <span className="text-primary-500">{item.label}:</span>{" "}
              <span className="text-primary-900 font-medium">{item.valueLabel}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {/* تفصيل السعر — يوضّح للعميل من أين جاء الرقم */}
      <details className="group mt-4">
        <summary className="text-primary-600 hover:text-primary-900 focus-visible:outline-accent-600 inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2">
          <Icon
            name="chevronDown"
            className="size-3.5 transition-transform group-open:rotate-180"
            strokeWidth={2.5}
          />
          تفصيل السعر
        </summary>

        <ul className="border-border mt-2 space-y-2 border-t pt-3 text-xs">
          {breakdown.lines.map((line, index) => (
            <li key={index} className="flex items-center justify-between gap-4">
              <span className="text-primary-600">{line.label}</span>
              <span className="text-primary-900 font-bold tabular-nums">
                {line.amount >= 0 ? "" : "−"}
                {formatPrice(Math.abs(line.amount))} {commerce.currencySymbol}
                {line.kind === "per-unit" || line.kind === "base" ? (
                  <span className="text-primary-400 font-normal"> / {unit}</span>
                ) : null}
              </span>
            </li>
          ))}

          <li className="border-border flex items-center justify-between gap-4 border-t pt-2">
            <span className="text-primary-600">الكمية × {formatNumber(breakdown.quantity)}</span>
            <span className="text-primary-900 font-bold tabular-nums">
              {formatPrice(breakdown.unitPrice * breakdown.quantity)} {commerce.currencySymbol}
            </span>
          </li>

          {breakdown.flatFees > 0 ? (
            <li className="flex items-center justify-between gap-4">
              <span className="text-primary-600">رسوم تجهيز ثابتة</span>
              <span className="text-primary-900 font-bold tabular-nums">
                {formatPrice(breakdown.flatFees)} {commerce.currencySymbol}
              </span>
            </li>
          ) : null}
        </ul>
      </details>

      <p className="text-primary-500 mt-2 text-[0.72rem] leading-relaxed">
        {commerce.pricesIncludeVat
          ? "السعر شامل ضريبة القيمة المضافة ١٥٪."
          : "السعر غير شامل ضريبة القيمة المضافة."}{" "}
        الشحن يُحسب حسب مدينتك في صفحة الإتمام — والاستلام من الفرع مجاني.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------

function TierTable({
  tiers,
  currentQty,
  unit,
}: {
  tiers: PricingQuantityTier[];
  currentQty: number;
  unit: string;
}) {
  return (
    <div>
      {/*
        h2 لا h3: هذا أول عنوان فرعي تحت اسم المنتج (h1) في الصفحة،
        واستخدام h3 هنا يُحدث قفزة في تسلسل العناوين تربك قارئ الشاشة.
      */}
      <h2 className="text-primary-800 mb-2.5 text-sm font-bold">السعر ينخفض كلما زادت الكمية</h2>

      <div className="border-border overflow-hidden rounded-xl border">
        <table className="w-full text-sm">
          <caption className="sr-only">شرائح أسعار الكميات</caption>
          <thead className="bg-surface-sunken">
            <tr>
              <th scope="col" className="text-primary-600 px-4 py-2.5 text-right text-xs font-bold">
                الكمية
              </th>
              <th scope="col" className="text-primary-600 px-4 py-2.5 text-left text-xs font-bold">
                سعر الوحدة
              </th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {tiers.map((tier, index) => {
              const active =
                currentQty >= tier.minQty && (tier.maxQty === null || currentQty <= tier.maxQty);

              return (
                <tr
                  key={index}
                  className={cn(active ? "bg-accent-50" : "bg-surface")}
                  aria-current={active ? "true" : undefined}
                >
                  <td className="px-4 py-3">
                    <span className={cn("text-sm", active && "text-accent-800 font-bold")}>
                      {tier.label ??
                        (tier.maxQty
                          ? `${formatNumber(tier.minQty)} – ${formatNumber(tier.maxQty)}`
                          : `${formatNumber(tier.minQty)} فأكثر`)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-left">
                    <span
                      className={cn(
                        "text-sm tabular-nums",
                        active ? "text-accent-800 font-bold" : "text-primary-700",
                      )}
                    >
                      {formatPrice(tier.unitPrice)} {commerce.currencySymbol}
                      <span className="text-primary-400 font-normal"> / {unit}</span>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function MobileBar({
  visible,
  breakdown,
  isQuoteOnly,
  onAdd,
  quoteHref,
  whatsappUrl,
  added,
}: {
  visible: boolean;
  breakdown: ReturnType<typeof calculatePrice>;
  isQuoteOnly: boolean;
  onAdd: () => void;
  quoteHref: string;
  whatsappUrl: string;
  added: boolean;
}) {
  return (
    <div
      aria-hidden={!visible}
      inert={!visible}
      className={cn(
        "border-border bg-surface/95 fixed inset-x-0 bottom-0 z-40 border-t p-3 shadow-[0_-8px_28px_-12px_rgb(38_23_71/0.25)] backdrop-blur-md md:hidden",
        "transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
        visible ? "translate-y-0" : "translate-y-full",
      )}
    >
      <div className="mx-auto flex max-w-xl items-center gap-3">
        <div className="min-w-0 flex-1">
          {isQuoteOnly ? (
            <QuoteOnlyLabel className="text-xs" />
          ) : (
            <>
              <span className="text-primary-500 block text-[0.65rem]">الإجمالي</span>
              <Price value={breakdown.total} size="md" />
            </>
          )}
        </div>

        {isQuoteOnly ? (
          <ButtonLink href={quoteHref} size="md" className="min-h-12 shrink-0">
            عرض سعر
          </ButtonLink>
        ) : added ? (
          <ButtonLink href="/checkout" size="md" variant="accent" className="min-h-12 shrink-0" iconAfter="arrowLeft">
            إتمام الطلب
          </ButtonLink>
        ) : (
          <Button size="md" icon="cart" onClick={onAdd} className="min-h-12 shrink-0">
            أضف للسلة
          </Button>
        )}

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="اطلب عبر واتساب"
          className="grid size-12 shrink-0 place-items-center rounded-xl bg-[#25D366] text-white transition-colors hover:bg-[#1EBE5A]"
        >
          <Icon name="whatsapp" className="size-5" />
        </a>
      </div>
    </div>
  );
}

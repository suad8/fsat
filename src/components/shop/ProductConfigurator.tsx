"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { useCart } from "@/components/cart/CartProvider";
import { FileUpload, type UploadedFile } from "@/components/forms/FileUpload";
import { Alert } from "@/components/ui/Alert";
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

/**
 * مُهيّئ المنتج — اختيار المواصفات مع تحديث السعر لحظيًا.
 *
 * الحساب يستخدم نفس وحدة التسعير التي يستخدمها الخادم (src/lib/pricing.ts)،
 * فما يراه العميل هنا هو ما سيُحتسب عند حفظ الطلب — والخادم يعيد الحساب
 * مجددًا قبل الحفظ فلا أثر لأي تلاعب من المتصفّح.
 */
export function ProductConfigurator({ product }: { product: ConfiguratorProduct }) {
  const { addItem } = useCart();

  const [selection, setSelection] = useState<OptionSelection>(() =>
    defaultSelection(product.optionGroups),
  );
  const [quantity, setQuantity] = useState(product.minQuantity);
  const [quantityInput, setQuantityInput] = useState(String(product.minQuantity));
  const [notes, setNotes] = useState("");
  const [designs, setDesigns] = useState<UploadedFile[]>([]);
  const [added, setAdded] = useState(false);

  const isQuoteOnly = product.priceMode === "QUOTE_ONLY";

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

  const missingLabels = breakdown.missingRequired
    .map((key) => product.optionGroups.find((group) => group.key === key)?.name)
    .filter(Boolean) as string[];

  const canAddToCart = !isQuoteOnly && breakdown.priceable && missingLabels.length === 0;

  function setValue(key: string, value: string | string[]) {
    setSelection((current) => ({ ...current, [key]: value }));
    setAdded(false);
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
    setAdded(false);
  }

  function commitQuantity(raw: string) {
    const parsed = Number.parseInt(raw.replace(/\D/g, ""), 10);
    const next = normalizeQuantity(product, Number.isNaN(parsed) ? product.minQuantity : parsed);
    setQuantity(next);
    setQuantityInput(String(next));
    setAdded(false);
  }

  function stepQuantity(direction: 1 | -1) {
    const next = normalizeQuantity(product, quantity + direction * product.quantityStep);
    setQuantity(next);
    setQuantityInput(String(next));
    setAdded(false);
  }

  function handleAddToCart() {
    if (!canAddToCart) return;

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
      notes: buildNotes(),
    });

    setAdded(true);
    setTimeout(() => setAdded(false), 3000);
  }

  /** يضم ملاحظات العميل وروابط الملفات المرفوعة في نص واحد يُحفظ مع البند. */
  function buildNotes(): string | undefined {
    const parts: string[] = [];
    if (notes.trim()) parts.push(notes.trim());
    if (designs.length > 0) {
      parts.push(`الملفات المرفوعة: ${designs.map((file) => file.name).join("، ")}`);
    }
    return parts.length > 0 ? parts.join(" — ") : undefined;
  }

  const whatsappUrl = whatsappProductUrl({
    productName: product.name,
    productPath: `/shop/${product.categorySlug}/${product.slug}`,
    options: described.map((item) => ({ label: item.label, value: item.valueLabel })),
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
    <div className="space-y-7">
      {/* --- مجموعات الخيارات --- */}
      {product.optionGroups.map((group) => (
        <OptionGroupField
          key={group.id}
          group={group}
          selection={selection}
          onSelect={setValue}
          onToggle={toggleCheckbox}
          designs={designs}
          onDesignsChange={setDesigns}
        />
      ))}

      {/* --- الكمية --- */}
      <div>
        <label htmlFor="quantity" className="text-primary-800 mb-1.5 block text-sm font-bold">
          الكمية
          <span className="text-primary-500 ms-1.5 text-xs font-medium">
            ({product.unit})
          </span>
        </label>

        <div className="flex items-center gap-3">
          <div className="border-border-strong bg-surface flex items-center rounded-lg border">
            <button
              type="button"
              onClick={() => stepQuantity(-1)}
              disabled={quantity <= product.minQuantity}
              aria-label="إنقاص الكمية"
              className="text-primary-600 hover:bg-surface-sunken hover:text-primary-950 focus-visible:outline-accent-600 grid size-11 place-items-center rounded-r-lg transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Icon name="minus" className="size-4" strokeWidth={2.5} />
            </button>

            <input
              id="quantity"
              type="text"
              inputMode="numeric"
              value={quantityInput}
              onChange={(event) => setQuantityInput(event.target.value)}
              onBlur={(event) => commitQuantity(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  commitQuantity(quantityInput);
                }
              }}
              aria-describedby="quantity-help"
              className="text-primary-950 w-20 border-0 bg-transparent py-2.5 text-center text-base font-bold tabular-nums focus:outline-none"
            />

            <button
              type="button"
              onClick={() => stepQuantity(1)}
              aria-label="زيادة الكمية"
              className="text-primary-600 hover:bg-surface-sunken hover:text-primary-950 focus-visible:outline-accent-600 grid size-11 place-items-center rounded-l-lg transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2"
            >
              <Icon name="plus" className="size-4" strokeWidth={2.5} />
            </button>
          </div>

          {breakdown.tierLabel ? (
            <span className="bg-accent-50 text-accent-800 ring-accent-600/15 rounded-md px-3 py-1.5 text-xs font-bold ring-1 ring-inset">
              شريحة: {breakdown.tierLabel}
            </span>
          ) : null}
        </div>

        <p id="quantity-help" className="text-primary-500 mt-1.5 text-xs">
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

      {/* --- الملاحظات --- */}
      <div>
        <label htmlFor="notes" className="text-primary-800 mb-1.5 block text-sm font-bold">
          ملاحظات على الطلب
          <span className="text-primary-400 ms-1.5 text-xs font-medium">(اختياري)</span>
        </label>
        <textarea
          id="notes"
          rows={3}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="أي تفاصيل تودّ أن يراعيها قسم الإنتاج."
          className="border-border-strong bg-surface text-primary-900 placeholder:text-primary-400 hover:border-primary-400 focus-visible:outline-accent-600 w-full resize-y rounded-lg border px-3.5 py-2.5 text-sm transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1"
        />
      </div>

      {/* --- السعر والأزرار --- */}
      <div className="border-border bg-surface-muted rounded-xl border p-5">
        {isQuoteOnly ? (
          <div className="mb-4">
            <QuoteOnlyLabel className="text-base" />
            <p className="text-primary-600 mt-2 text-sm leading-relaxed">
              يعتمد سعر هذا المنتج على التصميم والمقاس وطريقة التنفيذ. أرسل مواصفاتك
              ونرسل لك عرض سعر دقيقًا خلال يوم عمل.
            </p>
          </div>
        ) : (
          <PriceSummary breakdown={breakdown} unit={product.unit} />
        )}

        {missingLabels.length > 0 && !isQuoteOnly ? (
          <Alert tone="warning" className="mb-4">
            اختر {missingLabels.join("، ")} لإتمام الطلب.
          </Alert>
        ) : null}

        {added ? (
          <Alert tone="success" live className="mb-4">
            تمت إضافة المنتج إلى السلة.{" "}
            <Link href="/cart" className="font-bold underline underline-offset-2">
              عرض السلة
            </Link>
          </Alert>
        ) : null}

        <div className="grid gap-2.5">
          {isQuoteOnly ? (
            <ButtonLink href={quoteHref} size="lg" fullWidth icon="document">
              طلب عرض سعر
            </ButtonLink>
          ) : (
            <>
              <Button
                size="lg"
                fullWidth
                icon="cart"
                onClick={handleAddToCart}
                disabled={!canAddToCart}
              >
                أضف إلى السلة
              </Button>

              <ButtonLink href={quoteHref} size="md" variant="outline" fullWidth>
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
          >
            اطلب عبر واتساب
          </ButtonLink>
        </div>

        <p className="text-primary-500 mt-4 text-center text-xs leading-relaxed">
          رسالة واتساب ستُرسل بمواصفات طلبك كاملة — لن تحتاج لإعادة كتابتها.
        </p>
      </div>

      {/* --- شريط ثابت أسفل الجوال --- */}
      <MobileBar
        breakdown={breakdown}
        isQuoteOnly={isQuoteOnly}
        canAdd={canAddToCart}
        onAdd={handleAddToCart}
        quoteHref={quoteHref}
        whatsappUrl={whatsappUrl}
        added={added}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------

function OptionGroupField({
  group,
  selection,
  onSelect,
  onToggle,
  designs,
  onDesignsChange,
}: {
  group: ConfiguratorGroup;
  selection: OptionSelection;
  onSelect: (key: string, value: string) => void;
  onToggle: (key: string, valueId: string) => void;
  designs: UploadedFile[];
  onDesignsChange: (files: UploadedFile[]) => void;
}) {
  const fieldId = `option-${group.key}`;
  const current = selection[group.key];

  // --- رفع الملفات ---
  if (group.type === "FILE") {
    return (
      <FileUpload
        label={group.name}
        help={group.helpText ?? undefined}
        kind="DESIGN"
        value={designs}
        onChange={onDesignsChange}
        maxFiles={3}
        optional={!group.isRequired}
      />
    );
  }

  // --- الحقول الحرّة ---
  if (!CHOICE_OPTION_TYPES.includes(group.type)) {
    const inputType = group.type === "DATE" ? "date" : group.type === "NUMBER" ? "number" : "text";
    const value = typeof current === "string" ? current : "";

    return (
      <div>
        <label htmlFor={fieldId} className="text-primary-800 mb-1.5 block text-sm font-bold">
          {group.name}
          {!group.isRequired ? (
            <span className="text-primary-400 ms-1.5 text-xs font-medium">(اختياري)</span>
          ) : null}
        </label>

        {group.type === "TEXTAREA" ? (
          <textarea
            id={fieldId}
            rows={3}
            value={value}
            required={group.isRequired}
            onChange={(event) => onSelect(group.key, event.target.value)}
            aria-describedby={group.helpText ? `${fieldId}-help` : undefined}
            className="border-border-strong bg-surface hover:border-primary-400 focus-visible:outline-accent-600 w-full resize-y rounded-lg border px-3.5 py-2.5 text-sm transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1"
          />
        ) : (
          <input
            id={fieldId}
            type={inputType}
            value={value}
            required={group.isRequired}
            onChange={(event) => onSelect(group.key, event.target.value)}
            aria-describedby={group.helpText ? `${fieldId}-help` : undefined}
            className="border-border-strong bg-surface hover:border-primary-400 focus-visible:outline-accent-600 w-full rounded-lg border px-3.5 py-2.5 text-sm transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1"
          />
        )}

        {group.helpText ? (
          <p id={`${fieldId}-help`} className="text-primary-500 mt-1.5 text-xs leading-relaxed">
            {group.helpText}
          </p>
        ) : null}
      </div>
    );
  }

  if (group.values.length === 0) return null;

  // --- عيّنات الألوان ---
  if (group.type === "COLOR") {
    return (
      <fieldset>
        <Legend group={group} selected={labelOf(group, current)} />

        <div className="flex flex-wrap gap-2.5">
          {group.values.map((value) => {
            const checked = current === value.id;
            return (
              <label
                key={value.id}
                className={cn(
                  "relative flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border p-2 transition-all",
                  "has-focus-visible:outline-accent-600 has-focus-visible:outline-2 has-focus-visible:outline-offset-2",
                  checked
                    ? "border-accent-600 ring-accent-600/20 ring-1"
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
                  className="ring-border-strong size-9 rounded-md ring-1 ring-inset"
                />
                <span className="text-primary-700 text-[0.7rem] font-medium">
                  {value.label}
                </span>
              </label>
            );
          })}
        </div>

        <HelpText group={group} />
      </fieldset>
    );
  }

  // --- اختيارات متعددة ---
  if (group.type === "CHECKBOX") {
    const selected = Array.isArray(current) ? current : current ? [current] : [];

    return (
      <fieldset>
        <Legend
          group={group}
          selected={
            selected
              .map((id) => group.values.find((value) => value.id === id)?.label)
              .filter(Boolean)
              .join("، ") || undefined
          }
        />

        <div className="grid gap-2 sm:grid-cols-2">
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

        <HelpText group={group} />
      </fieldset>
    );
  }

  // --- قائمة منسدلة عند كثرة الخيارات ---
  if (group.type === "SELECT" && group.values.length > 5) {
    return (
      <div>
        <label htmlFor={fieldId} className="text-primary-800 mb-1.5 block text-sm font-bold">
          {group.name}
        </label>
        <div className="relative">
          <select
            id={fieldId}
            value={typeof current === "string" ? current : ""}
            onChange={(event) => onSelect(group.key, event.target.value)}
            className="border-border-strong bg-surface hover:border-primary-400 focus-visible:outline-accent-600 w-full appearance-none rounded-lg border py-2.5 ps-3.5 pe-10 text-sm transition-colors focus:outline-none focus-visible:outline-2"
          >
            {!group.isRequired ? <option value="">بدون</option> : null}
            {group.values.map((value) => (
              <option key={value.id} value={value.id}>
                {value.label}
                {value.priceModifier !== 0 ? ` (${priceHint(value)})` : ""}
              </option>
            ))}
          </select>
          <Icon
            name="chevronDown"
            className="text-primary-400 pointer-events-none absolute inset-y-0 left-3 my-auto size-4"
          />
        </div>
        <HelpText group={group} />
      </div>
    );
  }

  // --- بطاقات اختيار واحد ---
  return (
    <fieldset>
      <Legend group={group} selected={labelOf(group, current)} />

      <div className="grid gap-2 sm:grid-cols-2">
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

      <HelpText group={group} />
    </fieldset>
  );
}

function Legend({ group, selected }: { group: ConfiguratorGroup; selected?: string }) {
  return (
    <legend className="text-primary-800 mb-2.5 flex w-full flex-wrap items-baseline justify-between gap-2 text-sm font-bold">
      <span>
        {group.name}
        {!group.isRequired ? (
          <span className="text-primary-400 ms-1.5 text-xs font-medium">(اختياري)</span>
        ) : null}
      </span>
      {selected ? (
        <span className="text-primary-500 text-xs font-medium">{selected}</span>
      ) : null}
    </legend>
  );
}

function HelpText({ group }: { group: ConfiguratorGroup }) {
  if (!group.helpText) return null;
  return (
    <p className="text-primary-500 mt-2 text-xs leading-relaxed">{group.helpText}</p>
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
        "relative flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition-all",
        "has-focus-visible:outline-accent-600 has-focus-visible:outline-2 has-focus-visible:outline-offset-2",
        checked
          ? "border-accent-600 bg-accent-50/60 ring-accent-600/20 ring-1"
          : "border-border-strong hover:border-primary-400 hover:bg-surface-muted",
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
          "mt-0.5 grid size-4.5 shrink-0 place-items-center border-2 transition-colors",
          checked ? "border-accent-600" : "border-border-strong",
          type === "radio" ? "rounded-full" : "rounded",
        )}
      >
        <span
          className={cn(
            "bg-accent-600 size-2 transition-transform",
            checked ? "scale-100" : "scale-0",
            type === "radio" ? "rounded-full" : "rounded-xs",
          )}
        />
      </span>

      <span className="min-w-0 flex-1">
        <span className="text-primary-900 block text-sm font-medium">{value.label}</span>
        {hint ? (
          <span className="text-accent-700 mt-0.5 block text-xs font-bold">{hint}</span>
        ) : null}
      </span>
    </label>
  );
}

// ---------------------------------------------------------------------------

function PriceSummary({
  breakdown,
  unit,
}: {
  breakdown: ReturnType<typeof calculatePrice>;
  unit: string;
}) {
  return (
    <div className="mb-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-primary-500 mb-1 text-xs">الإجمالي التقديري</p>
          <Price value={breakdown.total} size="xl" />
        </div>

        <p className="text-primary-600 text-sm">
          <span className="font-bold tabular-nums">{formatPrice(breakdown.unitPrice)}</span>{" "}
          {commerce.currencySymbol} / {unit}
        </p>
      </div>

      {/* تفصيل السعر — يوضّح للعميل من أين جاء الرقم */}
      <details className="group mt-4">
        <summary className="text-primary-600 hover:text-primary-900 focus-visible:outline-accent-600 inline-flex cursor-pointer list-none items-center gap-1.5 rounded text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2">
          <Icon
            name="chevronDown"
            className="size-3.5 transition-transform group-open:rotate-180"
            strokeWidth={2.5}
          />
          تفصيل السعر
        </summary>

        <ul className="border-border mt-3 space-y-2 border-t pt-3 text-xs">
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
            <span className="text-primary-600">
              الكمية × {formatNumber(breakdown.quantity)}
            </span>
            <span className="text-primary-900 font-bold tabular-nums">
              {formatPrice(breakdown.unitPrice * breakdown.quantity)}{" "}
              {commerce.currencySymbol}
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

        <p className="text-primary-500 mt-3 text-[0.7rem] leading-relaxed">
          {commerce.pricesIncludeVat
            ? "السعر شامل ضريبة القيمة المضافة ١٥٪."
            : "السعر غير شامل ضريبة القيمة المضافة."}{" "}
          تُحتسب تكلفة الشحن في صفحة إتمام الطلب.
        </p>
      </details>
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
      <h2 className="text-primary-800 mb-2.5 text-sm font-bold">
        السعر ينخفض كلما زادت الكمية
      </h2>

      <div className="border-border overflow-hidden rounded-lg border">
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
                currentQty >= tier.minQty &&
                (tier.maxQty === null || currentQty <= tier.maxQty);

              return (
                <tr
                  key={index}
                  className={cn(active ? "bg-accent-50" : "bg-surface")}
                  aria-current={active ? "true" : undefined}
                >
                  <td className="px-4 py-2.5">
                    <span className={cn("text-sm", active && "text-accent-800 font-bold")}>
                      {tier.label ??
                        (tier.maxQty
                          ? `${formatNumber(tier.minQty)} – ${formatNumber(tier.maxQty)}`
                          : `${formatNumber(tier.minQty)} فأكثر`)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-left">
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
  breakdown,
  isQuoteOnly,
  canAdd,
  onAdd,
  quoteHref,
  whatsappUrl,
  added,
}: {
  breakdown: ReturnType<typeof calculatePrice>;
  isQuoteOnly: boolean;
  canAdd: boolean;
  onAdd: () => void;
  quoteHref: string;
  whatsappUrl: string;
  added: boolean;
}) {
  return (
    <div className="border-border bg-surface/95 fixed inset-x-0 bottom-0 z-40 border-t p-3 shadow-[0_-4px_20px_rgb(18_17_16/0.08)] backdrop-blur-sm md:hidden">
      <div className="flex items-center gap-3">
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
          <ButtonLink href={quoteHref} size="md" className="shrink-0">
            عرض سعر
          </ButtonLink>
        ) : (
          <Button
            size="md"
            icon={added ? "check" : "cart"}
            variant={added ? "accent" : "primary"}
            onClick={onAdd}
            disabled={!canAdd}
            className="shrink-0"
          >
            {added ? "تمت الإضافة" : "أضف للسلة"}
          </Button>
        )}

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="اطلب عبر واتساب"
          className="grid size-11 shrink-0 place-items-center rounded-lg bg-[#25D366] text-white transition-colors hover:bg-[#1EBE5A]"
        >
          <Icon name="whatsapp" className="size-5" />
        </a>
      </div>
    </div>
  );
}

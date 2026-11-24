"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { saveProductAction } from "@/app/admin/(dashboard)/actions/product";
import { useToast } from "@/components/admin/Feedback";
import {
  focusFirstInvalid,
  FormSection,
  REQUIRED_MESSAGE,
  SaveBar,
  SectionsToggle,
  useDirty,
  useSaveShortcut,
  useUnsavedWarning,
} from "@/components/admin/FormKit";
import { Alert } from "@/components/ui/Alert";
import { Button, IconButton } from "@/components/ui/Button";
import { Checkbox, Select, TextArea, TextInput } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import {
  OPTION_PRICE_MODE_LABELS,
  OPTION_PRICE_MODES,
  OPTION_TYPE_LABELS,
  OPTION_TYPES,
  PRICE_MODE_LABELS,
  PRICE_MODES,
  type OptionPriceMode,
  type OptionType,
  type PriceMode,
} from "@/lib/constants";
import {
  EMPTY_OPTION_VALUE,
  type GroupDraft,
  type ImageDraft,
  type ProductDraft,
  type TierDraft,
  type ValueDraft,
} from "@/lib/admin/drafts";
import { slugify } from "@/lib/utils";

// إعادة تصدير النوع فقط — التصدير النوعي يُمحى عند البناء فلا يمرّ عبر
// حدود العميل/الخادم، بخلاف القيم التي يجب أن تبقى في وحدة محايدة
export type { ProductDraft };

/**
 * محرّر المنتج.
 *
 * الحالة كلها في هذا المكوّن ثم تُرسل ككائن واحد لإجراء الخادم. السبب: خيارات
 * المنتج متداخلة (مجموعات ← قيم) وديناميكية العدد، وهو ما لا يعبّر عنه
 * FormData بشكل مقروء أو قابل للتحقق.
 */




export function ProductEditor({
  initial,
  categories,
  services,
}: {
  initial: ProductDraft;
  categories: { id: string; name: string }[];
  services: { id: string; title: string }[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [draft, setDraft] = useState<ProductDraft>(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<string[]>([]);
  const [showErrors, setShowErrors] = useState(false);
  const { dirty, markSaved } = useDirty(draft);
  const [saved, setSaved] = useState(false);

  useUnsavedWarning(dirty && !saved);

  function patch(changes: Partial<ProductDraft>) {
    setDraft((current) => ({ ...current, ...changes }));
  }

  /*
   * التحقق المرئي: الحقول الإلزامية تُحسب دائمًا لكنها لا تُعرض إلا بعد أول
   * محاولة حفظ — لا نصرخ في وجه المستخدم قبل أن يبدأ الكتابة.
   */
  const required: { id: string; section: string; message: string; bad: boolean }[] = [
    { id: "name", section: "basics", message: REQUIRED_MESSAGE, bad: !draft.name.trim() },
    { id: "slug", section: "basics", message: REQUIRED_MESSAGE, bad: !(draft.slug || slugify(draft.name)).trim() },
    { id: "categoryId", section: "basics", message: "اختر القسم الذي ينتمي إليه المنتج", bad: !draft.categoryId },
    { id: "unit", section: "pricing", message: REQUIRED_MESSAGE, bad: !draft.unit.trim() },
    {
      id: "basePrice",
      section: "pricing",
      message: "أدخل سعرًا أكبر من صفر أو غيّر الطريقة إلى «عرض سعر فقط»",
      bad: draft.priceMode !== "QUOTE_ONLY" && !(draft.basePrice > 0),
    },
  ];
  const errorFor = (id: string) =>
    showErrors ? required.find((rule) => rule.id === id && rule.bad)?.message : undefined;
  const invalidIn = (section: string) =>
    showErrors ? required.filter((rule) => rule.section === section && rule.bad).length : 0;
  const invalidTotal = showErrors ? required.filter((rule) => rule.bad).length : 0;

  function handleSave() {
    if (pending) return;
    setError(null);
    setIssues([]);

    const firstBad = required.filter((rule) => rule.bad);
    if (firstBad.length > 0) {
      setShowErrors(true);
      toast.error("أكمل الحقول المطلوبة", `${firstBad.length} حقل يحتاج مراجعة قبل الحفظ.`);
      // ننتظر فتح الأقسام المطويّة ثم نركّز على أول حقل
      window.setTimeout(() => focusFirstInvalid(firstBad.map((rule) => rule.id)), 60);
      return;
    }

    const sent = { ...draft, slug: draft.slug || slugify(draft.name) };

    startTransition(async () => {
      const result = await saveProductAction(sent);

      if (!result.ok) {
        setError(result.error);
        setIssues(result.issues ?? []);
        toast.error("تعذّر حفظ المنتج", result.error);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      markSaved(draft);
      setSaved(true);
      toast.success(draft.id ? "تم حفظ التعديلات" : "تمت إضافة المنتج");
      router.push("/admin/products");
      router.refresh();
    });
  }

  useSaveShortcut(handleSave);

  const isQuoteOnly = draft.priceMode === "QUOTE_ONLY";

  return (
    <div className="space-y-6">
      {error ? (
        <Alert tone="danger" live title="تعذّر الحفظ">
          {error}
          {issues.length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 pe-5">
              {issues.map((issue, index) => (
                <li key={index}>{issue}</li>
              ))}
            </ul>
          ) : null}
        </Alert>
      ) : null}

      <div className="flex justify-end">
        <SectionsToggle />
      </div>

      {/* --- الأساسيات --- */}
      <FormSection id="basics" title="بيانات المنتج" description="الاسم والقسم والوصف كما يراها الزائر." invalidCount={invalidIn("basics")}>
        <div className="grid gap-5 md:grid-cols-2">
          <TextInput
            id="name"
            error={errorFor("name")}
            label="اسم المنتج"
            required
            value={draft.name}
            onChange={(event) => {
              const name = event.target.value;
              // الرابط يتبع الاسم تلقائيًا ما لم يعدّله المستخدم يدويًا
              patch({
                name,
                slug: draft.slug === slugify(draft.name) || !draft.slug ? slugify(name) : draft.slug,
              });
            }}
          />

          <TextInput
            id="slug"
            error={errorFor("slug")}
            label="الرابط (slug)"
            required
            value={draft.slug}
            onChange={(event) => patch({ slug: event.target.value })}
            help="يظهر في عنوان الصفحة. استخدم حروفًا إنجليزية وشرطات."
          />

          <Select
            id="categoryId"
            error={errorFor("categoryId")}
            label="القسم"
            required
            value={draft.categoryId}
            onChange={(event) => patch({ categoryId: event.target.value })}
            wrapperClassName="md:col-span-1"
          >
            <option value="" disabled>
              اختر القسم
            </option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>

          <TextInput
            id="sku"
            label="رمز المنتج (SKU)"
            optional
            value={draft.sku}
            onChange={(event) => patch({ sku: event.target.value })}
          />

          <TextArea
            id="shortDescription"
            label="وصف مختصر"
            optional
            rows={2}
            value={draft.shortDescription}
            onChange={(event) => patch({ shortDescription: event.target.value })}
            help="يظهر في بطاقة المنتج وفي نتائج البحث."
            wrapperClassName="md:col-span-2"
          />

          <TextArea
            id="description"
            label="الوصف التفصيلي"
            optional
            rows={6}
            value={draft.description}
            onChange={(event) => patch({ description: event.target.value })}
            wrapperClassName="md:col-span-2"
          />

          <TextInput
            id="leadTime"
            label="مدة التنفيذ"
            optional
            placeholder="٣ – ٥ أيام عمل"
            value={draft.leadTime}
            onChange={(event) => patch({ leadTime: event.target.value })}
          />

          <TextInput
            id="order"
            label="ترتيب العرض"
            type="number"
            value={String(draft.order)}
            onChange={(event) => patch({ order: Number(event.target.value) || 0 })}
            help="الأصغر يظهر أولاً."
          />

          <div className="space-y-3 md:col-span-2">
            <Checkbox
              id="isActive"
              label="منشور في المتجر"
              checked={draft.isActive}
              onChange={(event) => patch({ isActive: event.target.checked })}
            />
            <Checkbox
              id="isFeatured"
              label="منتج مميّز"
              description="يظهر في قسم «الأكثر طلبًا» بالصفحة الرئيسية."
              checked={draft.isFeatured}
              onChange={(event) => patch({ isFeatured: event.target.checked })}
            />
          </div>
        </div>
      </FormSection>

      {/* --- التسعير --- */}
      <FormSection
        id="pricing"
        title="التسعير"
        description="اختر طريقة التسعير ثم اضبط السعر الأساسي وشرائح الكميات."
        invalidCount={invalidIn("pricing")}
        summary={
          draft.priceMode === "QUOTE_ONLY"
            ? "عرض سعر فقط"
            : `${draft.basePrice} / ${draft.unit} · ${draft.quantityTiers.length} شريحة`
        }
      >
        <div className="grid gap-5 md:grid-cols-3">
          <Select
            id="priceMode"
            label="طريقة التسعير"
            required
            value={draft.priceMode}
            onChange={(event) => patch({ priceMode: event.target.value as PriceMode })}
          >
            {PRICE_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {PRICE_MODE_LABELS[mode]}
              </option>
            ))}
          </Select>

          <TextInput
            id="unit"
            error={errorFor("unit")}
            label="وحدة البيع"
            required
            value={draft.unit}
            onChange={(event) => patch({ unit: event.target.value })}
            placeholder="قطعة، كوب، متر مربع…"
          />

          <TextInput
            id="basePrice"
            error={errorFor("basePrice")}
            label="سعر الوحدة الأساسي"
            type="number"
            step="0.01"
            disabled={isQuoteOnly}
            value={String(draft.basePrice)}
            onChange={(event) => patch({ basePrice: Number(event.target.value) || 0 })}
            help={isQuoteOnly ? "غير مستخدم في وضع عرض السعر." : "قبل معدّلات الخيارات."}
          />

          <TextInput
            id="minQuantity"
            label="الحد الأدنى للكمية"
            type="number"
            value={String(draft.minQuantity)}
            onChange={(event) => patch({ minQuantity: Number(event.target.value) || 1 })}
          />

          <TextInput
            id="quantityStep"
            label="خطوة الزيادة"
            type="number"
            value={String(draft.quantityStep)}
            onChange={(event) => patch({ quantityStep: Number(event.target.value) || 1 })}
            help="زيادة الكمية تتم بمضاعفات هذا الرقم."
          />

          <TextInput
            id="compareAtPrice"
            label="السعر قبل الخصم"
            type="number"
            step="0.01"
            optional
            disabled={isQuoteOnly}
            value={draft.compareAtPrice === null ? "" : String(draft.compareAtPrice)}
            onChange={(event) =>
              patch({
                compareAtPrice: event.target.value === "" ? null : Number(event.target.value),
              })
            }
            help="يُعرض مشطوبًا بجانب السعر."
          />
        </div>

        {isQuoteOnly ? (
          <Alert tone="info" className="mt-5">
            في وضع «عرض سعر فقط» لن يظهر سعر ولا زر إضافة للسلة — يُعرض بدلاً منهما
            زر طلب عرض سعر.
          </Alert>
        ) : (
          <TierEditor
            tiers={draft.quantityTiers}
            unit={draft.unit}
            onChange={(quantityTiers) => patch({ quantityTiers })}
          />
        )}
      </FormSection>

      {/* --- الصور --- */}
      <FormSection
        id="images"
        title="صور المنتج"
        description="الصورة الأولى هي الصورة الرئيسية في بطاقة المنتج ونتائج البحث."
        summary={draft.images.length > 0 ? `${draft.images.length} صورة` : "لا توجد صور — المنتج لن يظهر بشكل جذاب"}
      >
        <ImageEditor images={draft.images} onChange={(images) => patch({ images })} />
      </FormSection>

      {/* --- الخيارات --- */}
      <FormSection
        id="options"
        title="خيارات المنتج"
        description="المقاس، الخامة، اللون، نوع الطباعة، التشطيب… كل مجموعة تؤثر على السعر حسب إعدادها."
        summary={`${draft.optionGroups.length} مجموعة خيارات`}
      >
        <OptionsEditor
          groups={draft.optionGroups}
          onChange={(optionGroups) => patch({ optionGroups })}
        />
      </FormSection>

      {/* --- الربط والسيو --- */}
      <FormSection id="links" title="الربط وتحسين محركات البحث" defaultOpen={false} summary="الخدمات المرتبطة وعنوان ووصف البحث">
        <div className="space-y-5">
          <fieldset>
            <legend className="text-primary-800 mb-2.5 text-sm font-bold">
              الخدمات المرتبطة
            </legend>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => (
                <Checkbox
                  key={service.id}
                  id={`service-${service.id}`}
                  label={service.title}
                  checked={draft.serviceIds.includes(service.id)}
                  onChange={(event) =>
                    patch({
                      serviceIds: event.target.checked
                        ? [...draft.serviceIds, service.id]
                        : draft.serviceIds.filter((id) => id !== service.id),
                    })
                  }
                />
              ))}
            </div>
          </fieldset>

          <div className="grid gap-5 md:grid-cols-2">
            <TextInput
              id="seoTitle"
              label="عنوان الصفحة (SEO)"
              optional
              value={draft.seoTitle}
              onChange={(event) => patch({ seoTitle: event.target.value })}
              help="اتركه فارغًا لاستخدام اسم المنتج."
            />
            <TextArea
              id="seoDescription"
              label="وصف الصفحة (SEO)"
              optional
              rows={3}
              value={draft.seoDescription}
              onChange={(event) => patch({ seoDescription: event.target.value })}
              help="١٥٠ – ١٦٠ حرفًا تظهر في نتائج البحث."
            />
          </div>
        </div>
      </FormSection>

      <SaveBar
        pending={pending}
        dirty={draft.id ? dirty : undefined}
        onSave={handleSave}
        saveLabel={draft.id ? "حفظ التعديلات" : "إضافة المنتج"}
        cancelHref="/admin/products"
        errorCount={invalidTotal}
        onShowErrors={() => focusFirstInvalid(required.filter((rule) => rule.bad).map((rule) => rule.id))}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------

function TierEditor({
  tiers,
  unit,
  onChange,
}: {
  tiers: TierDraft[];
  unit: string;
  onChange: (tiers: TierDraft[]) => void;
}) {
  function update(index: number, changes: Partial<TierDraft>) {
    onChange(tiers.map((tier, i) => (i === index ? { ...tier, ...changes } : tier)));
  }

  return (
    <div className="border-border mt-6 border-t pt-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold">شرائح الكميات</h3>
          <p className="text-primary-500 mt-0.5 text-xs">
            سعر الوحدة ينخفض كلما زادت الكمية. اترك الحد الأعلى فارغًا في الشريحة
            الأخيرة لتعني «وما فوق».
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          icon="plus"
          onClick={() =>
            onChange([
              ...tiers,
              {
                minQty: tiers.length > 0 ? (tiers[tiers.length - 1].maxQty ?? 0) + 1 : 1,
                maxQty: null,
                unitPrice: 0,
                label: "",
              },
            ])
          }
        >
          شريحة جديدة
        </Button>
      </div>

      {tiers.length === 0 ? (
        <p className="border-border bg-surface-muted text-primary-500 rounded-lg border border-dashed p-4 text-center text-xs">
          لا توجد شرائح — سيُستخدم سعر الوحدة الأساسي لكل الكميات.
        </p>
      ) : (
        <ul className="space-y-3">
          {tiers.map((tier, index) => (
            <li
              key={index}
              className="border-border bg-surface-muted grid gap-3 rounded-lg border p-3 sm:grid-cols-[repeat(4,1fr)_auto]"
            >
              <TextInput
                id={`tier-min-${index}`}
                label="من كمية"
                type="number"
                value={String(tier.minQty)}
                onChange={(event) => update(index, { minQty: Number(event.target.value) || 1 })}
              />
              <TextInput
                id={`tier-max-${index}`}
                label="إلى كمية"
                type="number"
                optional
                placeholder="وما فوق"
                value={tier.maxQty === null ? "" : String(tier.maxQty)}
                onChange={(event) =>
                  update(index, {
                    maxQty: event.target.value === "" ? null : Number(event.target.value),
                  })
                }
              />
              <TextInput
                id={`tier-price-${index}`}
                label={`سعر ال${unit}`}
                type="number"
                step="0.01"
                value={String(tier.unitPrice)}
                onChange={(event) =>
                  update(index, { unitPrice: Number(event.target.value) || 0 })
                }
              />
              <TextInput
                id={`tier-label-${index}`}
                label="التسمية"
                optional
                placeholder="١٠٠ – ٤٩٩ قطعة"
                value={tier.label}
                onChange={(event) => update(index, { label: event.target.value })}
              />

              <div className="flex items-end">
                <IconButton
                  name="trash"
                  label="حذف الشريحة"
                  size="sm"
                  variant="outline"
                  onClick={() => onChange(tiers.filter((_, i) => i !== index))}
                  className="text-danger-600"
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function ImageEditor({
  images,
  onChange,
}: {
  images: ImageDraft[];
  onChange: (images: ImageDraft[]) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      const body = new FormData();
      for (const file of Array.from(files)) body.append("files", file);
      body.append("folder", "products");

      const response = await fetch("/api/admin/upload", { method: "POST", body });
      const result = await response.json();

      if (!response.ok || !result.ok) {
        setError(result.message ?? "تعذّر رفع الصور.");
        return;
      }

      onChange([
        ...images,
        ...result.files.map((file: { url: string; name: string }) => ({
          url: file.url,
          alt: "",
        })),
      ]);
    } catch {
      setError("تعذّر الاتصال بالخادم أثناء الرفع.");
    } finally {
      setUploading(false);
    }
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div>
      <label
        htmlFor="product-images"
        className="border-border-strong bg-surface-muted hover:border-primary-400 block cursor-pointer rounded-lg border-2 border-dashed p-5 text-center transition-colors"
      >
        <Icon name="upload" className="text-primary-400 mx-auto size-7" strokeWidth={1.4} />
        <span className="text-primary-700 mt-2 block text-sm font-bold">
          {uploading ? "جارٍ الرفع…" : "اضغط لرفع صور المنتج"}
        </span>
        <span className="text-primary-500 mt-1 block text-xs">
          JPG أو PNG أو WEBP — تُحوَّل تلقائيًا إلى WebP
        </span>
        <input
          id="product-images"
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/avif"
          disabled={uploading}
          onChange={(event) => void upload(event.target.files)}
          className="sr-only"
        />
      </label>

      {error ? (
        <p role="alert" className="text-danger-600 mt-2 text-xs font-bold">
          {error}
        </p>
      ) : null}

      {images.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {images.map((image, index) => (
            <li
              key={`${image.url}-${index}`}
              className="border-border bg-surface-muted flex gap-3 rounded-lg border p-3"
            >
              <span className="border-border bg-surface relative size-20 shrink-0 overflow-hidden rounded-md border">
                <Image src={image.url} alt="" fill sizes="80px" className="object-cover" />
              </span>

              <div className="min-w-0 flex-1">
                <TextInput
                  id={`image-alt-${index}`}
                  label={index === 0 ? "النص البديل (الصورة الرئيسية)" : "النص البديل"}
                  required
                  value={image.alt}
                  onChange={(event) =>
                    onChange(
                      images.map((item, i) =>
                        i === index ? { ...item, alt: event.target.value } : item,
                      ),
                    )
                  }
                  help="صف ما تظهره الصورة — مطلوب لإمكانية الوصول ومحركات البحث."
                />
              </div>

              <div className="flex flex-col gap-1">
                <IconButton
                  name="chevronDown"
                  label="تحريك لأعلى"
                  size="sm"
                  variant="ghost"
                  onClick={() => move(index, -1)}
                  className="rotate-180"
                />
                <IconButton
                  name="chevronDown"
                  label="تحريك لأسفل"
                  size="sm"
                  variant="ghost"
                  onClick={() => move(index, 1)}
                />
                <IconButton
                  name="trash"
                  label="حذف الصورة"
                  size="sm"
                  variant="ghost"
                  onClick={() => onChange(images.filter((_, i) => i !== index))}
                  className="text-danger-600"
                />
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------


function OptionsEditor({
  groups,
  onChange,
}: {
  groups: GroupDraft[];
  onChange: (groups: GroupDraft[]) => void;
}) {
  function updateGroup(index: number, changes: Partial<GroupDraft>) {
    onChange(groups.map((group, i) => (i === index ? { ...group, ...changes } : group)));
  }

  return (
    <div className="space-y-4">
      {groups.length === 0 ? (
        <p className="border-border bg-surface-muted text-primary-500 rounded-lg border border-dashed p-5 text-center text-sm">
          لا توجد خيارات — سيُطلب المنتج بمواصفة واحدة ثابتة.
        </p>
      ) : null}

      {groups.map((group, groupIndex) => (
        <details
          key={groupIndex}
          open={groupIndex === groups.length - 1}
          className="group border-border bg-surface-muted rounded-lg border"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4">
            <span className="flex min-w-0 items-center gap-2">
              <Icon
                name="chevronDown"
                className="text-primary-400 size-4 shrink-0 transition-transform group-open:rotate-180"
                strokeWidth={2}
              />
              <span className="truncate text-sm font-bold">
                {group.name || `مجموعة ${groupIndex + 1}`}
              </span>
              <span className="text-primary-500 shrink-0 text-xs">
                ({group.values.length} خيار)
              </span>
            </span>

            <span className="text-primary-400 shrink-0 text-xs">
              {OPTION_TYPE_LABELS[group.type]}
            </span>
          </summary>

          <div className="border-border space-y-4 border-t p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <TextInput
                id={`group-name-${groupIndex}`}
                label="اسم المجموعة"
                required
                placeholder="المقاس"
                value={group.name}
                onChange={(event) => {
                  const name = event.target.value;
                  updateGroup(groupIndex, {
                    name,
                    key:
                      group.key === slugify(group.name) || !group.key
                        ? slugify(name)
                        : group.key,
                  });
                }}
              />

              <TextInput
                id={`group-key-${groupIndex}`}
                label="المفتاح"
                required
                placeholder="size"
                value={group.key}
                onChange={(event) => updateGroup(groupIndex, { key: event.target.value })}
                help="يظهر في رسالة واتساب وبنود الطلب. فريد داخل المنتج."
              />

              <Select
                id={`group-type-${groupIndex}`}
                label="نوع الحقل"
                value={group.type}
                onChange={(event) =>
                  updateGroup(groupIndex, { type: event.target.value as OptionType })
                }
              >
                {OPTION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {OPTION_TYPE_LABELS[type]}
                  </option>
                ))}
              </Select>

              <TextInput
                id={`group-help-${groupIndex}`}
                label="نص المساعدة"
                optional
                value={group.helpText}
                onChange={(event) => updateGroup(groupIndex, { helpText: event.target.value })}
              />

              <div className="md:col-span-2">
                <Checkbox
                  id={`group-required-${groupIndex}`}
                  label="اختيار إلزامي"
                  description="لن يتمكّن العميل من إضافة المنتج للسلة قبل اختيار قيمة."
                  checked={group.isRequired}
                  onChange={(event) =>
                    updateGroup(groupIndex, { isRequired: event.target.checked })
                  }
                />
              </div>
            </div>

            <ValuesEditor
              group={group}
              groupIndex={groupIndex}
              onChange={(values) => updateGroup(groupIndex, { values })}
            />

            <div className="border-border flex justify-end border-t pt-4">
              <Button
                size="sm"
                variant="outline"
                icon="trash"
                className="text-danger-600"
                onClick={() => onChange(groups.filter((_, i) => i !== groupIndex))}
              >
                حذف المجموعة
              </Button>
            </div>
          </div>
        </details>
      ))}

      <Button
        variant="outline"
        icon="plus"
        onClick={() =>
          onChange([
            ...groups,
            {
              name: "",
              key: "",
              type: "SELECT",
              helpText: "",
              isRequired: true,
              values: [{ ...EMPTY_OPTION_VALUE, isDefault: true }],
            },
          ])
        }
      >
        إضافة مجموعة خيارات
      </Button>
    </div>
  );
}

function ValuesEditor({
  group,
  groupIndex,
  onChange,
}: {
  group: GroupDraft;
  groupIndex: number;
  onChange: (values: ValueDraft[]) => void;
}) {
  // الحقول الحرّة (نص، تاريخ، رفع ملف) لا تحمل قائمة قيم
  const needsValues = ["SELECT", "RADIO", "COLOR", "CHECKBOX"].includes(group.type);

  if (!needsValues) {
    return (
      <p className="border-border bg-surface text-primary-500 rounded-lg border p-3 text-xs">
        هذا النوع يستقبل إدخالاً حرًّا من العميل ولا يحتاج قائمة قيم.
      </p>
    );
  }

  function update(index: number, changes: Partial<ValueDraft>) {
    onChange(
      group.values.map((value, i) => {
        if (i !== index) {
          // في الاختيار الواحد، تعيين افتراضي جديد يلغي السابق
          if (changes.isDefault && group.type !== "CHECKBOX") {
            return { ...value, isDefault: false };
          }
          return value;
        }
        return { ...value, ...changes };
      }),
    );
  }

  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <h4 className="text-sm font-bold">القيم المتاحة</h4>
        <Button
          size="sm"
          variant="ghost"
          icon="plus"
          onClick={() => onChange([...group.values, { ...EMPTY_OPTION_VALUE }])}
        >
          قيمة
        </Button>
      </div>

      <ul className="space-y-2.5">
        {group.values.map((value, index) => (
          <li
            key={index}
            className="border-border bg-surface grid gap-3 rounded-lg border p-3 lg:grid-cols-[1.4fr_1fr_1.4fr_auto]"
          >
            <TextInput
              id={`value-label-${groupIndex}-${index}`}
              label="الاسم المعروض"
              required
              placeholder="٢٠×٢٠×٨ سم"
              value={value.label}
              onChange={(event) => update(index, { label: event.target.value })}
            />

            <TextInput
              id={`value-modifier-${groupIndex}-${index}`}
              label="معدّل السعر"
              type="number"
              step="0.01"
              value={String(value.priceModifier)}
              onChange={(event) =>
                update(index, { priceModifier: Number(event.target.value) || 0 })
              }
            />

            <Select
              id={`value-mode-${groupIndex}-${index}`}
              label="طريقة التطبيق"
              value={value.priceMode}
              onChange={(event) =>
                update(index, { priceMode: event.target.value as OptionPriceMode })
              }
            >
              {OPTION_PRICE_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {OPTION_PRICE_MODE_LABELS[mode]}
                </option>
              ))}
            </Select>

            <div className="flex items-end gap-1">
              {group.type === "COLOR" ? (
                <input
                  type="color"
                  aria-label="لون العيّنة"
                  value={value.swatchHex || "#000000"}
                  onChange={(event) => update(index, { swatchHex: event.target.value })}
                  className="border-border-strong size-11 cursor-pointer rounded-lg border p-1"
                />
              ) : null}

              <IconButton
                name="trash"
                label="حذف القيمة"
                size="sm"
                variant="outline"
                className="text-danger-600"
                onClick={() => onChange(group.values.filter((_, i) => i !== index))}
              />
            </div>

            <div className="lg:col-span-4">
              <Checkbox
                id={`value-default-${groupIndex}-${index}`}
                label="القيمة الافتراضية"
                checked={value.isDefault}
                onChange={(event) => update(index, { isDefault: event.target.checked })}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

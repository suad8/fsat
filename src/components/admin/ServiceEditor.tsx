"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { saveServiceAction } from "@/app/admin/(dashboard)/actions/content";
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
import { GalleryEditor } from "@/components/admin/GalleryEditor";
import { ImageField } from "@/components/admin/ImageField";
import { Alert } from "@/components/ui/Alert";
import { Button, IconButton } from "@/components/ui/Button";
import { Checkbox, Select, TextArea, TextInput } from "@/components/ui/Field";
import type { ServiceDraft } from "@/lib/admin/drafts";
import { slugify } from "@/lib/utils";

export type { ServiceDraft };

const ICON_CHOICES = [
  { value: "box", label: "صندوق" },
  { value: "cup", label: "كوب" },
  { value: "document", label: "مستند" },
  { value: "sticker", label: "استيكر" },
  { value: "sparkles", label: "بريق (UV)" },
  { value: "layers", label: "طبقات (أكريليك)" },
  { value: "sign", label: "لوحة" },
  { value: "banner", label: "بنر" },
  { value: "shirt", label: "قميص" },
  { value: "gift", label: "هدية" },
  { value: "pen", label: "قلم (تصميم)" },
  { value: "package", label: "طرد" },
];



/** محرّر خدمة. */
export function ServiceEditor({
  initial,
  products,
}: {
  initial: ServiceDraft;
  products: { id: string; name: string }[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [draft, setDraft] = useState<ServiceDraft>(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<string[]>([]);
  const [showErrors, setShowErrors] = useState(false);
  const [saved, setSaved] = useState(false);
  const { dirty, markSaved } = useDirty(draft);

  useUnsavedWarning(dirty && !saved);

  function patch(changes: Partial<ServiceDraft>) {
    setDraft((current) => ({ ...current, ...changes }));
  }

  const required = [
    { id: "title", bad: !draft.title.trim(), message: REQUIRED_MESSAGE },
    { id: "slug", bad: !(draft.slug || slugify(draft.title)).trim(), message: REQUIRED_MESSAGE },
    { id: "shortDescription", bad: !draft.shortDescription.trim(), message: REQUIRED_MESSAGE },
  ];
  const errorFor = (id: string) =>
    showErrors ? required.find((rule) => rule.id === id && rule.bad)?.message : undefined;
  const invalidTotal = showErrors ? required.filter((rule) => rule.bad).length : 0;

  function save() {
    if (pending) return;
    setError(null);
    setIssues([]);

    const bad = required.filter((rule) => rule.bad);
    if (bad.length > 0) {
      setShowErrors(true);
      toast.error("أكمل الحقول المطلوبة", `${bad.length} حقل يحتاج مراجعة قبل الحفظ.`);
      window.setTimeout(() => focusFirstInvalid(bad.map((rule) => rule.id)), 60);
      return;
    }

    startTransition(async () => {
      const result = await saveServiceAction({
        ...draft,
        slug: draft.slug || slugify(draft.title),
        // الأسطر الفارغة تُستبعد قبل الحفظ
        highlights: draft.highlights.map((item) => item.trim()).filter(Boolean),
      });

      if (!result.ok) {
        setError(result.error);
        setIssues(result.issues ?? []);
        toast.error("تعذّر حفظ الخدمة", result.error);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      markSaved(draft);
      setSaved(true);
      toast.success(draft.id ? "تم حفظ التعديلات" : "تمت إضافة الخدمة");
      router.push("/admin/services");
      router.refresh();
    });
  }

  useSaveShortcut(save);

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

      <FormSection id="basics" title="بيانات الخدمة" description="الاسم والوصف كما تراها الزائر." invalidCount={invalidTotal}>
        <div className="grid gap-5 md:grid-cols-2">
          <TextInput
            id="title"
            error={errorFor("title")}
            label="عنوان الخدمة"
            required
            value={draft.title}
            onChange={(event) => {
              const title = event.target.value;
              patch({
                title,
                slug:
                  draft.slug === slugify(draft.title) || !draft.slug
                    ? slugify(title)
                    : draft.slug,
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
          />

          <TextArea
            id="shortDescription"
            error={errorFor("shortDescription")}
            label="وصف مختصر"
            required
            rows={2}
            value={draft.shortDescription}
            onChange={(event) => patch({ shortDescription: event.target.value })}
            help="يظهر في بطاقة الخدمة وفي نتائج البحث."
            wrapperClassName="md:col-span-2"
          />

          <TextArea
            id="description"
            label="الوصف التفصيلي"
            optional
            rows={7}
            value={draft.description}
            onChange={(event) => patch({ description: event.target.value })}
            wrapperClassName="md:col-span-2"
          />

          <Select
            id="iconKey"
            label="الأيقونة"
            value={draft.iconKey}
            onChange={(event) => patch({ iconKey: event.target.value })}
            help="تُعرض في بطاقة الخدمة وفي صفحتها."
          >
            {ICON_CHOICES.map((icon) => (
              <option key={icon.value} value={icon.value}>
                {icon.label}
              </option>
            ))}
          </Select>

          <TextInput
            id="order"
            label="ترتيب العرض"
            type="number"
            value={String(draft.order)}
            onChange={(event) => patch({ order: Number(event.target.value) || 0 })}
          />

          <div className="md:col-span-2">
            <ImageField
              label="صورة الخدمة الرئيسية"
              value={draft.imageUrl}
              onValueChange={(imageUrl) => patch({ imageUrl })}
              folder="services"
              help="تظهر في أعلى صفحة الخدمة."
            />
          </div>

          <TextInput
            id="imageAlt"
            label="النص البديل للصورة"
            optional
            value={draft.imageAlt}
            onChange={(event) => patch({ imageAlt: event.target.value })}
            wrapperClassName="md:col-span-2"
          />
        </div>

        <div className="border-border mt-5 space-y-3 border-t pt-5">
          <Checkbox
            id="isActive"
            label="منشورة في الموقع"
            checked={draft.isActive}
            onChange={(event) => patch({ isActive: event.target.checked })}
          />
          <Checkbox
            id="isFeatured"
            label="تظهر في الصفحة الرئيسية"
            checked={draft.isFeatured}
            onChange={(event) => patch({ isFeatured: event.target.checked })}
          />
        </div>
      </FormSection>

      <FormSection
        id="highlights"
        title="مميّزات الخدمة"
        description="نقاط قصيرة تُعرض كقائمة في صفحة الخدمة."
        summary={`${draft.highlights.filter(Boolean).length} نقطة`}
      >
        <ul className="space-y-2.5">
          {draft.highlights.map((highlight, index) => (
            <li key={index} className="flex items-end gap-2">
              <TextInput
                id={`highlight-${index}`}
                label={`النقطة ${index + 1}`}
                value={highlight}
                onChange={(event) =>
                  patch({
                    highlights: draft.highlights.map((item, i) =>
                      i === index ? event.target.value : item,
                    ),
                  })
                }
                wrapperClassName="flex-1"
              />
              <IconButton
                name="trash"
                label={`حذف النقطة ${index + 1}`}
                size="sm"
                variant="outline"
                className="text-danger-600"
                onClick={() =>
                  patch({ highlights: draft.highlights.filter((_, i) => i !== index) })
                }
              />
            </li>
          ))}
        </ul>

        <Button
          variant="outline"
          size="sm"
          icon="plus"
          className="mt-4"
          onClick={() => patch({ highlights: [...draft.highlights, ""] })}
        >
          إضافة نقطة
        </Button>
      </FormSection>

      <FormSection id="gallery" title="نماذج من التنفيذ" summary={`${draft.images.length} صورة`}>
        <GalleryEditor
          images={draft.images}
          onChange={(images) => patch({ images })}
          folder="services"
          label="صور الخدمة"
        />
      </FormSection>

      <FormSection id="links" title="المنتجات المرتبطة وتحسين محركات البحث" defaultOpen={false} summary="المنتجات المرتبطة وعنوان ووصف البحث">
        <fieldset className="mb-5">
          <legend className="text-primary-800 mb-2.5 text-sm font-bold">
            المنتجات التي تظهر أسفل صفحة الخدمة
          </legend>

          {products.length === 0 ? (
            <p className="text-primary-500 text-sm">لا توجد منتجات بعد.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <Checkbox
                  key={product.id}
                  id={`product-${product.id}`}
                  label={product.name}
                  checked={draft.productIds.includes(product.id)}
                  onChange={(event) =>
                    patch({
                      productIds: event.target.checked
                        ? [...draft.productIds, product.id]
                        : draft.productIds.filter((id) => id !== product.id),
                    })
                  }
                />
              ))}
            </div>
          )}
        </fieldset>

        <div className="border-border grid gap-5 border-t pt-5 md:grid-cols-2">
          <TextInput
            id="seoTitle"
            label="عنوان الصفحة (SEO)"
            optional
            value={draft.seoTitle}
            onChange={(event) => patch({ seoTitle: event.target.value })}
          />
          <TextArea
            id="seoDescription"
            label="وصف الصفحة (SEO)"
            optional
            rows={3}
            value={draft.seoDescription}
            onChange={(event) => patch({ seoDescription: event.target.value })}
          />
        </div>
      </FormSection>

      <SaveBar
        pending={pending}
        dirty={draft.id ? dirty : undefined}
        onSave={save}
        saveLabel={draft.id ? "حفظ التعديلات" : "إضافة الخدمة"}
        cancelHref="/admin/services"
        errorCount={invalidTotal}
        onShowErrors={() => focusFirstInvalid(required.filter((rule) => rule.bad).map((rule) => rule.id))}
      />
    </div>
  );
}

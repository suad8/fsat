"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { saveServiceAction } from "@/app/admin/(dashboard)/actions/content";
import { AdminCard } from "@/components/admin/AdminUi";
import { GalleryEditor } from "@/components/admin/GalleryEditor";
import { ImageField } from "@/components/admin/ImageField";
import { Alert } from "@/components/ui/Alert";
import { Button, ButtonLink, IconButton } from "@/components/ui/Button";
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
  const [draft, setDraft] = useState<ServiceDraft>(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<string[]>([]);

  function patch(changes: Partial<ServiceDraft>) {
    setDraft((current) => ({ ...current, ...changes }));
  }

  function save() {
    setError(null);
    setIssues([]);

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
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      router.push("/admin/services");
      router.refresh();
    });
  }

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

      <AdminCard title="بيانات الخدمة">
        <div className="grid gap-5 md:grid-cols-2">
          <TextInput
            id="title"
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
            label="الرابط (slug)"
            required
            value={draft.slug}
            onChange={(event) => patch({ slug: event.target.value })}
          />

          <TextArea
            id="shortDescription"
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
      </AdminCard>

      <AdminCard
        title="مميّزات الخدمة"
        description="نقاط قصيرة تُعرض كقائمة في صفحة الخدمة."
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
      </AdminCard>

      <AdminCard title="نماذج من التنفيذ">
        <GalleryEditor
          images={draft.images}
          onChange={(images) => patch({ images })}
          folder="services"
          label="صور الخدمة"
        />
      </AdminCard>

      <AdminCard title="المنتجات المرتبطة وتحسين محركات البحث">
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
      </AdminCard>

      <div className="border-border bg-surface sticky bottom-0 flex flex-wrap gap-3 border-t p-4">
        <Button size="lg" onClick={save} disabled={pending} icon={pending ? undefined : "check"}>
          {pending ? "جارٍ الحفظ…" : draft.id ? "حفظ التعديلات" : "إضافة الخدمة"}
        </Button>
        <ButtonLink href="/admin/services" variant="outline" size="lg">
          إلغاء
        </ButtonLink>
      </div>
    </div>
  );
}

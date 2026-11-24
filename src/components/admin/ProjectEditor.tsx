"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { saveProjectAction } from "@/app/admin/(dashboard)/actions/content";
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
import { Alert } from "@/components/ui/Alert";

import { Checkbox, Select, TextArea, TextInput } from "@/components/ui/Field";
import type { ProjectDraft } from "@/lib/admin/drafts";
import { slugify } from "@/lib/utils";

export type { ProjectDraft };



/** محرّر مشروع في معرض الأعمال. */
export function ProjectEditor({
  initial,
  categories,
  products,
}: {
  initial: ProjectDraft;
  categories: { id: string; name: string }[];
  products: { id: string; name: string }[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [draft, setDraft] = useState<ProjectDraft>(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<string[]>([]);
  const [showErrors, setShowErrors] = useState(false);
  const [saved, setSaved] = useState(false);
  const { dirty, markSaved } = useDirty(draft);

  useUnsavedWarning(dirty && !saved);

  function patch(changes: Partial<ProjectDraft>) {
    setDraft((current) => ({ ...current, ...changes }));
  }

  const required = [
    { id: "title", bad: !draft.title.trim(), message: REQUIRED_MESSAGE },
    { id: "slug", bad: !(draft.slug || slugify(draft.title)).trim(), message: REQUIRED_MESSAGE },
    { id: "categoryId", bad: !draft.categoryId, message: "اختر تصنيف المشروع" },
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
      const result = await saveProjectAction({
        ...draft,
        slug: draft.slug || slugify(draft.title),
      });

      if (!result.ok) {
        setError(result.error);
        setIssues(result.issues ?? []);
        toast.error("تعذّر حفظ المشروع", result.error);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      markSaved(draft);
      setSaved(true);
      toast.success(draft.id ? "تم حفظ التعديلات" : "تمت إضافة المشروع");
      router.push("/admin/portfolio");
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

      <FormSection id="basics" title="بيانات المشروع" description="الاسم والتصنيف والوصف." invalidCount={invalidTotal}>
        <div className="grid gap-5 md:grid-cols-2">
          <TextInput
            id="title"
            error={errorFor("title")}
            label="عنوان المشروع"
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

          <Select
            id="categoryId"
            error={errorFor("categoryId")}
            label="تصنيف المشروع"
            required
            value={draft.categoryId}
            onChange={(event) => patch({ categoryId: event.target.value })}
          >
            <option value="" disabled>
              اختر التصنيف
            </option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>

          <TextInput
            id="clientName"
            label="اسم العميل"
            optional
            value={draft.clientName}
            onChange={(event) => patch({ clientName: event.target.value })}
            help="اتركه فارغًا إن لم يوافق العميل على ذكر اسمه."
          />

          <TextArea
            id="summary"
            label="ملخّص المشروع"
            optional
            rows={2}
            value={draft.summary}
            onChange={(event) => patch({ summary: event.target.value })}
            help="يظهر في بطاقة المشروع داخل المعرض."
            wrapperClassName="md:col-span-2"
          />

          <TextArea
            id="description"
            label="وصف تفصيلي"
            optional
            rows={5}
            value={draft.description}
            onChange={(event) => patch({ description: event.target.value })}
            wrapperClassName="md:col-span-2"
          />
        </div>
      </FormSection>

      <FormSection
        id="specs"
        title="مواصفات التنفيذ"
        description="هذه التفاصيل هي ما يقنع العميل المحتمل بجودة العمل — لا تتركها فارغة."
      >
        <div className="grid gap-5 md:grid-cols-3">
          <TextInput
            id="materials"
            label="الخامات المستخدمة"
            optional
            placeholder="كرتون مقوّى ٣٥٠ جرام، سلوفان مطفي"
            value={draft.materials}
            onChange={(event) => patch({ materials: event.target.value })}
          />

          <TextInput
            id="dimensions"
            label="المقاسات"
            optional
            placeholder="٢٠×٢٠×٨ سم"
            value={draft.dimensions}
            onChange={(event) => patch({ dimensions: event.target.value })}
          />

          <TextInput
            id="techniques"
            label="تقنيات التنفيذ"
            optional
            placeholder="طباعة أوفست، قص ليزر"
            value={draft.techniques}
            onChange={(event) => patch({ techniques: event.target.value })}
          />

          <TextInput
            id="completedAt"
            label="تاريخ التنفيذ"
            type="date"
            optional
            value={draft.completedAt}
            onChange={(event) => patch({ completedAt: event.target.value })}
          />

          <Select
            id="relatedProductId"
            label="منتج مرتبط"
            value={draft.relatedProductId}
            onChange={(event) => patch({ relatedProductId: event.target.value })}
            help="يظهر كزر «اطلبه من المتجر» في صفحة المشروع."
          >
            <option value="">— بدون —</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
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
        </div>

        <div className="border-border mt-5 space-y-3 border-t pt-5">
          <Checkbox
            id="isActive"
            label="منشور في المعرض"
            checked={draft.isActive}
            onChange={(event) => patch({ isActive: event.target.checked })}
          />
          <Checkbox
            id="isFeatured"
            label="مشروع مميّز"
            description="يظهر أولاً في المعرض وفي الصفحة الرئيسية."
            checked={draft.isFeatured}
            onChange={(event) => patch({ isFeatured: event.target.checked })}
          />
        </div>
      </FormSection>

      <FormSection
        id="gallery"
        title="صور المشروع"
        description="حدّد مرحلة كل صورة — «النتيجة النهائية» تظهر أولاً، و«قبل/بعد» و«مراحل التنفيذ» تُعرض في أقسام منفصلة."
        summary={`${draft.images.length} صورة`}
      >
        <GalleryEditor
          images={draft.images}
          onChange={(images) => patch({ images })}
          folder="projects"
          withStages
          label="صور المشروع"
        />
      </FormSection>

      <FormSection id="seo" title="تحسين محركات البحث" defaultOpen={false} summary="عنوان ووصف نتائج البحث">
        <div className="grid gap-5 md:grid-cols-2">
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
        saveLabel={draft.id ? "حفظ التعديلات" : "إضافة المشروع"}
        cancelHref="/admin/portfolio"
        errorCount={invalidTotal}
        onShowErrors={() => focusFirstInvalid(required.filter((rule) => rule.bad).map((rule) => rule.id))}
      />
    </div>
  );
}

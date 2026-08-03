"use client";

import Image from "next/image";
import { useState } from "react";

import { IconButton } from "@/components/ui/Button";
import { Select, TextInput } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import {
  PROJECT_IMAGE_STAGE_LABELS,
  PROJECT_IMAGE_STAGES,
  type ProjectImageStage,
} from "@/lib/constants";

export type GalleryImage = {
  url: string;
  alt: string;
  caption?: string;
  stage?: ProjectImageStage;
};

/**
 * محرّر معرض صور.
 *
 * مشترك بين محرّري المشاريع والخدمات. حقل المرحلة (قبل/بعد/مرحلة تنفيذ)
 * يظهر فقط عند تفعيله، فالخدمات لا تحتاجه.
 */
export function GalleryEditor({
  images,
  onChange,
  folder,
  withStages = false,
  label = "الصور",
  help,
}: {
  images: GalleryImage[];
  onChange: (images: GalleryImage[]) => void;
  folder: string;
  withStages?: boolean;
  label?: string;
  help?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputId = `gallery-${folder}`;

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      const body = new FormData();
      for (const file of Array.from(files)) body.append("files", file);
      body.append("folder", folder);

      const response = await fetch("/api/admin/upload", { method: "POST", body });
      const result = await response.json();

      if (!response.ok || !result.ok) {
        setError(result.message ?? "تعذّر رفع الصور.");
        return;
      }

      onChange([
        ...images,
        ...result.files.map((file: { url: string }) => ({
          url: file.url,
          alt: "",
          caption: "",
          stage: "RESULT" as ProjectImageStage,
        })),
      ]);
    } catch {
      setError("تعذّر الاتصال بالخادم أثناء الرفع.");
    } finally {
      setUploading(false);
    }
  }

  function update(index: number, changes: Partial<GalleryImage>) {
    onChange(images.map((image, i) => (i === index ? { ...image, ...changes } : image)));
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
        htmlFor={inputId}
        className="border-border-strong bg-surface-muted hover:border-primary-400 block cursor-pointer rounded-lg border-2 border-dashed p-5 text-center transition-colors"
      >
        <Icon name="upload" className="text-primary-400 mx-auto size-7" strokeWidth={1.4} />
        <span className="text-primary-700 mt-2 block text-sm font-bold">
          {uploading ? "جارٍ الرفع…" : `اضغط لرفع ${label}`}
        </span>
        <span className="text-primary-500 mt-1 block text-xs">
          {help ?? "JPG أو PNG أو WEBP — تُحوَّل تلقائيًا إلى WebP"}
        </span>
        <input
          id={inputId}
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

              <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
                <TextInput
                  id={`img-alt-${folder}-${index}`}
                  label={index === 0 ? "النص البديل (الصورة الرئيسية)" : "النص البديل"}
                  required
                  value={image.alt}
                  onChange={(event) => update(index, { alt: event.target.value })}
                  help="صف ما تظهره الصورة."
                />

                <TextInput
                  id={`img-caption-${folder}-${index}`}
                  label="التعليق"
                  optional
                  value={image.caption ?? ""}
                  onChange={(event) => update(index, { caption: event.target.value })}
                />

                {withStages ? (
                  <Select
                    id={`img-stage-${folder}-${index}`}
                    label="مرحلة الصورة"
                    value={image.stage ?? "RESULT"}
                    onChange={(event) =>
                      update(index, { stage: event.target.value as ProjectImageStage })
                    }
                    help="تُجمَّع الصور في الصفحة حسب مرحلتها."
                    wrapperClassName="sm:col-span-2"
                  >
                    {PROJECT_IMAGE_STAGES.map((stage) => (
                      <option key={stage} value={stage}>
                        {PROJECT_IMAGE_STAGE_LABELS[stage]}
                      </option>
                    ))}
                  </Select>
                ) : null}
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

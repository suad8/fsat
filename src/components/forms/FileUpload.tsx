"use client";

import { useId, useRef, useState } from "react";

import { Icon } from "@/components/ui/Icon";
import { MAX_DESIGN_SIZE, MAX_FILES_PER_REQUEST } from "@/lib/constants";
import { cn, formatFileSize } from "@/lib/utils";

export type UploadedFile = {
  name: string;
  url: string;
  size: number;
  mimeType: string;
  /** يميّز الغرض من الملف في طلب عرض السعر. */
  kind?: "DESIGN" | "LOGO" | "REFERENCE";
};

/**
 * رفع الملفات مع معاينة وحذف.
 *
 * الرفع يتم فور الاختيار — لا عند إرسال النموذج — حتى يرى العميل نجاح الرفع
 * مبكرًا ولا يفاجأ برسالة خطأ بعد تعبئة كل الحقول.
 *
 * التحقق النهائي من نوع الملف وحجمه يتم على الخادم؛ الفحص هنا لتحسين التجربة فقط.
 */
export function FileUpload({
  label,
  help,
  kind = "REFERENCE",
  accept = ".pdf,.ai,.psd,.eps,.zip,.jpg,.jpeg,.png,.webp",
  maxFiles = MAX_FILES_PER_REQUEST,
  value,
  onChange,
  optional = true,
}: {
  label: string;
  help?: string;
  kind?: UploadedFile["kind"];
  accept?: string;
  maxFiles?: number;
  value: UploadedFile[];
  onChange: (files: UploadedFile[]) => void;
  optional?: boolean;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  async function upload(files: FileList | File[]) {
    setError(null);

    const list = Array.from(files);
    if (list.length === 0) return;

    if (value.length + list.length > maxFiles) {
      setError(`الحد الأقصى ${maxFiles} ملفات.`);
      return;
    }

    const oversized = list.find((file) => file.size > MAX_DESIGN_SIZE);
    if (oversized) {
      setError(
        `الملف "${oversized.name}" يتجاوز ${formatFileSize(MAX_DESIGN_SIZE)}.`,
      );
      return;
    }

    setUploading(true);

    try {
      const body = new FormData();
      for (const file of list) body.append("files", file);
      body.append("kind", "design");

      const response = await fetch("/api/upload", { method: "POST", body });
      const result = await response.json();

      if (!response.ok || !result.ok) {
        setError(result.message ?? "تعذّر رفع الملفات.");
        return;
      }

      const uploaded: UploadedFile[] = result.files.map(
        (file: Omit<UploadedFile, "kind">) => ({ ...file, kind }),
      );
      onChange([...value, ...uploaded]);

      // رسائل جزئية عندما ينجح بعض الملفات ويفشل بعضها
      if (Array.isArray(result.errors) && result.errors.length > 0) {
        setError(result.errors[0].error);
      }
    } catch {
      setError("تعذّر الاتصال بالخادم أثناء الرفع.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function remove(url: string) {
    onChange(value.filter((file) => file.url !== url));
  }

  return (
    <div>
      <label htmlFor={inputId} className="text-primary-800 mb-1.5 block text-sm font-bold">
        {label}
        {optional ? (
          <span className="text-primary-400 ms-1.5 text-xs font-medium">(اختياري)</span>
        ) : null}
      </label>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void upload(event.dataTransfer.files);
        }}
        className={cn(
          "rounded-lg border-2 border-dashed p-5 text-center transition-colors",
          dragging
            ? "border-accent-600 bg-accent-50/60"
            : "border-border-strong bg-surface-muted hover:border-primary-400",
        )}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          multiple={maxFiles > 1}
          accept={accept}
          disabled={uploading || value.length >= maxFiles}
          onChange={(event) => {
            if (event.target.files) void upload(event.target.files);
          }}
          aria-describedby={`${inputId}-help`}
          className={cn(
            "text-primary-600 w-full cursor-pointer text-sm",
            "file:me-3 file:cursor-pointer file:rounded-md file:border-0",
            "file:bg-primary-950 file:px-4 file:py-2 file:text-sm file:font-bold file:text-white",
            "hover:file:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-50",
          )}
        />

        <p id={`${inputId}-help`} className="text-primary-500 mt-3 text-xs leading-relaxed">
          {help ?? "اسحب الملفات هنا أو اضغط للاختيار."}
          <span className="mt-1 block">
            الصيغ المقبولة: PDF، AI، PSD، EPS، ZIP، JPG، PNG — حتى{" "}
            {formatFileSize(MAX_DESIGN_SIZE)} للملف.
          </span>
        </p>
      </div>

      {uploading ? (
        <p className="text-primary-600 mt-2 flex items-center gap-2 text-xs font-bold">
          <span
            aria-hidden="true"
            className="border-primary-300 border-t-accent-600 size-3.5 animate-spin rounded-full border-2"
          />
          جارٍ رفع الملفات…
        </p>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="text-danger-600 mt-2 flex items-center gap-1.5 text-xs font-bold"
        >
          <Icon name="alert" className="size-3.5" strokeWidth={2} />
          {error}
        </p>
      ) : null}

      {value.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {value.map((file) => (
            <li
              key={file.url}
              className="border-border bg-surface flex items-center gap-3 rounded-lg border p-2.5"
            >
              <Icon name="file" className="text-primary-400 size-5 shrink-0" />

              <span className="min-w-0 flex-1">
                <span className="text-primary-800 block truncate text-sm font-medium">
                  {file.name}
                </span>
                <span className="text-primary-500 block text-xs">
                  {formatFileSize(file.size)}
                </span>
              </span>

              <button
                type="button"
                onClick={() => remove(file.url)}
                aria-label={`حذف الملف ${file.name}`}
                className="text-primary-400 hover:bg-danger-50 hover:text-danger-600 focus-visible:outline-danger-600 grid size-8 shrink-0 place-items-center rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                <Icon name="trash" className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

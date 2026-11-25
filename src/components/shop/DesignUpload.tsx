"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Icon } from "@/components/ui/Icon";
import type { CartItemFile } from "@/components/cart/CartProvider";
import { MAX_DESIGN_SIZE } from "@/lib/constants";
import { cn, formatFileSize } from "@/lib/utils";

const ACCEPT = ".pdf,.ai,.psd,.eps,.zip,.jpg,.jpeg,.png,.webp";
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

type Entry = CartItemFile & { id: string; preview: string | null };

type Pending = {
  id: string;
  name: string;
  size: number;
  progress: number;
  preview: string | null;
};

/**
 * رفع التصميم: منطقة واضحة بزر عربي، معاينة مصغّرة للصور، اسم الملف وحجمه،
 * شريط تقدّم حقيقي (XHR)، وحدّ الحجم مكتوب قبل الاختيار لا بعده.
 *
 * يحلّ مكان مدخل الملف الأصلي (الذي يعرض نصًا إنجليزيًا) داخل المُهيّئ.
 * التحقق النهائي من النوع والحجم على الخادم دائمًا (src/lib/upload.ts).
 */
export function DesignUpload({
  label,
  help,
  required,
  files,
  onChange,
  maxFiles = 3,
  error,
}: {
  label: string;
  help?: string | null;
  required?: boolean;
  files: CartItemFile[];
  onChange: (files: CartItemFile[]) => void;
  maxFiles?: number;
  error?: string | null;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  // معاينات الصور تُحفظ محليًا فقط (بحسب الرابط) ولا تُرسل لأي مكان
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const previewsRef = useRef(previews);
  useEffect(() => {
    previewsRef.current = previews;
  }, [previews]);
  useEffect(
    () => () => {
      for (const url of Object.values(previewsRef.current)) URL.revokeObjectURL(url);
    },
    [],
  );

  const entries: Entry[] = files.map((file) => ({
    ...file,
    id: file.url,
    preview: previews[file.url] ?? null,
  }));
  const busy = pending.length > 0;
  const full = files.length + pending.length >= maxFiles;

  function sendOne(file: File): Promise<CartItemFile | string> {
    return new Promise((resolve) => {
      const id = `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 7)}`;
      const preview = IMAGE_TYPES.includes(file.type) ? URL.createObjectURL(file) : null;

      setPending((current) => [...current, { id, name: file.name, size: file.size, progress: 0, preview }]);

      const done = (value: CartItemFile | string) => {
        setPending((current) => current.filter((entry) => entry.id !== id));
        if (typeof value === "string" && preview) URL.revokeObjectURL(preview);
        if (typeof value !== "string" && preview) {
          setPreviews((current) => ({ ...current, [value.url]: preview }));
        }
        resolve(value);
      };

      const body = new FormData();
      body.append("files", file);
      body.append("kind", "design");

      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/upload");
      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        const progress = Math.round((event.loaded / event.total) * 100);
        setPending((current) =>
          current.map((entry) => (entry.id === id ? { ...entry, progress } : entry)),
        );
      };
      xhr.onerror = () => done("انقطع الاتصال أثناء الرفع. تحقّق من الإنترنت وأعد المحاولة.");
      xhr.onload = () => {
        try {
          const result = JSON.parse(xhr.responseText) as {
            ok: boolean;
            message?: string;
            files?: { name: string; url: string; size: number; mimeType: string }[];
          };
          const uploaded = result.files?.[0];
          if (xhr.status >= 200 && xhr.status < 300 && result.ok && uploaded) {
            done({
              name: uploaded.name,
              url: uploaded.url,
              size: uploaded.size,
              mimeType: uploaded.mimeType,
            });
          } else {
            done(result.message ?? `تعذّر رفع «${file.name}».`);
          }
        } catch {
          done(`تعذّر رفع «${file.name}».`);
        }
      };
      xhr.send(body);
    });
  }

  async function handle(list: FileList | File[]) {
    setMessage(null);
    const incoming = Array.from(list);
    if (incoming.length === 0) return;

    const room = maxFiles - files.length - pending.length;
    if (room <= 0) {
      setMessage(`الحد الأقصى ${maxFiles} ملفات لكل بند. احذف ملفًا لإضافة غيره.`);
      return;
    }

    const accepted: File[] = [];
    const problems: string[] = [];
    for (const file of incoming.slice(0, room)) {
      if (file.size > MAX_DESIGN_SIZE) {
        problems.push(
          `«${file.name}» حجمه ${formatFileSize(file.size)} ويتجاوز الحد (${formatFileSize(MAX_DESIGN_SIZE)}). صغّره أو أرسله لنا على واتساب.`,
        );
      } else if (file.size === 0) {
        problems.push(`«${file.name}» ملف فارغ.`);
      } else {
        accepted.push(file);
      }
    }
    if (incoming.length > room) {
      problems.push(`أُضيف أول ${room} من الملفات فقط (الحد ${maxFiles}).`);
    }

    const results = await Promise.all(accepted.map(sendOne));
    const ok = results.filter((entry): entry is CartItemFile => typeof entry !== "string");
    for (const entry of results) if (typeof entry === "string") problems.push(entry);

    if (ok.length > 0) onChange([...files, ...ok]);
    if (problems.length > 0) setMessage(problems.join(" "));
    if (inputRef.current) inputRef.current.value = "";
  }

  function remove(url: string) {
    const preview = previews[url];
    if (preview) URL.revokeObjectURL(preview);
    setPreviews((current) => {
      const next = { ...current };
      delete next[url];
      return next;
    });
    onChange(files.filter((file) => file.url !== url));
    setMessage(null);
  }

  const shownError = message ?? error ?? null;

  return (
    <div>
      <label htmlFor={inputId} className="text-primary-800 mb-2 block text-sm font-bold">
        {label}
        {required ? (
          <span className="text-danger-600 ms-1" aria-hidden="true">
            *
          </span>
        ) : (
          <span className="text-primary-400 ms-1.5 text-xs font-medium">(اختياري)</span>
        )}
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
          void handle(event.dataTransfer.files);
        }}
        className={cn(
          "rounded-2xl border-2 border-dashed p-5 text-center transition-colors",
          dragging
            ? "border-accent-600 bg-accent-50/70"
            : error
              ? "border-danger-500 bg-danger-50/40"
              : "border-border-strong bg-surface-muted hover:border-primary-400",
        )}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          multiple={maxFiles > 1}
          accept={ACCEPT}
          disabled={full}
          onChange={(event) => {
            if (event.target.files) void handle(event.target.files);
          }}
          aria-describedby={`${inputId}-help`}
          className="sr-only"
        />

        <span className="bg-ink text-accent-400 mx-auto mb-3 grid size-12 place-items-center rounded-xl">
          <Icon name="upload" className="size-5" />
        </span>

        <label
          htmlFor={inputId}
          className={cn(
            "border-border-strong text-primary-950 inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border bg-surface px-5 text-sm font-bold transition-colors hover:bg-surface-sunken",
            "has-[:disabled]:opacity-50",
            full && "pointer-events-none opacity-50",
          )}
        >
          {busy ? "جارٍ الرفع…" : files.length > 0 ? "إضافة ملف آخر" : "اختر ملف التصميم"}
        </label>

        <p id={`${inputId}-help`} className="text-primary-500 mt-3 text-xs leading-relaxed">
          {help ?? "ارفع شعارك أو تصميمك الجاهز، أو اسحب الملف إلى هنا."}
          <span className="mt-1 block">
            PDF · AI · PSD · EPS · ZIP · JPG · PNG — حتى {formatFileSize(MAX_DESIGN_SIZE)} للملف،
            وبحد أقصى {maxFiles} ملفات. ليس لديك تصميم؟ اتركه وسنراجع معك.
          </span>
        </p>
      </div>

      {pending.length > 0 || entries.length > 0 ? (
        <ul className="mt-3 space-y-2" aria-live="polite">
          {entries.map((file) => (
            <FileRow
              key={file.id}
              name={file.name}
              size={file.size}
              preview={file.preview}
              onRemove={() => remove(file.url)}
            />
          ))}
          {pending.map((file) => (
            <FileRow
              key={file.id}
              name={file.name}
              size={file.size}
              preview={file.preview}
              progress={file.progress}
            />
          ))}
        </ul>
      ) : null}

      {shownError ? (
        <p role="alert" className="text-danger-600 mt-2 flex items-start gap-1.5 text-xs font-bold">
          <Icon name="alert" className="mt-0.5 size-3.5 shrink-0" strokeWidth={2} />
          {shownError}
        </p>
      ) : null}
    </div>
  );
}

function FileRow({
  name,
  size,
  preview,
  progress,
  onRemove,
}: {
  name: string;
  size: number;
  preview: string | null;
  progress?: number;
  onRemove?: () => void;
}) {
  const uploading = progress !== undefined;
  return (
    <li className="border-border bg-surface flex items-center gap-3 rounded-xl border p-2.5">
      <span className="bg-surface-sunken text-primary-400 grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- معاينة محلية blob لا تمر بمحسّن الصور
          <img src={preview} alt="" className="size-full object-cover" />
        ) : (
          <Icon name="file" className="size-5" />
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="text-primary-900 block truncate text-sm font-medium" dir="auto">
          {name}
        </span>
        {uploading ? (
          <span className="mt-1.5 flex items-center gap-2">
            <span
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`رفع ${name}`}
              className="bg-surface-sunken h-1.5 flex-1 overflow-hidden rounded-full"
            >
              <span
                className="bg-accent-500 block h-full rounded-full transition-[width] duration-200"
                style={{ width: `${progress}%` }}
              />
            </span>
            <span className="text-primary-500 w-9 text-[0.7rem] tabular-nums">{progress}٪</span>
          </span>
        ) : (
          <span className="text-primary-500 flex items-center gap-1.5 text-xs">
            <Icon name="check" className="text-success-600 size-3.5" strokeWidth={2.5} />
            {formatFileSize(size)} — تم الرفع
          </span>
        )}
      </span>

      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`حذف الملف ${name}`}
          className="text-primary-400 hover:bg-danger-50 hover:text-danger-600 focus-visible:outline-danger-600 grid size-11 shrink-0 place-items-center rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <Icon name="trash" className="size-4.5" />
        </button>
      ) : null}
    </li>
  );
}

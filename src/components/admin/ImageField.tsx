"use client";

import Image from "next/image";
import { useRef, useState } from "react";

import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

/**
 * حقل صورة برفع مباشر.
 *
 * القيمة المخزّنة هي رابط الصورة، ويُحفظ في حقل مخفي حتى يُرسل مع النموذج
 * عاديًا دون الحاجة لإدارة حالة النموذج كاملة على العميل.
 */
export function ImageField({
  name,
  label,
  defaultValue,
  value,
  onValueChange,
  folder = "uploads",
  help,
}: {
  /** اسم الحقل المخفي — يُستخدم في النماذج التي تُرسل بـ FormData. */
  name?: string;
  label: string;
  defaultValue?: string | null;
  /** وضع مُتحكَّم به — للمحرّرات التي تدير حالتها بنفسها وترسل JSON. */
  value?: string;
  onValueChange?: (url: string) => void;
  folder?: string;
  help?: string;
}) {
  const controlled = value !== undefined;
  const [internal, setInternal] = useState(defaultValue ?? "");
  const url = controlled ? value : internal;

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function setUrl(next: string) {
    if (controlled) onValueChange?.(next);
    else setInternal(next);
  }

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      const body = new FormData();
      body.append("files", files[0]);
      body.append("folder", folder);

      const response = await fetch("/api/admin/upload", { method: "POST", body });
      const result = await response.json();

      if (!response.ok || !result.ok) {
        setError(result.message ?? "تعذّر رفع الصورة.");
        return;
      }

      setUrl(result.files[0].url);
    } catch {
      setError("تعذّر الاتصال بالخادم أثناء الرفع.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <span className="text-primary-800 mb-1.5 block text-sm font-bold">{label}</span>

      {/* في النماذج المبنية على FormData، الرابط يُرسل عبر هذا الحقل المخفي */}
      {name ? <input type="hidden" name={name} value={url} /> : null}

      <div className="flex items-start gap-4">
        <div
          className={cn(
            "border-border-strong bg-surface-sunken relative size-24 shrink-0 overflow-hidden rounded-lg border",
            !url && "border-dashed",
          )}
        >
          {url ? (
            <Image src={url} alt="" fill sizes="96px" className="object-cover" />
          ) : (
            <span className="text-primary-300 grid h-full place-items-center">
              <Icon name="image" className="size-7" strokeWidth={1.3} />
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            disabled={uploading}
            onChange={(event) => void upload(event.target.files)}
            aria-label={`رفع ${label}`}
            className={cn(
              "text-primary-600 w-full text-xs",
              "file:me-2 file:cursor-pointer file:rounded-md file:border-0",
              "file:bg-primary-950 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white",
              "hover:file:bg-primary-800 disabled:opacity-50",
            )}
          />

          {uploading ? (
            <p className="text-primary-600 mt-2 flex items-center gap-1.5 text-xs font-bold">
              <span
                aria-hidden="true"
                className="border-primary-300 border-t-accent-600 size-3 animate-spin rounded-full border-2"
              />
              جارٍ الرفع…
            </p>
          ) : null}

          {error ? (
            <p role="alert" className="text-danger-600 mt-2 text-xs font-bold">
              {error}
            </p>
          ) : null}

          {url ? (
            <button
              type="button"
              onClick={() => setUrl("")}
              className="text-danger-600 hover:text-danger-700 mt-2 text-xs font-bold transition-colors"
            >
              إزالة الصورة
            </button>
          ) : null}

          {help ? (
            <p className="text-primary-500 mt-2 text-xs leading-relaxed">{help}</p>
          ) : null}

          <p className="text-primary-400 mt-1 text-[0.7rem]">
            تُحوَّل الصور تلقائيًا إلى WebP وتُصغَّر إلى ٢٤٠٠ بكسل كحد أقصى.
          </p>
        </div>
      </div>
    </div>
  );
}

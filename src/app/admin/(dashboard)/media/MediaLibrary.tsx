"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deleteMediaAction } from "@/app/admin/(dashboard)/actions/media";
import { AdminEmpty } from "@/components/admin/AdminUi";
import { Alert } from "@/components/ui/Alert";
import { Icon } from "@/components/ui/Icon";
import { formatDate, formatFileSize } from "@/lib/utils";

export type MediaItem = {
  id: string;
  url: string;
  originalName: string;
  size: number;
  width: number | null;
  height: number | null;
  folder: string;
  createdAt: Date;
};

const FOLDER_LABELS: Record<string, string> = {
  products: "المنتجات",
  projects: "معرض الأعمال",
  services: "الخدمات",
  equipment: "المعدات",
  brand: "الهوية",
  customer: "مرفقات العملاء",
  uploads: "عام",
};

/** مكتبة الصور — رفع، معاينة، نسخ الرابط، وحذف. */
export function MediaLibrary({ items }: { items: MediaItem[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      const body = new FormData();
      for (const file of Array.from(files)) body.append("files", file);
      body.append("folder", "uploads");

      const response = await fetch("/api/admin/upload", { method: "POST", body });
      const result = await response.json();

      if (!response.ok || !result.ok) {
        setError(result.message ?? "تعذّر رفع الصور.");
        return;
      }

      router.refresh();
    } catch {
      setError("تعذّر الاتصال بالخادم أثناء الرفع.");
    } finally {
      setUploading(false);
    }
  }

  function remove(item: MediaItem) {
    if (!confirm(`هل تريد حذف «${item.originalName}»؟`)) return;

    startTransition(async () => {
      const result = await deleteMediaAction(item.id);
      if (!result.ok) {
        setError(result.error ?? "تعذّر الحذف.");
        return;
      }
      setError(null);
      router.refresh();
    });
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(url);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setError("تعذّر نسخ الرابط. انسخه يدويًا من خصائص الصورة.");
    }
  }

  return (
    <div className="space-y-5">
      {error ? (
        <Alert tone="danger" live>
          {error}
        </Alert>
      ) : null}

      <label
        htmlFor="media-upload"
        className="border-border-strong bg-surface hover:border-primary-400 block cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-colors"
      >
        <Icon name="upload" className="text-primary-400 mx-auto size-8" strokeWidth={1.4} />
        <span className="text-primary-800 mt-2 block font-bold">
          {uploading ? "جارٍ الرفع…" : "ارفع صورًا إلى المكتبة"}
        </span>
        <span className="text-primary-500 mt-1 block text-xs">
          JPG أو PNG أو WEBP — تُحوَّل تلقائيًا إلى WebP وتُصغَّر إلى ٢٤٠٠ بكسل
        </span>
        <input
          id="media-upload"
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/avif"
          disabled={uploading}
          onChange={(event) => void upload(event.target.files)}
          className="sr-only"
        />
      </label>

      {items.length === 0 ? (
        <AdminEmpty
          icon="image"
          title="المكتبة فارغة"
          description="الصور التي ترفعها من شاشات المنتجات والأعمال والخدمات تظهر هنا تلقائيًا."
        />
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {items.map((item) => (
            <li
              key={item.id}
              className={`border-border bg-surface overflow-hidden rounded-xl border shadow-sm transition-opacity ${
                pending ? "opacity-60" : ""
              }`}
            >
              <div className="bg-surface-sunken relative aspect-square">
                <Image
                  src={item.url}
                  alt={item.originalName}
                  fill
                  sizes="(max-width: 640px) 50vw, 20vw"
                  className="object-cover"
                />

                <span className="bg-primary-950/70 absolute top-2 right-2 rounded-full px-2 py-0.5 text-[0.65rem] font-bold text-white">
                  {FOLDER_LABELS[item.folder] ?? item.folder}
                </span>
              </div>

              <div className="p-3">
                <p className="truncate text-xs font-bold" title={item.originalName}>
                  {item.originalName}
                </p>

                <p className="text-primary-500 mt-1 text-[0.7rem]">
                  {item.width && item.height ? `${item.width}×${item.height} · ` : ""}
                  {formatFileSize(item.size)}
                </p>

                <p className="text-primary-400 mt-0.5 text-[0.65rem]">
                  {formatDate(item.createdAt)}
                </p>

                <div className="mt-2.5 flex gap-1">
                  <button
                    type="button"
                    onClick={() => copy(item.url)}
                    className="border-border text-primary-600 hover:bg-surface-muted flex-1 rounded-md border px-2 py-1.5 text-[0.7rem] font-bold transition-colors"
                  >
                    {copied === item.url ? "تم النسخ" : "نسخ الرابط"}
                  </button>

                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`فتح ${item.originalName}`}
                    title="فتح الصورة"
                    className="border-border text-primary-500 hover:bg-surface-muted grid size-7 shrink-0 place-items-center rounded-md border transition-colors"
                  >
                    <Icon name="externalLink" className="size-3.5" />
                  </a>

                  <button
                    type="button"
                    onClick={() => remove(item)}
                    disabled={pending}
                    aria-label={`حذف ${item.originalName}`}
                    title="حذف"
                    className="border-border text-primary-500 hover:bg-danger-50 hover:text-danger-600 grid size-7 shrink-0 place-items-center rounded-md border transition-colors disabled:opacity-40"
                  >
                    <Icon name="trash" className="size-3.5" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deleteMediaAction } from "@/app/admin/(dashboard)/actions/media";
import { AdminIcon } from "@/components/admin/AdminIcon";
import { AdminEmpty } from "@/components/admin/AdminUi";
import { useConfirm, useToast } from "@/components/admin/Feedback";
import { cn, formatDate, formatFileSize } from "@/lib/utils";

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
  const toast = useToast();
  const confirm = useConfirm();
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [folder, setFolder] = useState<string>("all");

  const folders = Array.from(new Set(items.map((item) => item.folder)));
  const visible = folder === "all" ? items : items.filter((item) => item.folder === folder);

  async function upload(files: FileList | File[] | null) {
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      const body = new FormData();
      for (const file of Array.from(files)) body.append("files", file);
      body.append("folder", "uploads");

      const response = await fetch("/api/admin/upload", { method: "POST", body });
      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.ok) {
        toast.error("تعذّر رفع الصور", result.message);
        return;
      }

      toast.success(`رُفعت ${Array.from(files).length} صورة`);
      router.refresh();
    } catch {
      toast.error("تعذّر الاتصال بالخادم أثناء الرفع");
    } finally {
      setUploading(false);
    }
  }

  async function remove(item: MediaItem) {
    const ok = await confirm({
      title: `حذف «${item.originalName}»؟`,
      description: "إن كانت الصورة مستخدمة في منتج أو عمل فستختفي من هناك أيضًا.",
      confirmLabel: "احذف",
      tone: "danger",
    });
    if (!ok) return;

    startTransition(async () => {
      const result = await deleteMediaAction(item.id);
      if (!result.ok) {
        toast.error("تعذّر الحذف", result.error);
        return;
      }
      toast.success("حُذفت الصورة");
      router.refresh();
    });
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${url}`);
      toast.success("تم نسخ رابط الصورة");
    } catch {
      toast.error("تعذّر نسخ الرابط", "انسخه يدويًا من خصائص الصورة.");
    }
  }

  return (
    <div className="space-y-5">
      <label
        htmlFor="media-upload"
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
          "bg-surface focus-within:outline-accent-600 block cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-colors focus-within:outline-2 focus-within:outline-offset-2",
          dragging ? "border-accent-600 bg-accent-50" : "border-border-strong hover:border-primary-400",
        )}
      >
        <AdminIcon name="upload" className="text-primary-400 mx-auto size-8" strokeWidth={1.4} />
        <span className="text-primary-800 mt-2 block font-bold">
          {uploading ? "جارٍ الرفع…" : "اسحب الصور هنا أو اضغط لاختيارها"}
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

      {folders.length > 1 ? (
        <div className="flex flex-wrap gap-2" role="group" aria-label="تصفية حسب المجلد">
          {["all", ...folders].map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={folder === key}
              onClick={() => setFolder(key)}
              className={cn(
                "min-h-9 rounded-full px-3.5 text-xs font-bold transition-colors",
                folder === key
                  ? "bg-primary-950 text-white"
                  : "border-border bg-surface text-primary-700 hover:bg-surface-sunken border",
              )}
            >
              {key === "all" ? "الكل" : (FOLDER_LABELS[key] ?? key)}
            </button>
          ))}
        </div>
      ) : null}

      {items.length === 0 ? (
        <AdminEmpty
          icon="image"
          title="المكتبة فارغة"
          description="الصور التي ترفعها من شاشات المنتجات والأعمال والخدمات تظهر هنا تلقائيًا."
        />
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {visible.map((item) => (
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
                    onClick={() => void copy(item.url)}
                    className="border-border text-primary-600 hover:bg-surface-muted flex-1 rounded-md border px-2 py-1.5 text-[0.7rem] font-bold transition-colors"
                  >
                    نسخ الرابط
                  </button>

                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`فتح ${item.originalName}`}
                    title="فتح الصورة"
                    className="border-border text-primary-500 hover:bg-surface-muted grid size-7 shrink-0 place-items-center rounded-md border transition-colors"
                  >
                    <AdminIcon name="externalLink" className="size-3.5" />
                  </a>

                  <button
                    type="button"
                    onClick={() => void remove(item)}
                    disabled={pending}
                    aria-label={`حذف ${item.originalName}`}
                    title="حذف"
                    className="border-border text-primary-500 hover:bg-danger-50 hover:text-danger-600 grid size-7 shrink-0 place-items-center rounded-md border transition-colors disabled:opacity-40"
                  >
                    <AdminIcon name="trash" className="size-3.5" />
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

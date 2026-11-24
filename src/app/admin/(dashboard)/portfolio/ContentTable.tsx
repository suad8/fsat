"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  deleteProjectAction,
  deleteServiceAction,
  toggleContentFieldAction,
} from "@/app/admin/(dashboard)/actions/content";
import { AdminIcon } from "@/components/admin/AdminIcon";
import { AdminTable, Td, Th } from "@/components/admin/AdminUi";
import { useConfirm, useToast } from "@/components/admin/Feedback";
import { formatDate } from "@/lib/utils";

export type ContentRow = {
  id: string;
  title: string;
  slug: string;
  meta: string;
  imageUrl: string | null;
  isActive: boolean;
  isFeatured: boolean;
  extra?: string | null;
  updatedAt: Date;
};

/**
 * جدول مشترك للمشاريع والخدمات — بنيتهما الإدارية متطابقة
 * (عنوان، صورة، تصنيف، نشر، تمييز).
 */
export function ContentTable({
  model,
  rows,
  basePath,
  publicPath,
  metaLabel,
  featuredLabel,
}: {
  model: "project" | "service";
  rows: ContentRow[];
  basePath: string;
  publicPath: string;
  metaLabel: string;
  featuredLabel: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");

  const needle = query.trim().toLowerCase();
  const visible = needle
    ? rows.filter((row) => `${row.title} ${row.slug} ${row.meta}`.toLowerCase().includes(needle))
    : rows;

  async function remove(row: ContentRow) {
    const ok = await confirm({
      title: `حذف «${row.title}»؟`,
      description: "لا يمكن التراجع عن هذا الإجراء.",
      confirmLabel: "احذف",
      tone: "danger",
    });
    if (!ok) return;

    startTransition(async () => {
      const result =
        model === "project" ? await deleteProjectAction(row.id) : await deleteServiceAction(row.id);

      if (!result.ok) {
        toast.error("تعذّر الحذف", result.error);
        return;
      }

      toast.success(`حُذف «${row.title}»`);
      router.refresh();
    });
  }

  function toggle(id: string, field: "isActive" | "isFeatured", next: boolean) {
    startTransition(async () => {
      const result = await toggleContentFieldAction(model, id, field, next);
      if (!result.ok) {
        toast.error("تعذّر التحديث", result.error);
        return;
      }
      toast.success(next ? "تم التفعيل" : "تم الإيقاف");
      router.refresh();
    });
  }

  return (
    <>
      {rows.length > 6 ? (
        <div className="border-border border-b p-3">
          <label htmlFor="content-filter" className="sr-only">
            بحث في القائمة
          </label>
          <div className="relative max-w-sm">
            <AdminIcon
              name="search"
              className="text-primary-400 pointer-events-none absolute inset-y-0 start-3 my-auto size-4"
            />
            <input
              id="content-filter"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ابحث بالعنوان أو التصنيف…"
              autoComplete="off"
              className="border-border-strong bg-surface text-primary-900 placeholder:text-primary-400 min-h-10 w-full rounded-lg border ps-9 pe-3 text-sm"
              style={{ direction: "rtl", textAlign: "start" }}
            />
          </div>
        </div>
      ) : null}

      {visible.length === 0 ? (
        <p className="text-primary-500 px-5 py-10 text-center text-sm">لا نتائج مطابقة للبحث.</p>
      ) : (
      <AdminTable
        caption="القائمة"
        head={
          <>
            <Th>العنوان</Th>
            <Th>{metaLabel}</Th>
            <Th>منشور</Th>
            <Th>{featuredLabel}</Th>
            <Th>آخر تحديث</Th>
            <Th className="text-end">إجراءات</Th>
          </>
        }
      >
        {visible.map((row) => (
          <tr
            key={row.id}
            className={`hover:bg-surface-muted transition-colors ${pending ? "opacity-60" : ""}`}
          >
            <Td>
              <span className="flex items-center gap-3">
                <span className="border-border bg-surface-sunken relative size-11 shrink-0 overflow-hidden rounded-md border">
                  {row.imageUrl ? (
                    <Image
                      src={row.imageUrl}
                      alt=""
                      fill
                      sizes="44px"
                      className="object-cover"
                    />
                  ) : (
                    <span className="text-primary-300 grid h-full place-items-center">
                      <AdminIcon name="image" className="size-5" strokeWidth={1.4} />
                    </span>
                  )}
                </span>

                <span className="min-w-0">
                  <Link
                    href={`${basePath}/${row.id}`}
                    className="hover:text-accent-700 block truncate font-bold transition-colors"
                  >
                    {row.title}
                  </Link>
                  {row.extra ? (
                    <span className="text-primary-400 block truncate text-[0.7rem]">
                      {row.extra}
                    </span>
                  ) : null}
                </span>
              </span>
            </Td>

            <Td className="text-primary-600 text-sm whitespace-nowrap">{row.meta}</Td>

            <Td>
              <Toggle
                active={row.isActive}
                label="منشور"
                onToggle={(next) => toggle(row.id, "isActive", next)}
              />
            </Td>

            <Td>
              <Toggle
                active={row.isFeatured}
                label={featuredLabel}
                onToggle={(next) => toggle(row.id, "isFeatured", next)}
              />
            </Td>

            <Td className="text-primary-500 text-xs whitespace-nowrap">
              {formatDate(row.updatedAt)}
            </Td>

            <Td className="text-end">
              <div className="flex items-center justify-end gap-1">
                <Link
                  href={`${publicPath}/${row.slug}`}
                  target="_blank"
                  aria-label={`معاينة ${row.title}`}
                  title="معاينة"
                  className="text-primary-500 hover:bg-surface-sunken hover:text-primary-900 grid size-8 place-items-center rounded-md transition-colors"
                >
                  <AdminIcon name="externalLink" className="size-4" />
                </Link>

                <Link
                  href={`${basePath}/${row.id}`}
                  aria-label={`تعديل ${row.title}`}
                  title="تعديل"
                  className="text-primary-500 hover:bg-surface-sunken hover:text-primary-900 grid size-8 place-items-center rounded-md transition-colors"
                >
                  <AdminIcon name="edit" className="size-4" />
                </Link>

                <button
                  type="button"
                  onClick={() => void remove(row)}
                  disabled={pending}
                  aria-label={`حذف ${row.title}`}
                  title="حذف"
                  className="text-primary-500 hover:bg-danger-50 hover:text-danger-600 grid size-8 place-items-center rounded-md transition-colors disabled:opacity-40"
                >
                  <AdminIcon name="trash" className="size-4" />
                </button>
              </div>
            </Td>
          </tr>
        ))}
      </AdminTable>
      )}
    </>
  );
}

function Toggle({
  active,
  label,
  onToggle,
}: {
  active: boolean;
  label: string;
  onToggle: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      aria-label={`${label}: ${active ? "نعم" : "لا"}`}
      onClick={() => onToggle(!active)}
      className={`focus-visible:outline-accent-600 relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
        active ? "bg-success-600" : "bg-primary-300"
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-[right] ${
          active ? "right-0.5" : "right-5.5"
        }`}
      />
    </button>
  );
}

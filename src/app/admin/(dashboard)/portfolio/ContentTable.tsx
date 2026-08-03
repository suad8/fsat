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
import { AdminTable, Td, Th } from "@/components/admin/AdminUi";
import { Alert } from "@/components/ui/Alert";
import { Icon } from "@/components/ui/Icon";
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
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function remove(row: ContentRow) {
    if (!confirm(`هل تريد حذف «${row.title}»؟ لا يمكن التراجع عن هذا الإجراء.`)) return;

    startTransition(async () => {
      const result =
        model === "project"
          ? await deleteProjectAction(row.id)
          : await deleteServiceAction(row.id);

      if (!result.ok) {
        setError(result.error ?? "تعذّر الحذف.");
        return;
      }

      setError(null);
      router.refresh();
    });
  }

  function toggle(id: string, field: "isActive" | "isFeatured", next: boolean) {
    startTransition(async () => {
      const result = await toggleContentFieldAction(model, id, field, next);
      if (!result.ok) {
        setError(result.error ?? "تعذّر التحديث.");
        return;
      }
      setError(null);
      router.refresh();
    });
  }

  return (
    <>
      {error ? (
        <div className="p-4">
          <Alert tone="danger" live>
            {error}
          </Alert>
        </div>
      ) : null}

      <AdminTable
        caption="القائمة"
        head={
          <>
            <Th>العنوان</Th>
            <Th>{metaLabel}</Th>
            <Th>منشور</Th>
            <Th>{featuredLabel}</Th>
            <Th>آخر تحديث</Th>
            <Th className="text-left">إجراءات</Th>
          </>
        }
      >
        {rows.map((row) => (
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
                      <Icon name="image" className="size-5" strokeWidth={1.4} />
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

            <Td className="text-left">
              <div className="flex items-center justify-end gap-1">
                <Link
                  href={`${publicPath}/${row.slug}`}
                  target="_blank"
                  aria-label={`معاينة ${row.title}`}
                  title="معاينة"
                  className="text-primary-500 hover:bg-surface-sunken hover:text-primary-900 grid size-8 place-items-center rounded-md transition-colors"
                >
                  <Icon name="externalLink" className="size-4" />
                </Link>

                <Link
                  href={`${basePath}/${row.id}`}
                  aria-label={`تعديل ${row.title}`}
                  title="تعديل"
                  className="text-primary-500 hover:bg-surface-sunken hover:text-primary-900 grid size-8 place-items-center rounded-md transition-colors"
                >
                  <Icon name="edit" className="size-4" />
                </Link>

                <button
                  type="button"
                  onClick={() => remove(row)}
                  disabled={pending}
                  aria-label={`حذف ${row.title}`}
                  title="حذف"
                  className="text-primary-500 hover:bg-danger-50 hover:text-danger-600 grid size-8 place-items-center rounded-md transition-colors disabled:opacity-40"
                >
                  <Icon name="trash" className="size-4" />
                </button>
              </div>
            </Td>
          </tr>
        ))}
      </AdminTable>
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

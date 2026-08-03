"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  deleteResourceAction,
  toggleResourceFieldAction,
} from "@/app/admin/(dashboard)/actions/resource";
import { AdminEmpty, AdminTable, Td, Th } from "@/components/admin/AdminUi";
import { Alert } from "@/components/ui/Alert";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import type { ColumnDef } from "@/lib/admin/resources";
import { formatDateTime, formatPriceWithCurrency } from "@/lib/utils";

/**
 * جدول قائمة المورد.
 *
 * الحقول المنطقية قابلة للتبديل مباشرة من الجدول — نشر/إخفاء منتج أو اعتماد
 * تقييم لا يستحق فتح صفحة تحرير كاملة.
 */
export function ResourceTable({
  resourceSlug,
  singular,
  columns,
  rows,
  emptyTitle,
  emptyDescription,
  newHref,
}: {
  resourceSlug: string;
  singular: string;
  columns: ColumnDef[];
  rows: Record<string, unknown>[];
  emptyTitle: string;
  emptyDescription: string;
  newHref: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete(id: string, label: string) {
    if (!confirm(`هل تريد حذف «${label}»؟ لا يمكن التراجع عن هذا الإجراء.`)) return;

    startTransition(async () => {
      const result = await deleteResourceAction(resourceSlug, id);
      if (!result.ok) {
        setError(result.error ?? "تعذّر الحذف.");
        return;
      }
      setError(null);
      router.refresh();
    });
  }

  function handleToggle(id: string, field: string, next: boolean) {
    startTransition(async () => {
      const result = await toggleResourceFieldAction(resourceSlug, id, field, next);
      if (!result.ok) {
        setError(result.error ?? "تعذّر التحديث.");
        return;
      }
      setError(null);
      router.refresh();
    });
  }

  if (rows.length === 0) {
    return (
      <AdminEmpty
        title={emptyTitle}
        description={emptyDescription}
        action={
          <ButtonLink href={newHref} icon="plus">
            إضافة {singular}
          </ButtonLink>
        }
      />
    );
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
        caption={`قائمة ${singular}`}
        head={
          <>
            {columns.map((column) => (
              <Th key={column.name} className={column.className}>
                {column.label}
              </Th>
            ))}
            <Th className="text-left">إجراءات</Th>
          </>
        }
      >
        {rows.map((row) => {
          const id = String(row.id);
          const label = String(row.name ?? row.title ?? row.question ?? row.code ?? id);

          return (
            <tr
              key={id}
              className={`hover:bg-surface-muted transition-colors ${pending ? "opacity-60" : ""}`}
            >
              {columns.map((column) => (
                <Td key={column.name} className={column.className}>
                  <Cell
                    column={column}
                    value={row[column.name]}
                    onToggle={
                      column.render === "boolean"
                        ? (next) => handleToggle(id, column.name, next)
                        : undefined
                    }
                  />
                </Td>
              ))}

              <Td className="text-left">
                <div className="flex items-center justify-end gap-1">
                  <Link
                    href={`/admin/${resourceSlug}/${id}`}
                    aria-label={`تعديل ${label}`}
                    title="تعديل"
                    className="text-primary-500 hover:bg-surface-sunken hover:text-primary-900 grid size-8 place-items-center rounded-md transition-colors"
                  >
                    <Icon name="edit" className="size-4" />
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleDelete(id, label)}
                    disabled={pending}
                    aria-label={`حذف ${label}`}
                    title="حذف"
                    className="text-primary-500 hover:bg-danger-50 hover:text-danger-600 grid size-8 place-items-center rounded-md transition-colors disabled:opacity-40"
                  >
                    <Icon name="trash" className="size-4" />
                  </button>
                </div>
              </Td>
            </tr>
          );
        })}
      </AdminTable>
    </>
  );
}

function Cell({
  column,
  value,
  onToggle,
}: {
  column: ColumnDef;
  value: unknown;
  onToggle?: (next: boolean) => void;
}) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-primary-300 text-xs">—</span>;
  }

  switch (column.render) {
    case "boolean": {
      const active = Boolean(value);
      return (
        <button
          type="button"
          onClick={() => onToggle?.(!active)}
          role="switch"
          aria-checked={active}
          aria-label={`${column.label}: ${active ? "مفعّل" : "غير مفعّل"}`}
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

    case "price":
      return (
        <span className="tabular-nums">{formatPriceWithCurrency(Number(value))}</span>
      );

    case "number":
      return <span className="tabular-nums">{String(value)}</span>;

    case "date":
      return (
        <span className="text-primary-500 text-xs whitespace-nowrap">
          {formatDateTime(value as Date)}
        </span>
      );

    case "badge":
      return (
        <span className="bg-primary-100 text-primary-700 rounded-full px-2.5 py-1 text-xs font-bold">
          {String(value)}
        </span>
      );

    case "image":
      return (
        <span className="border-border bg-surface-sunken relative block size-10 overflow-hidden rounded-md border">
          <Image src={String(value)} alt="" fill sizes="40px" className="object-cover" />
        </span>
      );

    default:
      return (
        <span className="line-clamp-2 max-w-xs text-sm">{String(value)}</span>
      );
  }
}

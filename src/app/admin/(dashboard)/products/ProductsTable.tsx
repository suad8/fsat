"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  deleteProductAction,
  toggleProductFieldAction,
} from "@/app/admin/(dashboard)/actions/product";
import { AdminTable, Td, Th } from "@/components/admin/AdminUi";
import { Alert } from "@/components/ui/Alert";
import { Icon } from "@/components/ui/Icon";
import { PRICE_MODE_LABELS, type PriceMode } from "@/lib/constants";
import { formatPriceWithCurrency } from "@/lib/utils";

export type ProductRow = {
  id: string;
  name: string;
  slug: string;
  categoryName: string;
  categorySlug: string;
  priceMode: string;
  basePrice: number;
  unit: string;
  isActive: boolean;
  isFeatured: boolean;
  imageUrl: string | null;
  optionCount: number;
  tierCount: number;
};

export function ProductsTable({ products }: { products: ProductRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ tone: "danger" | "warning"; text: string } | null>(
    null,
  );

  function handleDelete(product: ProductRow) {
    if (!confirm(`هل تريد حذف «${product.name}»؟ لا يمكن التراجع عن هذا الإجراء.`)) return;

    startTransition(async () => {
      const result = await deleteProductAction(product.id);
      if (!result.ok) {
        // المنتج المرتبط بطلبات يُخفى بدل حذفه — رسالة تنبيه لا خطأ
        setNotice({ tone: "warning", text: result.error ?? "تعذّر الحذف." });
        router.refresh();
        return;
      }
      setNotice(null);
      router.refresh();
    });
  }

  function handleToggle(id: string, field: "isActive" | "isFeatured", next: boolean) {
    startTransition(async () => {
      const result = await toggleProductFieldAction(id, field, next);
      if (!result.ok) {
        setNotice({ tone: "danger", text: result.error ?? "تعذّر التحديث." });
        return;
      }
      setNotice(null);
      router.refresh();
    });
  }

  return (
    <>
      {notice ? (
        <div className="p-4">
          <Alert tone={notice.tone} live>
            {notice.text}
          </Alert>
        </div>
      ) : null}

      <AdminTable
        caption="قائمة المنتجات"
        head={
          <>
            <Th>المنتج</Th>
            <Th>القسم</Th>
            <Th>التسعير</Th>
            <Th>الخيارات</Th>
            <Th>منشور</Th>
            <Th>مميّز</Th>
            <Th className="text-left">إجراءات</Th>
          </>
        }
      >
        {products.map((product) => (
          <tr
            key={product.id}
            className={`hover:bg-surface-muted transition-colors ${pending ? "opacity-60" : ""}`}
          >
            <Td>
              <span className="flex items-center gap-3">
                <span className="border-border bg-surface-sunken relative size-11 shrink-0 overflow-hidden rounded-md border">
                  {product.imageUrl ? (
                    <Image
                      src={product.imageUrl}
                      alt=""
                      fill
                      sizes="44px"
                      className="object-cover"
                    />
                  ) : (
                    <span className="text-primary-300 grid h-full place-items-center">
                      <Icon name="package" className="size-5" strokeWidth={1.4} />
                    </span>
                  )}
                </span>

                <span className="min-w-0">
                  <Link
                    href={`/admin/products/${product.id}`}
                    className="hover:text-accent-700 block truncate font-bold transition-colors"
                  >
                    {product.name}
                  </Link>
                  <span className="text-primary-400 block truncate font-mono text-[0.7rem]" dir="ltr">
                    {product.slug}
                  </span>
                </span>
              </span>
            </Td>

            <Td className="text-primary-600 text-sm whitespace-nowrap">
              {product.categoryName}
            </Td>

            <Td>
              <span className="block text-sm font-bold tabular-nums">
                {product.priceMode === "QUOTE_ONLY"
                  ? "بعرض سعر"
                  : formatPriceWithCurrency(product.basePrice)}
              </span>
              <span className="text-primary-400 block text-[0.7rem]">
                {PRICE_MODE_LABELS[product.priceMode as PriceMode] ?? product.priceMode}
                {product.priceMode !== "QUOTE_ONLY" ? ` / ${product.unit}` : ""}
              </span>
            </Td>

            <Td className="text-primary-500 text-xs whitespace-nowrap">
              {product.optionCount} مجموعة
              {product.tierCount > 0 ? ` · ${product.tierCount} شريحة` : ""}
            </Td>

            <Td>
              <Toggle
                active={product.isActive}
                label="منشور"
                onToggle={(next) => handleToggle(product.id, "isActive", next)}
              />
            </Td>

            <Td>
              <Toggle
                active={product.isFeatured}
                label="مميّز"
                onToggle={(next) => handleToggle(product.id, "isFeatured", next)}
              />
            </Td>

            <Td className="text-left">
              <div className="flex items-center justify-end gap-1">
                <Link
                  href={`/shop/${product.categorySlug}/${product.slug}`}
                  target="_blank"
                  aria-label={`معاينة ${product.name} في الموقع`}
                  title="معاينة"
                  className="text-primary-500 hover:bg-surface-sunken hover:text-primary-900 grid size-8 place-items-center rounded-md transition-colors"
                >
                  <Icon name="externalLink" className="size-4" />
                </Link>

                <Link
                  href={`/admin/products/${product.id}`}
                  aria-label={`تعديل ${product.name}`}
                  title="تعديل"
                  className="text-primary-500 hover:bg-surface-sunken hover:text-primary-900 grid size-8 place-items-center rounded-md transition-colors"
                >
                  <Icon name="edit" className="size-4" />
                </Link>

                <button
                  type="button"
                  onClick={() => handleDelete(product)}
                  disabled={pending}
                  aria-label={`حذف ${product.name}`}
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

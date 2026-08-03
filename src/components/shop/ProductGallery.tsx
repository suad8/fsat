"use client";

import { useState } from "react";

import { SmartImage } from "@/components/ui/SmartImage";
import { resolveIcon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

export type GalleryImage = {
  id: string;
  url: string;
  alt: string;
};

/**
 * معرض صور المنتج.
 *
 * الصورة الرئيسية تُحمَّل بأولوية (priority) لأنها غالبًا أكبر عنصر مرئي في
 * الصفحة، وهي ما يقيسه Largest Contentful Paint. المصغّرات كسولة التحميل.
 */
export function ProductGallery({
  images,
  productName,
  categoryIcon,
}: {
  images: GalleryImage[];
  productName: string;
  categoryIcon: string | null;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = images[activeIndex];

  return (
    <div className="space-y-3">
      <SmartImage
        src={active?.url}
        alt={active?.alt ?? productName}
        ratio="4/3"
        icon={resolveIcon(categoryIcon)}
        placeholderLabel={productName}
        priority
        className="border-border rounded-xl border"
        sizes="(max-width: 1024px) 100vw, 50vw"
      />

      {images.length > 1 ? (
        <ul className="grid grid-cols-5 gap-2.5" role="tablist" aria-label="صور المنتج">
          {images.map((image, index) => (
            <li key={image.id}>
              <button
                type="button"
                role="tab"
                aria-selected={index === activeIndex}
                aria-label={`عرض الصورة ${index + 1}: ${image.alt}`}
                onClick={() => setActiveIndex(index)}
                className={cn(
                  "focus-visible:outline-accent-600 block w-full overflow-hidden rounded-lg border-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
                  index === activeIndex
                    ? "border-accent-600"
                    : "border-border hover:border-primary-400",
                )}
              >
                <SmartImage
                  src={image.url}
                  alt=""
                  ratio="square"
                  icon={resolveIcon(categoryIcon)}
                  sizes="10vw"
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

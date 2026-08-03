"use client";

import { usePathname } from "next/navigation";

import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";
import { whatsappGeneralUrl } from "@/lib/whatsapp";

/**
 * زر واتساب عائم ثابت في كل الصفحات.
 *
 * على الجوال يبقى دائرة مضغوطة: التوسّع التلقائي كان يغطّي محتوى الصفحة
 * (فلاتر الأقسام في المتجر مثلاً) وهو ثمن غير مبرَّر لزينة بصرية.
 * على الشاشات الكبيرة يتوسّع عند مرور المؤشر أو التركيز بلوحة المفاتيح،
 * حيث توجد مساحة فارغة تكفي.
 *
 * يختفي في صفحات تفاصيل المنتج على الجوال، لأن الشريط السفلي الثابت هناك
 * يحمل زر واتساب برسالة معبّأة بمواصفات المنتج — وزرّان متجاوران أحدهما
 * أقل فائدة يشوّشان الاختيار.
 */
export function WhatsAppFab() {
  const pathname = usePathname();

  // /shop/[category]/[product] — ثلاثة أجزاء بعد الجذر
  const isProductPage =
    pathname.startsWith("/shop/") && pathname.split("/").filter(Boolean).length === 3;

  return (
    <a
      href={whatsappGeneralUrl(pathname)}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group fixed bottom-5 end-5 z-40 inline-flex items-center gap-2.5 rounded-full",
        "bg-[#25D366] py-3.5 ps-3.5 pe-3.5 text-white shadow-[0_6px_24px_rgb(37_211_102/0.4)]",
        "hover:bg-[#1EBE5A] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#1EBE5A]",
        "transition-[background-color,padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
        "active:scale-95",
        // التوسّع على الشاشات الكبيرة فقط
        "md:hover:pe-5 md:focus-visible:pe-5",
        isProductPage && "hidden md:inline-flex",
      )}
      aria-label="تواصل معنا عبر واتساب"
    >
      <Icon name="whatsapp" className="size-6 shrink-0" />

      <span
        className={cn(
          "hidden overflow-hidden text-sm font-bold whitespace-nowrap md:block",
          "max-w-0 opacity-0 transition-[max-width,opacity] duration-300",
          "group-hover:max-w-40 group-hover:opacity-100",
          "group-focus-visible:max-w-40 group-focus-visible:opacity-100",
        )}
      >
        تواصل معنا
      </span>
    </a>
  );
}

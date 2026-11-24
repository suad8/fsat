"use client";

import { useState, useTransition } from "react";

import { buildDefaultCartItem } from "@/app/actions/cart";
import { useCart } from "@/components/cart/CartProvider";
import { Button } from "@/components/ui/Button";

/**
 * إضافة سريعة للسلة بالمواصفات الافتراضية للمنتج.
 *
 * السعر والخيارات تُحسب على الخادم، فلا تصل بيانات التسعير إلى المتصفّح مع
 * كل بطاقة. بعد الإضافة يتحوّل الزر لحالة تأكيد قصيرة تؤكد للعميل أن الضغطة
 * نجحت دون نقله بعيدًا عن الصفحة.
 */
export function QuickAddButton({
  productId,
  productName,
  className,
}: {
  productId: string;
  productName: string;
  className?: string;
}) {
  const { addItem } = useCart();
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<"idle" | "added" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  function handleClick() {
    startTransition(async () => {
      const result = await buildDefaultCartItem(productId);

      if (!result.ok) {
        setState("error");
        setMessage(result.error);
        return;
      }

      addItem(result.item);
      setState("added");
      setMessage(null);
      setTimeout(() => setState("idle"), 2200);
    });
  }

  return (
    <div className={className}>
      <Button
        onClick={handleClick}
        disabled={pending}
        variant={state === "added" ? "accent" : "primary"}
        size="sm"
        icon={state === "added" ? "check" : "cart"}
        fullWidth
        className="min-h-11"
        aria-label={`أضف ${productName} إلى السلة`}
      >
        {pending ? "جارٍ الإضافة…" : state === "added" ? "تمت الإضافة" : "أضف للسلة"}
      </Button>

      {/* role="status" ينطق الرسالة لقارئ الشاشة دون مقاطعة ما يقرأه */}
      <span role="status" className="sr-only">
        {state === "added" ? `تمت إضافة ${productName} إلى السلة` : ""}
      </span>

      {message ? (
        <p className="text-danger-600 mt-1.5 text-xs font-bold">{message}</p>
      ) : null}
    </div>
  );
}

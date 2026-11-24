"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { CartItem } from "@/components/cart/CartProvider";
import type { CartQuote } from "@/lib/shop/quote";

/**
 * يجلب من الخادم أسعارًا محقَّقة + شحنًا + ضريبة + كوبونًا للسلة الحالية.
 *
 * - يؤخّر الطلب ٣٠٠ms أثناء الكتابة ويلغي الطلب السابق، فلا تتزاحم الردود.
 * - `loading` مشتقّ (المفتاح المطلوب ≠ مفتاح آخر نتيجة) فلا حاجة لضبط حالة
 *   داخل الـ effect.
 * - عند الفشل تبقى الأرقام المحلية للعرض، ويعيد الخادم الحساب النهائي عند الإرسال.
 */

export type QuoteOptions = {
  fulfillment: "PICKUP" | "DELIVERY";
  city?: string;
  couponCode?: string;
};

type Settled = { key: string; quote: CartQuote | null; error: string | null };

export function useCartQuote(
  items: CartItem[],
  options: QuoteOptions,
  enabled = true,
  /** يُستدعى عند وصول نتيجة صالحة، مع البنود التي حُسبت لها (نفس ترتيب lines). */
  onSettled?: (quote: CartQuote, items: CartItem[]) => void,
) {
  const itemsRef = useRef(items);
  const settledRef = useRef(onSettled);
  useEffect(() => {
    itemsRef.current = items;
    settledRef.current = onSettled;
  });

  const payload = useMemo(
    () => ({
      items: items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        selection: item.selection ?? {},
      })),
      fulfillment: options.fulfillment,
      city: options.city || undefined,
      couponCode: options.couponCode || undefined,
    }),
    [items, options.fulfillment, options.city, options.couponCode],
  );

  const key = useMemo(() => JSON.stringify(payload), [payload]);
  const active = enabled && items.length > 0;

  const [settled, setSettled] = useState<Settled | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!active) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch("/api/checkout/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: key,
          signal: controller.signal,
        });
        const data = (await response.json()) as CartQuote | { ok: false; message?: string };

        if (!response.ok || !data.ok) {
          setSettled({
            key,
            quote: null,
            error: "message" in data && data.message ? data.message : "تعذّر تحديث الأسعار.",
          });
          return;
        }
        setSettled({ key, quote: data as CartQuote, error: null });
        settledRef.current?.(data as CartQuote, itemsRef.current);
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        setSettled({ key, quote: null, error: "تعذّر الاتصال لتحديث الأسعار." });
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [active, key, retry]);

  const current = settled && settled.key === key ? settled : null;

  return {
    quote: current?.quote ?? null,
    /** آخر نتيجة صالحة حتى لو كانت لسلة سابقة — تمنع وميض الأرقام أثناء التحديث. */
    lastQuote: settled?.quote ?? null,
    error: current?.error ?? null,
    loading: active && current === null,
    retry: () => setRetry((value) => value + 1),
  };
}

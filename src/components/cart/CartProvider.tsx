"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { round2 } from "@/lib/utils";

/**
 * ============================================================================
 *  حالة السلة
 * ============================================================================
 *  تُحفظ في localStorage لتبقى بعد إغلاق المتصفّح دون الحاجة لتسجيل دخول —
 *  وهو المتوقّع في متجر يطلب منه العميل مرة كل عدة أشهر.
 *
 *  التخزين هنا "نظام خارجي" بالنسبة لـ React، لذا نقرأه عبر
 *  useSyncExternalStore بدل useEffect + useState. هذا يعطينا ثلاثة أمور
 *  مجانًا: لا وميض بين ما يرسمه الخادم وما يقرأه المتصفّح، ومزامنة تلقائية
 *  بين تبويبات المتصفّح المفتوحة، وقراءة واحدة متسقة داخل كل رسمة.
 *
 *  ⚠️ الأسعار المحفوظة هنا للعرض فقط. عند إتمام الطلب يعيد الخادم حساب كل
 *     بند من قاعدة البيانات (انظر src/lib/orders.ts)، فلا أثر لأي تلاعب
 *     بمحتوى localStorage على المبلغ المحصَّل.
 * ============================================================================
 */

export type CartItemOption = {
  key: string;
  label: string;
  value: string;
  valueLabel: string;
};

export type CartItem = {
  /** معرّف السطر — يجمع المنتج مع خياراته، فتغيّر الخيارات يعني سطرًا جديدًا. */
  lineId: string;
  productId: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  unit: string;
  quantity: number;
  unitPrice: number;
  flatFees: number;
  total: number;
  options: CartItemOption[];
  notes?: string;
  /**
   * معرّفات القيم المختارة (مفتاح المجموعة ← معرّف القيمة). هذا ما يُرسل للخادم
   * عند الطلب؛ `options` للعرض فقط. بنود قديمة بلا هذا الحقل تُطلب مراجعتها.
   */
  selection?: Record<string, string | string[]>;
  /** الحد الأدنى وخطوة الكمية — لتعمل أزرار +/− في السلة بمضاعفات صحيحة. */
  minQuantity?: number;
  quantityStep?: number;
  /** رابط صفحة المنتج — لتعديل المواصفات من السلة. بنود قديمة قد تخلو منه. */
  href?: string;
  /** ملفات التصميم المرفوعة مع البند (للعرض والنقل مع الطلب). */
  files?: CartItemFile[];
};

export type CartItemFile = {
  name: string;
  url: string;
  size: number;
  mimeType: string;
};

const STORAGE_KEY = "fsat.cart.v1";

// ---------------------------------------------------------------------------
// مخزن خارجي فوق localStorage
// ---------------------------------------------------------------------------

const listeners = new Set<() => void>();

/** مرجع ثابت للسلة الفارغة — إعادة [] جديدة في كل قراءة تسبب حلقة رسم لا نهائية. */
const EMPTY: CartItem[] = [];

let cachedRaw: string | null = null;
let cachedItems: CartItem[] = EMPTY;

/** تصفية دفاعية: محتوى localStorage قابل للتعديل يدويًا. */
function parse(raw: string | null): CartItem[] {
  if (!raw) return EMPTY;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;

    const valid = parsed.filter(
      (item): item is CartItem =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as CartItem).lineId === "string" &&
        typeof (item as CartItem).productId === "string" &&
        typeof (item as CartItem).quantity === "number" &&
        (item as CartItem).quantity > 0,
    );

    return valid.length > 0 ? valid : EMPTY;
  } catch {
    return EMPTY;
  }
}

/**
 * يجب أن يعيد نفس المرجع ما لم يتغيّر المحتوى فعليًا،
 * وإلا اعتبر React أن الحالة تتغيّر في كل رسمة.
 */
function getSnapshot(): CartItem[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // التخزين معطّل (وضع التصفّح الخاص في بعض المتصفحات)
    return EMPTY;
  }

  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedItems = parse(raw);
  }

  return cachedItems;
}

/** الخادم لا يعرف محتوى التخزين — يرسم دائمًا بسلة فارغة. */
function getServerSnapshot(): CartItem[] {
  return EMPTY;
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  // حدث storage يصل من التبويبات الأخرى فقط، لذا نُخطر المستمعين يدويًا
  // بعد كل كتابة محلية عبر emit()
  window.addEventListener("storage", onChange);

  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function emit() {
  for (const listener of listeners) listener();
}

function write(items: CartItem[]) {
  const next = items.length > 0 ? items : EMPTY;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    cachedRaw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // التخزين ممتلئ أو معطّل — السلة تبقى تعمل داخل الجلسة الحالية
    cachedRaw = JSON.stringify(next);
  }

  cachedItems = next;
  emit();
}

/**
 * مخزن ثابت لا يتغيّر أبدًا: يعيد false على الخادم و true على المتصفّح.
 * React يعيد الرسم مرة واحدة بعد الترطيب، فنميّز "السلة فارغة" عن
 * "لم تُقرأ بعد" دون أي effect. لا حاجة للاشتراك لأن القيمة لا تتغيّر.
 */
function subscribeHydration(): () => void {
  return () => {};
}

// ---------------------------------------------------------------------------

type CartContextValue = {
  items: CartItem[];
  /** false حتى تُقرأ السلة من التخزين — يمنع وميض "السلة فارغة". */
  hydrated: boolean;
  itemCount: number;
  subtotal: number;
  addItem: (item: Omit<CartItem, "lineId">) => void;
  updateQuantity: (lineId: string, quantity: number) => void;
  removeItem: (lineId: string) => void;
  /** يحدّث أسعار البنود بما حقّقه الخادم (للعرض فقط — الخادم يعيد الحساب عند الطلب). */
  applyServerPrices: (
    updates: { lineId: string; quantity: number; unitPrice: number; total: number }[],
  ) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

/** معرّف مستقر للسطر: نفس المنتج بنفس الخيارات يعطي نفس المعرّف. */
function buildLineId(productId: string, options: CartItemOption[]): string {
  const signature = options
    .map((option) => `${option.key}:${option.value}`)
    .sort()
    .join("|");
  return `${productId}::${signature}`;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    () => true,
    () => false,
  );

  const addItem = useCallback((incoming: Omit<CartItem, "lineId">) => {
    const lineId = buildLineId(incoming.productId, incoming.options);
    const current = getSnapshot();
    const existing = current.find((item) => item.lineId === lineId);

    // نفس المنتج بنفس الخيارات: نزيد الكمية بدل إضافة سطر مكرر
    if (existing) {
      const quantity = existing.quantity + incoming.quantity;
      write(
        current.map((item) =>
          item.lineId === lineId
            ? {
                ...item,
                quantity,
                total: round2(item.unitPrice * quantity + item.flatFees),
              }
            : item,
        ),
      );
      return;
    }

    write([...current, { ...incoming, lineId }]);
  }, []);

  const updateQuantity = useCallback((lineId: string, quantity: number) => {
    const current = getSnapshot();

    if (quantity <= 0) {
      write(current.filter((item) => item.lineId !== lineId));
      return;
    }

    write(
      current.map((item) =>
        item.lineId === lineId
          ? { ...item, quantity, total: round2(item.unitPrice * quantity + item.flatFees) }
          : item,
      ),
    );
  }, []);

  const removeItem = useCallback((lineId: string) => {
    write(getSnapshot().filter((item) => item.lineId !== lineId));
  }, []);

  const applyServerPrices = useCallback<CartContextValue["applyServerPrices"]>((updates) => {
    const current = getSnapshot();
    let changed = false;

    const next = current.map((item) => {
      const update = updates.find((entry) => entry.lineId === item.lineId);
      if (!update) return item;
      if (
        update.unitPrice === item.unitPrice &&
        update.total === item.total &&
        update.quantity === item.quantity
      ) {
        return item;
      }
      changed = true;
      return {
        ...item,
        quantity: update.quantity,
        unitPrice: update.unitPrice,
        total: update.total,
        // الرسوم الثابتة = الإجمالي − (سعر الوحدة × الكمية)
        flatFees: Math.max(0, round2(update.total - update.unitPrice * update.quantity)),
      };
    });

    if (changed) write(next);
  }, []);

  const clear = useCallback(() => write(EMPTY), []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      hydrated,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: round2(items.reduce((sum, item) => sum + item.total, 0)),
      addItem,
      updateQuantity,
      removeItem,
      applyServerPrices,
      clear,
    }),
    [items, hydrated, addItem, updateQuantity, removeItem, applyServerPrices, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart يجب أن يُستخدم داخل CartProvider");
  }
  return context;
}

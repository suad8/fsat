import type { FulfillmentMethod, PaymentMethod } from "@/lib/constants";
import type { PaymentSettings } from "@/lib/settings";

/**
 * ============================================================================
 *  طبقة تجريد الدفع — الملف الوحيد الذي يُعدَّل لربط بوابة دفع
 * ============================================================================
 *  كل ما يراه العميل في خطوة «طريقة الدفع» يأتي من هنا، فلا يُعاد تصميم
 *  الواجهة عند إضافة بوابة. المسار لتفعيل البطاقة/مدى:
 *
 *    ١. اكتب محوّل بوابتك (يطبّق PaymentGateway) في هذا الملف، وسجّله في
 *       GATEWAYS تحت المعرّف "card" و/أو "mada".
 *    ٢. فعّل «الدفع الإلكتروني» من لوحة التحكم ← بيانات المنشأة.
 *
 *  عندها يتحوّل الخيار تلقائيًا من «قريبًا» إلى متاح، ويستدعي مسار
 *  /api/checkout الدالة initiatePayment بعد إنشاء الطلب ليعيد رابط الدفع
 *  فيحوّل المتصفّح العميل إليه. أسرار البوابة تُقرأ من متغيّرات البيئة داخل
 *  المحوّل فقط — لا تُكتب في الكود ولا تُرسل للمتصفّح.
 *
 *  ⚠️ هذا الملف يُستورد على الخادم فقط (صفحة الدفع ومسار الطلب). المتصفّح
 *     يستلم الخيارات جاهزة (PaymentOption) ولا يستورد المحوّلات إطلاقًا.
 *  لا توجد هنا أي بوابة فعلية ولا مفاتيح — هذا هيكل جاهز للربط فقط.
 * ============================================================================
 */

export type PaymentProviderId = "bank-transfer" | "cod" | "pay-on-pickup" | "card" | "mada";

export type PaymentIconKey = "bank" | "cash" | "store" | "card";

/** ما يصل للمتصفّح: بيانات عرض فقط. */
export type PaymentOption = {
  id: PaymentProviderId;
  /** القيمة المحفوظة في الطلب (حقل paymentMethod). */
  method: PaymentMethod;
  label: string;
  description: string;
  icon: PaymentIconKey;
  /** available = قابل للاختيار | coming-soon = ظاهر ومعطّل بشارة «قريبًا». */
  status: "available" | "coming-soon";
  /** يظهر لأي طريقة استلام. */
  fulfillments: FulfillmentMethod[];
  /** تعليمات تُعرض في صفحة النجاح بعد الطلب. */
  afterOrder: { title: string; steps: string[] };
};

/** بيانات الطلب التي يحتاجها محوّل البوابة لبدء الدفع. */
export type PaymentOrderContext = {
  orderNumber: string;
  total: number;
  currency: string;
  customerName: string;
  customerPhone: string;
  /** عنوان العودة بعد الدفع (مطلق). */
  returnUrl: string;
};

export type PaymentInitiation =
  | { type: "none" }
  | { type: "redirect"; url: string };

/** واجهة محوّل البوابة. */
export interface PaymentGateway {
  initiate(order: PaymentOrderContext): Promise<PaymentInitiation>;
}

/**
 * سجلّ المحوّلات — فارغ عمدًا. أضف محوّل البوابة هنا عند الربط:
 *   GATEWAYS.card = myGateway;
 */
const GATEWAYS: Partial<Record<PaymentProviderId, PaymentGateway>> = {};

type ProviderDefinition = Omit<PaymentOption, "status"> & {
  /** هل فعّلتها الإدارة؟ (للطرق غير الإلكترونية). */
  enabled: (settings: PaymentSettings) => boolean;
  /** طريقة إلكترونية تحتاج محوّلًا مسجّلًا لتصير متاحة. */
  needsGateway?: boolean;
};

const PROVIDERS: ProviderDefinition[] = [
  {
    id: "bank-transfer",
    method: "BANK_TRANSFER",
    label: "تحويل بنكي",
    description: "بعد تأكيد الطلب نرسل لك بيانات الحساب، وتبدأ المعالجة عند وصول الإيصال.",
    icon: "bank",
    fulfillments: ["DELIVERY", "PICKUP"],
    afterOrder: {
      title: "إتمام الدفع بالتحويل",
      steps: [
        "حوّل إجمالي الطلب إلى حسابنا البنكي.",
        "أرسل صورة الإيصال على واتساب مع رقم طلبك.",
        "نؤكد الاستلام ونبدأ المعالجة فور وصول الإيصال.",
      ],
    },
    enabled: (settings) => settings.bankTransfer,
  },
  {
    id: "cod",
    method: "COD",
    label: "الدفع عند الاستلام",
    description: "تدفع نقدًا أو بالشبكة للمندوب عند وصول الطلب.",
    icon: "cash",
    fulfillments: ["DELIVERY"],
    afterOrder: {
      title: "الدفع عند الاستلام",
      steps: [
        "لا تدفع شيئًا الآن.",
        "جهّز المبلغ عند وصول الطلب.",
      ],
    },
    enabled: (settings) => settings.cod,
  },
  {
    id: "pay-on-pickup",
    method: "ON_PICKUP",
    label: "الدفع عند الاستلام من الفرع",
    description: "تدفع عند استلام طلبك من مقرّنا.",
    icon: "store",
    fulfillments: ["PICKUP"],
    afterOrder: {
      title: "الدفع عند الاستلام من الفرع",
      steps: [
        "لا تدفع شيئًا الآن.",
        "ندعوك للاستلام عند جاهزية الطلب، وتدفع في الفرع.",
      ],
    },
    enabled: (settings) => settings.onPickup,
  },
  {
    id: "card",
    method: "ONLINE",
    label: "بطاقة ائتمانية",
    description: "فيزا وماستركارد عبر بوابة دفع آمنة.",
    icon: "card",
    fulfillments: ["DELIVERY", "PICKUP"],
    afterOrder: {
      title: "الدفع بالبطاقة",
      steps: ["تُحوَّل إلى صفحة الدفع الآمنة لإتمام العملية."],
    },
    enabled: (settings) => settings.online,
    needsGateway: true,
  },
  {
    id: "mada",
    method: "ONLINE",
    label: "مدى",
    description: "الدفع ببطاقة مدى البنكية.",
    icon: "card",
    fulfillments: ["DELIVERY", "PICKUP"],
    afterOrder: {
      title: "الدفع عبر مدى",
      steps: ["تُحوَّل إلى صفحة الدفع الآمنة لإتمام العملية."],
    },
    enabled: (settings) => settings.online,
    needsGateway: true,
  },
];

/**
 * الخيارات الظاهرة للعميل.
 *
 * الطرق غير الإلكترونية تظهر فقط إن فعّلتها الإدارة. الإلكترونية (بطاقة/مدى)
 * تظهر دائمًا: متاحة إن وُجد محوّل وفُعّل الدفع الإلكتروني، وإلا «قريبًا».
 */
export function listPaymentOptions(settings: PaymentSettings): PaymentOption[] {
  const options: PaymentOption[] = [];

  for (const provider of PROVIDERS) {
    const { enabled, needsGateway, ...option } = provider;

    if (needsGateway) {
      const ready = Boolean(GATEWAYS[provider.id]) && enabled(settings);
      options.push({ ...option, status: ready ? "available" : "coming-soon" });
      continue;
    }

    if (enabled(settings)) options.push({ ...option, status: "available" });
  }

  return options;
}

/** هل هذه الطريقة قابلة للاختيار فعلاً لطريقة الاستلام المحددة؟ */
export function isPaymentAllowed(
  settings: PaymentSettings,
  method: PaymentMethod,
  fulfillment: FulfillmentMethod,
): boolean {
  return listPaymentOptions(settings).some(
    (option) =>
      option.method === method &&
      option.status === "available" &&
      option.fulfillments.includes(fulfillment),
  );
}

/** معلومات طريقة دفع محفوظة في الطلب — لصفحة النجاح. */
export function describePaymentMethod(method: PaymentMethod): PaymentOption["afterOrder"] & {
  label: string;
} {
  const provider =
    PROVIDERS.find((candidate) => candidate.method === method && !candidate.needsGateway) ??
    PROVIDERS.find((candidate) => candidate.method === method) ??
    PROVIDERS[0];
  return { label: provider.label, ...provider.afterOrder };
}

/**
 * بدء الدفع بعد إنشاء الطلب. الطرق غير الإلكترونية تعيد none.
 * المعرّف الأول المسجَّل لمحوّل ضمن طريقة ONLINE هو الذي يُستخدم.
 */
export async function initiatePayment(
  method: PaymentMethod,
  order: PaymentOrderContext,
): Promise<PaymentInitiation> {
  if (method !== "ONLINE") return { type: "none" };

  const gateway = GATEWAYS.card ?? GATEWAYS.mada;
  if (!gateway) return { type: "none" };

  try {
    return await gateway.initiate(order);
  } catch (error) {
    // فشل البوابة لا يُسقط الطلب المحفوظ — يبقى بانتظار الدفع ويتابعه الفريق
    console.error("[payments] تعذّر بدء الدفع:", error);
    return { type: "none" };
  }
}

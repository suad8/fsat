import { NextResponse } from "next/server";

import { clientKey, rateLimit } from "@/lib/rate-limit";
import { BodyTooLargeError, readFormLimited, readJsonLimited } from "@/lib/security/body";
import { clientIp } from "@/lib/security/ip";
import { logSecurityEvent } from "@/lib/security/log";
import { verifySameOrigin } from "@/lib/security/origin";

/**
 * حارس موحّد لمسارات API العامة التي تكتب (POST).
 *
 * الترتيب مقصود — الأرخص أولًا والأخطر قبل القراءة:
 *   فحص الأصل → حدّ المعدّل → نوع المحتوى → قراءة الجسم بسقف → تحليل.
 * فلا يُحمَّل أي جسم في الذاكرة قبل اجتياز الفحوص الرخيصة.
 *
 * كل الأخطاء هنا برسائل ثابتة عامة — لا تسريب لمسارات أو رسائل استثناءات.
 */

export function apiError(
  status: number,
  message: string,
  extra: Record<string, unknown> = {},
  headers?: Record<string, string>,
) {
  return NextResponse.json({ ok: false, message, ...extra }, { status, headers });
}

/** استجابة خطأ داخلي عامة؛ التفاصيل تذهب للسجلّ فقط. */
export function internalError(tag: string, error: unknown, message: string) {
  console.error(`[${tag}]`, error instanceof Error ? error.message : "unknown error");
  return apiError(500, message);
}

export type GuardOptions = {
  /** اسم النطاق في مفتاح المعدّل (contact/quote/...). */
  scope: string;
  limit: number;
  windowMs: number;
  /** السقف الأقصى لحجم الجسم بالبايت. */
  maxBytes: number;
  /** تكلفة الطلب في المعدّل (الافتراضي ١). */
  cost?: number;
  rateLimitMessage: string;
};

type Gate = { ok: false; response: NextResponse } | { ok: true };

function precheck(request: Request, options: GuardOptions): Gate {
  const ip = clientIp(request.headers);

  const origin = verifySameOrigin(request.headers);
  if (!origin.ok) {
    logSecurityEvent("origin_rejected", { scope: options.scope, reason: origin.reason, ip });
    return { ok: false, response: apiError(403, "طلب مرفوض.") };
  }

  const limit = rateLimit(
    clientKey(request, options.scope),
    { limit: options.limit, windowMs: options.windowMs },
    options.cost ?? 1,
  );
  if (!limit.allowed) {
    logSecurityEvent("rate_limited", { scope: options.scope, ip, retryAfter: limit.retryAfter });
    return {
      ok: false,
      response: apiError(429, options.rateLimitMessage, {}, {
        "Retry-After": String(limit.retryAfter),
      }),
    };
  }

  return { ok: true };
}

export async function guardJsonPost(
  request: Request,
  options: GuardOptions,
): Promise<{ ok: true; payload: unknown } | { ok: false; response: NextResponse }> {
  const gate = precheck(request, options);
  if (!gate.ok) return gate;

  // نوع JSON فقط: يمنع إرسال النماذج عبر المواقع (text/plain, form-urlencoded)
  const contentType = request.headers.get("content-type") ?? "";
  if (!/^application\/json(\s*;|$)/i.test(contentType)) {
    return { ok: false, response: apiError(415, "صيغة الطلب غير مدعومة.") };
  }

  try {
    const payload = await readJsonLimited(request, options.maxBytes);
    if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
      logSecurityEvent("invalid_request", {
        scope: options.scope,
        ip: clientIp(request.headers),
      });
      return { ok: false, response: apiError(400, "صيغة الطلب غير صحيحة.") };
    }
    return { ok: true, payload };
  } catch (error) {
    if (error instanceof BodyTooLargeError) {
      logSecurityEvent("payload_too_large", {
        scope: options.scope,
        ip: clientIp(request.headers),
      });
      return { ok: false, response: apiError(413, "حجم الطلب أكبر من المسموح.") };
    }
    return { ok: false, response: apiError(400, "صيغة الطلب غير صحيحة.") };
  }
}

export async function guardMultipartPost(
  request: Request,
  options: GuardOptions,
): Promise<{ ok: true; form: FormData } | { ok: false; response: NextResponse }> {
  const gate = precheck(request, options);
  if (!gate.ok) return gate;

  try {
    const form = await readFormLimited(request, options.maxBytes);
    if (!form) {
      return { ok: false, response: apiError(400, "تعذّرت قراءة الملفات المرسلة.") };
    }
    return { ok: true, form };
  } catch (error) {
    if (error instanceof BodyTooLargeError) {
      logSecurityEvent("payload_too_large", {
        scope: options.scope,
        ip: clientIp(request.headers),
      });
      return { ok: false, response: apiError(413, "حجم الملفات أكبر من المسموح.") };
    }
    return { ok: false, response: apiError(400, "تعذّرت قراءة الملفات المرسلة.") };
  }
}

/**
 * الحقل الفخّ (honeypot): يتركه البشر فارغًا. يُفحص على الجسم الخام قبل Zod
 * حتى لا يرى الروبوت رسالة خطأ تدلّه على أنه كُشف — نردّ له بنجاح ظاهري.
 */
export function honeypotTripped(payload: unknown, request: Request, scope: string): boolean {
  if (typeof payload !== "object" || payload === null) return false;

  const value = (payload as Record<string, unknown>).website;
  const tripped = typeof value === "string" ? value.trim().length > 0 : value != null && value !== "";

  if (tripped) {
    logSecurityEvent("honeypot_triggered", { scope, ip: clientIp(request.headers) });
  }
  return tripped;
}

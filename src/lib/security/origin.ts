/**
 * حماية CSRF بفحص الأصل (Origin) للطلبات التي تغيّر الحالة.
 *
 * الكوكي SameSite=Lax يحمي معظم الحالات، وهذا الفحص طبقة ثانية لا تعتمد على
 * سلوك المتصفّح: كل طلب POST/PUT/PATCH/DELETE يجب أن يثبت أنه جاء من صفحاتنا.
 *
 * ترتيب الحكم:
 *   ١. Origin موجود → يجب أن يطابق مضيفنا (أو ALLOWED_ORIGIN / مضيف الموقع المعلن).
 *   ٢. لا Origin لكن Sec-Fetch-Site موجود → يجب أن يكون same-origin (أو none).
 *   ٣. لا شيء منهما لكن Referer موجود → يطابق مضيفنا.
 *   ٤. لا شيء → يُرفض (متصفّح حديث يرسل Origin دائمًا مع POST؛ العملاء الآليون
 *      ليسوا مستخدمي هذا الموقع).
 */

export const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function normalizeHost(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");
}

/** المضيفات الإضافية المسموح بها (نفس صيغة ALLOWED_ORIGIN في next.config.ts). */
function extraAllowedHosts(): string[] {
  const hosts = (process.env.ALLOWED_ORIGIN ?? "")
    .split(",")
    .map(normalizeHost)
    .filter(Boolean);

  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (site) {
    try {
      hosts.push(new URL(site).host.toLowerCase());
    } catch {
      // قيمة غير صالحة — تُتجاهل
    }
  }

  return hosts;
}

/** المضيف الذي وصل إليه الطلب: x-forwarded-host (من الوكيل) ثم Host. */
export function requestHost(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-host")?.split(",")[0];
  return normalizeHost(forwarded || headers.get("host") || "");
}

function hostOf(value: string): string | null {
  try {
    return new URL(value).host.toLowerCase();
  } catch {
    return null;
  }
}

export type OriginVerdict = { ok: true } | { ok: false; reason: string };

export function verifySameOrigin(headers: Headers): OriginVerdict {
  const self = requestHost(headers);
  const allowed = new Set([self, ...extraAllowedHosts()].filter(Boolean));

  const origin = headers.get("origin");
  if (origin !== null) {
    if (origin === "null") return { ok: false, reason: "null_origin" };
    const host = hostOf(origin);
    if (host && allowed.has(host)) return { ok: true };
    return { ok: false, reason: "origin_mismatch" };
  }

  const fetchSite = headers.get("sec-fetch-site");
  if (fetchSite) {
    return fetchSite === "same-origin" || fetchSite === "none"
      ? { ok: true }
      : { ok: false, reason: "cross_site_fetch" };
  }

  const referer = headers.get("referer");
  if (referer) {
    const host = hostOf(referer);
    if (host && allowed.has(host)) return { ok: true };
    return { ok: false, reason: "referer_mismatch" };
  }

  return { ok: false, reason: "no_origin" };
}

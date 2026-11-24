/**
 * عنوان العميل خلف وكيل عكسي.
 *
 * ترويسة x-forwarded-for يضيف إليها كل وكيل موثوق عنوان من اتصل به في **نهايتها**،
 * أما ما قبله فيكتبه العميل نفسه ويمكن انتحاله. لذلك نأخذ العنصر الذي أضافه
 * آخر وكيل موثوق (من اليمين) لا أول عنصر من اليسار.
 *
 * TRUSTED_PROXY_HOPS = عدد الوكلاء الموثوقين أمام التطبيق (الافتراضي 1، كما في
 * Railway/Render/Nginx واحد). اضبطه على 0 إن كان التطبيق مكشوفًا مباشرة
 * (فتُتجاهل الترويسة وتُعدّ كل الطلبات من مصدر واحد — أسلم من الانتحال).
 */

const IP_PATTERN = /^[0-9a-fA-F:.]{3,45}$/;

function hops(): number {
  const raw = Number.parseInt(process.env.TRUSTED_PROXY_HOPS ?? "1", 10);
  return Number.isFinite(raw) && raw >= 0 && raw <= 5 ? raw : 1;
}

export function clientIp(headers: Headers): string {
  const trusted = hops();
  if (trusted === 0) return "unknown";

  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    const candidate = parts[parts.length - trusted];
    if (candidate && IP_PATTERN.test(candidate)) return candidate;
  }

  const real = headers.get("x-real-ip")?.trim();
  if (real && IP_PATTERN.test(real)) return real;

  return "unknown";
}

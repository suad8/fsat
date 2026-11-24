import { NextResponse, type NextRequest } from "next/server";

import { adminCsp, API_CSP } from "@/lib/security/csp";
import { clientIp } from "@/lib/security/ip";
import { logSecurityEvent } from "@/lib/security/log";
import { UNSAFE_METHODS, verifySameOrigin } from "@/lib/security/origin";
import { verifySessionToken } from "@/lib/security/session";
import {
  RENEW_AFTER_SECONDS,
  SESSION_COOKIE,
  sessionCookieOptions,
  signSessionToken,
} from "@/lib/security/session-token";

/**
 * ============================================================================
 *  Proxy (كان middleware قبل Next 16) — خط الدفاع الأول
 * ============================================================================
 *  يعمل على Node.js (الافتراضي في Next 16) فيستطيع التحقق العميق من الجلسة
 *  مقابل القاعدة، لا التوقيع فقط. الحماية هنا طبقة أولى؛ كل إجراء خادم وكل
 *  مسار API يعيد التحقق بنفسه (requireAdmin) ولا يعتمد على هذا الملف.
 *
 *  ١. CSRF: كل طلب يغيّر الحالة (POST/PUT/PATCH/DELETE) يجب أن يثبت أصله.
 *  ٢. الطرق: مسارات /api لا تقبل غير GET/HEAD/POST/OPTIONS.
 *  ٣. /admin: جلسة صالحة (توقيع + حساب فعّال + بصمة كلمة المرور) وإلا
 *     توجيه لصفحة الدخول (صفحات) أو 401 (API/إجراءات).
 *  ٤. تجديد منزلق للجلسة بعد ٢٠ دقيقة ضمن سقف مطلق ١٢ ساعة.
 *  ٥. CSP بـ nonce لكل طلب على /admin + منع التخزين المؤقت لها.
 * ============================================================================
 */

const API_ALLOWED_METHODS = new Set(["GET", "HEAD", "POST", "OPTIONS"]);

function json(status: number, message: string, headers?: Record<string, string>) {
  return NextResponse.json(
    { ok: false, message },
    { status, headers: { "Cache-Control": "no-store", ...headers } },
  );
}

function expireSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(0), expires: new Date(0) });
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method.toUpperCase();

  const isApi = pathname === "/api" || pathname.startsWith("/api/");
  const isAdminApi = pathname.startsWith("/api/admin/");
  // صفحات اللوحة ومسارات API الإدارية كلاهما يتطلب جلسة
  const isAdminArea = pathname === "/admin" || pathname.startsWith("/admin/") || isAdminApi;

  // ---- ٢. الطرق المسموحة لمسارات API -----------------------------------
  if (isApi && !API_ALLOWED_METHODS.has(method)) {
    logSecurityEvent("method_rejected", { method, path: pathname, ip: clientIp(request.headers) });
    return json(405, "طريقة غير مسموحة.", { Allow: "GET, HEAD, POST, OPTIONS" });
  }

  // ---- ١. فحص الأصل (CSRF) ---------------------------------------------
  if (UNSAFE_METHODS.has(method)) {
    const verdict = verifySameOrigin(request.headers);
    if (!verdict.ok) {
      logSecurityEvent("origin_rejected", {
        method,
        path: pathname,
        reason: verdict.reason,
        origin: request.headers.get("origin") ?? undefined,
        ip: clientIp(request.headers),
      });
      return json(403, "طلب مرفوض.");
    }
  }

  // ---- الموقع العام: لا شيء آخر هنا ------------------------------------
  if (!isAdminArea) {
    if (!isApi) return NextResponse.next();

    const response = NextResponse.next();
    response.headers.set("Content-Security-Policy", API_CSP);
    return response;
  }

  // ---- ٣. لوحة الإدارة --------------------------------------------------
  const isLoginPage = pathname === "/admin/login";
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  let verified = null;
  if (token) {
    try {
      verified = await verifySessionToken(token);
    } catch (error) {
      // القاعدة غير متاحة مثلًا — لا نمنح وصولًا عند الشك
      console.error("[proxy] تعذّر التحقق من الجلسة:", error);
      return json(503, "الخدمة غير متاحة مؤقتًا.");
    }
    if (!verified) {
      logSecurityEvent("session_rejected", { path: pathname, ip: clientIp(request.headers) });
    }
  }

  // صفحة الدخول (وإجراء الدخول المرسَل إليها) متاحة بلا جلسة؛ كل ما عداها لا
  if (!verified && !isLoginPage) {
    // طلب غير تنقّل (إجراء خادم/fetch/API): 401 بدل توجيه يُربك العميل
    if (isAdminApi || (method !== "GET" && method !== "HEAD")) {
      const response = json(401, "غير مصرّح. أعد تسجيل الدخول.");
      if (token) expireSessionCookie(response);
      return response;
    }

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/admin/login";
    loginUrl.search = "";
    // نحفظ الوجهة للعودة إليها — تُنقّى عند الاستهلاك في loginAction
    if (pathname !== "/admin") {
      loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    }
    const redirect = NextResponse.redirect(loginUrl);
    if (token) expireSessionCookie(redirect);
    redirect.headers.set("Cache-Control", "no-store");
    return redirect;
  }

  // من لديه جلسة صالحة لا يحتاج صفحة الدخول
  if (verified && isLoginPage && method === "GET") {
    const redirect = NextResponse.redirect(new URL("/admin", request.url));
    redirect.headers.set("Cache-Control", "no-store");
    return redirect;
  }

  // ---- ٥. CSP بـ nonce للصفحات ------------------------------------------
  const responseInit: { request?: { headers: Headers } } = {};
  let csp: string | null = null;

  if (!isAdminApi) {
    const nonce = btoa(crypto.randomUUID());
    csp = adminCsp(nonce);

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-nonce", nonce);
    // Next.js يقرأ الـ nonce من ترويسة CSP في الطلب ويطبّقه على سكربتاته
    requestHeaders.set("Content-Security-Policy", csp);
    responseInit.request = { headers: requestHeaders };
  }

  const response = NextResponse.next(responseInit);
  response.headers.set("Cache-Control", "no-store");
  if (csp) response.headers.set("Content-Security-Policy", csp);
  else response.headers.set("Content-Security-Policy", API_CSP);

  // ---- ٤. تجديد الجلسة ---------------------------------------------------
  if (verified) {
    const age = Math.floor(Date.now() / 1000) - verified.claims.iat;
    if (age > RENEW_AFTER_SECONDS) {
      try {
        const { token: renewed, maxAge } = await signSessionToken({
          userId: verified.user.id,
          securityStamp: verified.claims.sv,
          originalIssuedAt: verified.claims.iat0,
        });
        if (maxAge > 0) response.cookies.set(SESSION_COOKIE, renewed, sessionCookieOptions(maxAge));
      } catch (error) {
        console.error("[proxy] تعذّر تجديد الجلسة:", error);
      }
    }
  }

  return response;
}

export const config = {
  /*
   * كل شيء عدا الأصول الثابتة (لا تحتاج فحصًا وتُغني عن كلفة التنفيذ).
   *
   * مساران يُستثنيان عمدًا: مساري الرفع. الـ proxy يخزّن جسم كل طلب في الذاكرة
   * ويقتطعه بصمت عند proxyClientMaxBodySize (١٠ ميجابايت افتراضيًا) فيُفسد ملفات
   * التصميم الأكبر منه. المساران يطبّقان بأنفسهم فحص الأصل (guardMultipartPost)
   * والجلسة العميقة (requireAdmin) وسقف الحجم أثناء القراءة، فلا يُفقد أي حماية.
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|brand/|uploads/|api/upload$|api/admin/upload$).*)",
  ],
};

import { jwtVerify } from "jose";
import { NextResponse, type NextRequest } from "next/server";

/**
 * حماية مسارات لوحة التحكم.
 *
 * التحقق هنا سطحي عمدًا — يتأكد من وجود توكن موقّع صالح فقط، لأن الـ
 * middleware يعمل على حافة الشبكة ولا يصل لقاعدة البيانات. التحقق العميق
 * (هل الحساب ما زال فعّالاً؟) يتم داخل الصفحات عبر requireAdmin.
 *
 * الفائدة هنا: إعادة توجيه سريعة لصفحة الدخول دون تحميل الصفحة كاملة.
 */

const COOKIE_NAME = "fsat_admin_session";

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    return new TextEncoder().encode("dev-only-insecure-secret-change-me-please");
  }
  return new TextEncoder().encode(secret);
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const token = request.cookies.get(COOKIE_NAME)?.value;
  let valid = false;

  if (token) {
    try {
      await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
      valid = true;
    } catch {
      valid = false;
    }
  }

  // صفحة الدخول: من لديه جلسة صالحة يُحوَّل للوحة مباشرة
  if (pathname === "/admin/login") {
    if (valid) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.next();
  }

  if (!valid) {
    const loginUrl = new URL("/admin/login", request.url);
    // نحفظ الوجهة الأصلية للعودة إليها بعد الدخول
    if (pathname !== "/admin") {
      loginUrl.searchParams.set("next", `${pathname}${search}`);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};

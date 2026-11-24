import type { NextConfig } from "next";

import { publicCsp } from "./src/lib/security/csp";

/**
 * النطاقات المسموح لها بإرسال Server Actions.
 *
 * يحمي Next.js إجراءات الخادم من تزوير الطلبات عبر المواقع (CSRF) بمطابقة
 * ترويسة `origin` مع `x-forwarded-host`. خلف وكيل عكسي يعيد كتابة الترويسات
 * — مثل معاينة GitHub Codespaces — لا تتطابقان فتُرفض كل الإجراءات.
 *
 * ⚠️ القيمة المطلوبة هنا هي ما يصل في ترويسة `origin` لا النطاق العام.
 *    وكيل Codespaces يعيد كتابة origin إلى `localhost:3000` بينما يضع النطاق
 *    العام في x-forwarded-host — لذا `localhost:3000` هو ما يجب السماح به.
 *
 * ⚠️ هذا للمعاينة فقط. عند النشر على نطاقك الحقيقي احذف ALLOWED_ORIGIN من
 *    متغيّرات البيئة تمامًا ليعود فحص CSRF الكامل — إبقاء localhost مسموحًا
 *    في الإنتاج يضعف الحماية بلا داعٍ.
 */
const allowedOrigins = (process.env.ALLOWED_ORIGIN ?? "")
  .split(",")
  .map((origin) => origin.trim().replace(/^https?:\/\//, "").replace(/\/$/, ""))
  .filter(Boolean);

const nextConfig: NextConfig = {
  experimental: {
    ...(allowedOrigins.length > 0
      ? { serverActions: { allowedOrigins } }
      : {}),
  },

  images: {
    // الصور المرفوعة تُحوَّل إلى WebP عند الرفع؛ هذه صيغ العرض المتاحة
    formats: ["image/avif", "image/webp"],
    // مقاسات تطابق نقاط التوقف المستخدمة في الموقع، فلا تُولَّد أحجام لا تُستعمل
    deviceSizes: [400, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [40, 64, 80, 96, 120, 180, 256, 384],
  },

  // لا نعلن عن التقنية المستعملة (يسهّل استهداف ثغرات إصدار محدّد)
  poweredByHeader: false,

  /*
   * الترويسات الأمنية.
   *
   * لوحة الإدارة (/admin) ومسارات /api لا تأخذ CSP من هنا: لوحة الإدارة تحصل على
   * CSP بـ nonce لكل طلب من src/proxy.ts، والـ API من الـ proxy أيضًا. استثناؤهما
   * من القاعدة العامة يمنع ترويستين متعارضتين (يطبّق المتصفّح تقاطعهما).
   *
   * السياسات نفسها في src/lib/security/csp.ts مع شرح سبب اختلافها.
   */
  async headers() {
    const isProd = process.env.NODE_ENV === "production";

    return [
      {
        source: "/:path*",
        headers: [
          // يمنع المتصفّح من تخمين نوع المحتوى خلافًا لما نصرّح به
          { key: "X-Content-Type-Options", value: "nosniff" },
          // منع التضمين في إطار (clickjacking) — يوازي frame-ancestors في CSP للمتصفّحات القديمة
          { key: "X-Frame-Options", value: "DENY" },
          // لا يُرسل المسار الكامل للمواقع الخارجية عند الخروج من الموقع
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // لا نستخدم أيًّا من هذه الواجهات، فنغلقها صراحةً
          {
            key: "Permissions-Policy",
            value: [
              "camera=()",
              "microphone=()",
              "geolocation=()",
              "payment=()",
              "usb=()",
              "serial=()",
              "midi=()",
              "accelerometer=()",
              "gyroscope=()",
              "magnetometer=()",
              "interest-cohort=()",
              "browsing-topics=()",
            ].join(", "),
          },
          // يعزل نافذة الموقع عن النوافذ المفتوحة منه/إليه (يغلق قنوات Spectre/tabnabbing)
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
          // HSTS يُرسل في الإنتاج فقط؛ المتصفّح يتجاهله على http ويلتزم به عبر https
          ...(isProd
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=63072000; includeSubDomains",
                },
              ]
            : []),
        ],
      },
      {
        // الموقع العام (يُستثنى admin وapi وuploads — لكلٍّ سياسته)
        source: "/((?!admin(?:/|$)|api(?:/|$)|uploads(?:/|$)).*)",
        headers: [{ key: "Content-Security-Policy", value: publicCsp() }],
      },
      {
        // الصور المرفوعة: لا تُعرض كمستند أبدًا حتى لو تلاعب أحد بنوعها
        source: "/uploads/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "default-src 'none'; sandbox" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;

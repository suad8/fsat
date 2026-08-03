import type { NextConfig } from "next";

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

  // ترويسات أمان أساسية تُطبَّق على كل الاستجابات
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // يمنع المتصفّح من تخمين نوع المحتوى خلافًا لما نصرّح به
          { key: "X-Content-Type-Options", value: "nosniff" },
          // يمنع تضمين الموقع داخل إطار في موقع آخر (clickjacking)
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // لا يُرسل المسار الكامل للمواقع الخارجية عند الخروج من الموقع
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // لا نستخدم أيًّا من هذه الواجهات، فنغلقها صراحةً
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

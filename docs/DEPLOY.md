# النشر على Railway

1. New Project ← Deploy from GitHub repo ← `suad8/fsat` (الفرع المطلوب).
2. أضف **Volume** للخدمة وركّبه على `/data` (يحفظ قاعدة SQLite والملفات المرفوعة).
3. المتغيّرات المطلوبة:
   - `AUTH_SECRET` — نص عشوائي ≥ 32 حرفًا (التطبيق يتوقف عمدًا بدونه)
   - `ADMIN_EMAIL` و`ADMIN_PASSWORD` — حساب الإدارة الأول (يُنشأ عند أول تشغيل فقط)
   - `NEXT_PUBLIC_SITE_URL` — رابط الموقع (يُقرأ وقت البناء، فاضبطه قبل أول نشر)
4. الإعدادات في `railway.json`؛ التشغيل عبر `scripts/railway-start.sh` (هجرات ثم بذر أول مرة ثم تشغيل).

ملاحظة: نسخة واحدة فقط من الخدمة (SQLite لا يدعم عدة نسخ). للتوسّع انتقل إلى PostgreSQL
(`@prisma/adapter-pg` وتغيير `provider`، انظر تعليق `src/lib/prisma.ts`).

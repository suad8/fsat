"use client";

import { AdminIcon } from "@/components/admin/AdminIcon";

/** خطأ داخل شاشة من اللوحة — يبقى الشريط الجانبي سليمًا ويُعرض زر إعادة المحاولة. */
export default function AdminError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="border-border bg-surface mx-auto mt-10 max-w-md rounded-xl border p-8 text-center shadow-sm">
      <span className="bg-danger-50 text-danger-700 mx-auto mb-4 grid size-12 place-items-center rounded-full">
        <AdminIcon name="alert" className="size-6" />
      </span>
      <h1 className="text-lg font-bold">تعذّر تحميل هذه الشاشة</h1>
      <p className="text-primary-600 mt-2 text-sm leading-relaxed">
        حدث خطأ غير متوقع أثناء جلب البيانات. جرّب مرة أخرى، وإن تكرّر فتحقق من اتصال قاعدة البيانات.
      </p>
      <button
        type="button"
        onClick={reset}
        className="bg-primary-950 hover:bg-primary-900 mt-6 min-h-11 rounded-lg px-6 text-sm font-bold text-white transition-colors"
      >
        إعادة المحاولة
      </button>
    </div>
  );
}

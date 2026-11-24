/** هيكل تحميل خفيف بين شاشات اللوحة — يمنع القفزة البيضاء أثناء جلب البيانات. */
export default function AdminLoading() {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">جارٍ التحميل…</span>
      <div className="adm-skeleton mb-3 h-8 w-56" />
      <div className="adm-skeleton mb-8 h-4 w-80 max-w-full" />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="adm-skeleton h-28" />
        ))}
      </div>
      <div className="adm-skeleton h-72" />
    </div>
  );
}

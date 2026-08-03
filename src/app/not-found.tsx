import Link from "next/link";

import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { brand } from "@/config/brand";

export const metadata = {
  title: "الصفحة غير موجودة",
  robots: { index: false, follow: false },
};

/**
 * صفحة ٤٠٤.
 *
 * خارج مجموعة (site) عمدًا حتى تعمل حتى عند تعذّر قراءة التصنيفات من قاعدة
 * البيانات — فترويسة الموقع تعتمد عليها. لذلك تحمل تنقّلها الخاص.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-border border-b">
        <div className="container-page flex h-16 items-center md:h-20">
          <Link
            href="/"
            className="text-primary-950 font-display text-lg font-extrabold"
            aria-label={`${brand.name} — الصفحة الرئيسية`}
          >
            {brand.nameShort}
          </Link>
        </div>
      </header>

      <main className="container-page flex flex-1 items-center justify-center py-16">
        <div className="max-w-lg text-center">
          <span
            aria-hidden="true"
            className="bg-surface-sunken text-primary-400 mx-auto mb-6 grid size-16 place-items-center rounded-full"
          >
            <Icon name="search" className="size-8" strokeWidth={1.4} />
          </span>

          <p className="text-accent-700 mb-3 text-sm font-bold tracking-[0.18em]">٤٠٤</p>

          <h1 className="text-2xl md:text-3xl">هذه الصفحة غير موجودة</h1>

          <p className="text-primary-600 mt-4 leading-relaxed">
            ربما حُذف المنتج أو تغيّر رابط الصفحة. جرّب البحث في المتجر، أو تواصل معنا
            وسنساعدك في الوصول لما تبحث عنه.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/shop" size="lg">
              تصفّح المتجر
            </ButtonLink>
            <ButtonLink href="/" size="lg" variant="outline">
              الصفحة الرئيسية
            </ButtonLink>
            <ButtonLink href="/contact" size="lg" variant="ghost">
              اتصل بنا
            </ButtonLink>
          </div>
        </div>
      </main>
    </div>
  );
}

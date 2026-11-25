import { CartProvider } from "@/components/cart/CartProvider";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { CustomCursor } from "@/components/site/CustomCursor";
import { ScrollProgress } from "@/components/site/ScrollProgress";
import { WhatsAppFab } from "@/components/site/WhatsAppFab";
import { getCategories } from "@/lib/queries";

/**
 * صفحات الموقع تُقرأ من قاعدة بيانات التشغيل في كل طلب (لا نسخ مخبوزة وقت البناء).
 * السبب: معرّفات المنتجات والخيارات تُحفظ في سلة العميل، وإن بُنيت الصفحة من قاعدة
 * مختلفة عن قاعدة التشغيل (بناء/نشر جديد) صارت المعرّفات غير معروفة للخادم فيرفض
 * الطلب. SQLite محلية فالقراءة سريعة، والإدارة ترى تعديلاتها فورًا.
 */
export const dynamic = "force-dynamic";

/**
 * غلاف الواجهة العامة.
 *
 * لوحة التحكم خارج هذه المجموعة عمدًا، فلها ترويستها الخاصة ولا تحتاج
 * الفوتر ولا زر واتساب ولا مزوّد السلة.
 */
export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const categories = await getCategories();

  return (
    <CartProvider>
      <ScrollProgress />
      <CustomCursor />
      <Header
        categories={categories.map((category) => ({
          slug: category.slug,
          name: category.name,
        }))}
      />

      <main id="main" className="flex-1">
        {children}
      </main>

      <Footer />
      <WhatsAppFab />
    </CartProvider>
  );
}

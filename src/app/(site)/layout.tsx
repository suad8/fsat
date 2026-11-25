import { CartProvider } from "@/components/cart/CartProvider";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { CustomCursor } from "@/components/site/CustomCursor";
import { ScrollProgress } from "@/components/site/ScrollProgress";
import { WhatsAppFab } from "@/components/site/WhatsAppFab";
import { getCategories } from "@/lib/queries";

/**
 * الصفحات تُولَّد من قاعدة البيانات ثم تُجدَّد تلقائيًا كل دقيقة، فيظهر للعميل ما في
 * قاعدة التشغيل الفعلية بعد أي نشر جديد حتى لو لم تُعدَّل بيانات من لوحة الإدارة.
 */
export const revalidate = 60;

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

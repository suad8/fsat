import { CartProvider } from "@/components/cart/CartProvider";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { WhatsAppFab } from "@/components/site/WhatsAppFab";
import { getCategories } from "@/lib/queries";

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

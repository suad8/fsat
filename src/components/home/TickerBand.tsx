import { Marquee } from "@/components/ui/Marquee";

/**
 * شريط ذهبي مائل بنص ضخم يمرّ بلا توقف — فاصل جريء بين الـ Hero والمحتوى.
 * المائل يُقصّ بـ overflow-x-clip حتى لا ينتج تمرير أفقي في الصفحة.
 */
export function TickerBand({ items }: { items: string[] }) {
  if (items.length === 0) return null;

  return (
    <div className="relative z-10 -my-4 overflow-x-clip py-6 md:-my-6 md:py-10">
      <div className="bg-accent-500 text-accent-contrast -rotate-[1.6deg] scale-[1.04] py-4 shadow-[0_20px_60px_-20px_rgb(0_0_0/0.5)] md:py-6">
        <Marquee
          items={items}
          large
          speed={90}
          className="font-display text-3xl font-black md:text-6xl"
        />
      </div>
    </div>
  );
}

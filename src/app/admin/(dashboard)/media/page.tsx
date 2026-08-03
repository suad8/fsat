import { MediaLibrary } from "@/app/admin/(dashboard)/media/MediaLibrary";
import { AdminHeading } from "@/components/admin/AdminUi";
import { prisma } from "@/lib/prisma";
import { formatFileSize } from "@/lib/utils";

export const metadata = { title: "مكتبة الصور" };

export default async function AdminMediaPage() {
  const [items, aggregate] = await Promise.all([
    prisma.mediaAsset.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.mediaAsset.aggregate({ _sum: { size: true }, _count: { _all: true } }),
  ]);

  return (
    <>
      <AdminHeading
        title="مكتبة الصور"
        description={
          aggregate._count._all > 0
            ? `${aggregate._count._all} صورة · ${formatFileSize(aggregate._sum.size ?? 0)}`
            : "كل الصور المرفوعة من لوحة التحكم تُجمع هنا."
        }
      />

      <MediaLibrary items={items} />
    </>
  );
}

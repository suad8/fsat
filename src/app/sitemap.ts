import type { MetadataRoute } from "next";

import { siteUrl } from "@/config/brand";
import { prisma } from "@/lib/prisma";

/**
 * خريطة الموقع.
 *
 * تُبنى من قاعدة البيانات فتشمل كل منتج وقسم وخدمة ومشروع يُضاف من لوحة
 * التحكم تلقائيًا، دون أي تعديل في الكود.
 *
 * صفحات السلة وإتمام الطلب مستبعدة عمدًا — لا قيمة لها في نتائج البحث.
 */

const STATIC_ROUTES: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] =
  [
    { path: "/", priority: 1, changeFrequency: "weekly" },
    { path: "/shop", priority: 0.9, changeFrequency: "weekly" },
    { path: "/services", priority: 0.9, changeFrequency: "monthly" },
    { path: "/portfolio", priority: 0.8, changeFrequency: "weekly" },
    { path: "/about", priority: 0.6, changeFrequency: "yearly" },
    { path: "/equipment", priority: 0.6, changeFrequency: "yearly" },
    { path: "/faq", priority: 0.6, changeFrequency: "monthly" },
    { path: "/contact", priority: 0.7, changeFrequency: "yearly" },
    { path: "/quote", priority: 0.8, changeFrequency: "yearly" },
    { path: "/policies/privacy", priority: 0.3, changeFrequency: "yearly" },
    { path: "/policies/terms", priority: 0.3, changeFrequency: "yearly" },
    { path: "/policies/returns", priority: 0.3, changeFrequency: "yearly" },
    { path: "/policies/shipping", priority: 0.3, changeFrequency: "yearly" },
  ];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const entries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${siteUrl}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  try {
    const [categories, products, services, projects] = await Promise.all([
      prisma.category.findMany({
        where: { isActive: true },
        select: { slug: true, updatedAt: true },
      }),
      prisma.product.findMany({
        where: { isActive: true },
        select: { slug: true, updatedAt: true, category: { select: { slug: true } } },
      }),
      prisma.service.findMany({
        where: { isActive: true },
        select: { slug: true, updatedAt: true },
      }),
      prisma.project.findMany({
        where: { isActive: true },
        select: { slug: true, updatedAt: true },
      }),
    ]);

    for (const category of categories) {
      entries.push({
        url: `${siteUrl}/shop/${category.slug}`,
        lastModified: category.updatedAt,
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }

    for (const product of products) {
      entries.push({
        url: `${siteUrl}/shop/${product.category.slug}/${product.slug}`,
        lastModified: product.updatedAt,
        changeFrequency: "weekly",
        priority: 0.85,
      });
    }

    for (const service of services) {
      entries.push({
        url: `${siteUrl}/services/${service.slug}`,
        lastModified: service.updatedAt,
        changeFrequency: "monthly",
        priority: 0.75,
      });
    }

    for (const project of projects) {
      entries.push({
        url: `${siteUrl}/portfolio/${project.slug}`,
        lastModified: project.updatedAt,
        changeFrequency: "monthly",
        priority: 0.65,
      });
    }
  } catch (error) {
    // تعذّر الوصول لقاعدة البيانات: نُخرج الصفحات الثابتة بدل خريطة فارغة
    console.error("[sitemap] تعذّر جلب المحتوى الديناميكي:", error);
  }

  return entries;
}

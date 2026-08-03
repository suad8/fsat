import { cache } from "react";

import { prisma } from "@/lib/prisma";
import {
  DEFAULT_THEME,
  isThemeFont,
  parseHex,
  THEME_RADII,
  type Theme,
  type ThemeRadiusKey,
} from "@/lib/theme";

/**
 * قراءة الثيم المحفوظ.
 *
 * منفصل عن src/lib/theme.ts لأن ذلك الملف تستورده مكوّنات العميل (لمعاينة
 * الألوان في لوحة التحكم)، وهذا الملف يستورد Prisma.
 *
 * كل قيمة غير صالحة تسقط للافتراضي بصمت — لون تالف في القاعدة يجب ألا
 * يكسر الموقع.
 */
export const getTheme = cache(async (): Promise<Theme> => {
  try {
    const record = await prisma.siteSettings.findUnique({
      where: { id: "singleton" },
      select: {
        themePrimary: true,
        themeAccent: true,
        themeBrand: true,
        themeFont: true,
        themeRadius: true,
      },
    });

    if (!record) return DEFAULT_THEME;

    const valid = (value: string | null, fallback: string) =>
      value && parseHex(value) ? value : fallback;

    const radius = THEME_RADII.some((entry) => entry.key === record.themeRadius)
      ? (record.themeRadius as ThemeRadiusKey)
      : DEFAULT_THEME.radius;

    return {
      primary: valid(record.themePrimary, DEFAULT_THEME.primary),
      accent: valid(record.themeAccent, DEFAULT_THEME.accent),
      brand: valid(record.themeBrand, DEFAULT_THEME.brand),
      font: isThemeFont(record.themeFont) ? record.themeFont : DEFAULT_THEME.font,
      radius,
    };
  } catch {
    // قبل الترحيل أو عند تعذّر الاتصال — الموقع يظل يعمل بألوان الهوية
    return DEFAULT_THEME;
  }
});

/** أقسام الصفحة الرئيسية كما رتّبتها الإدارة. */
export const getHomeSections = cache(async () => {
  try {
    const rows = await prisma.homeSection.findMany({
      orderBy: [{ order: "asc" }],
    });
    return rows;
  } catch {
    return [];
  }
});

export type HomeSectionConfig = {
  key: string;
  isActive: boolean;
  order: number;
  title: string | null;
  description: string | null;
  eyebrow: string | null;
};

/**
 * يبني خريطة الأقسام مع قيمها الافتراضية.
 *
 * القسم غير الموجود في القاعدة يُعتبر ظاهرًا — إضافة قسم جديد في الكود
 * يجب أن تظهر مباشرة دون انتظار صف في القاعدة.
 */
export function sectionConfig(
  rows: HomeSectionConfig[],
  key: string,
): { active: boolean; order: number; title?: string; description?: string; eyebrow?: string } {
  const row = rows.find((entry) => entry.key === key);

  if (!row) return { active: true, order: 99 };

  return {
    active: row.isActive,
    order: row.order,
    title: row.title?.trim() || undefined,
    description: row.description?.trim() || undefined,
    eyebrow: row.eyebrow?.trim() || undefined,
  };
}
